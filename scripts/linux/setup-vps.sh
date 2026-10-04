#!/usr/bin/env bash
# One-shot installer for Ubuntu 24.04 (run as root on a fresh VPS).
#   sudo DOMAIN=interview.example.com EMAIL=you@example.com \
#        REPO_URL=https://github.com/<user>/<repo>.git bash setup-vps.sh
# Optional: SEED=1 (create demo data + admin account on an empty DB), PORT=3001, APP_USER=interviewapp
# Re-running is safe: it updates the code, rebuilds and restarts.
set -euo pipefail

: "${DOMAIN:?set DOMAIN}"; : "${EMAIL:?set EMAIL for Lets Encrypt}"; : "${REPO_URL:?set REPO_URL}"
PORT="${PORT:-3001}"; APP_USER="${APP_USER:-interviewapp}"
BASE=/opt/interviewapp; APP_DIR=$BASE/app; DATA_DIR=$BASE/data; BACKUP_DIR=$BASE/backups
[ "$(id -u)" -eq 0 ] || { echo "run as root"; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw build-essential python3

# Node 22 LTS (better-sqlite3 needs a toolchain only if no prebuilt binary matches; build-essential covers that)
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir "$BASE" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$DATA_DIR/resumes" "$BACKUP_DIR"

if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" pull --ff-only; else git clone "$REPO_URL" "$APP_DIR"; fi

# .env is created once; later runs never overwrite it
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  setenv() { sed -i "s|^$1=.*|$1=$2|" "$APP_DIR/.env"; }
  setenv DB_PATH "$DATA_DIR/app.db"
  setenv RESUME_UPLOAD_DIR "$DATA_DIR/resumes"
  setenv BACKUP_DIR "$BACKUP_DIR"
  setenv PORT "$PORT"
  setenv TRUST_PROXY 1
  echo "Created $APP_DIR/.env - fill in SMTP_* there if emails should really be sent."
fi
chown -R "$APP_USER:$APP_USER" "$BASE"
chmod 600 "$APP_DIR/.env"

sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npm ci && npm run build"
if [ "${SEED:-0}" = 1 ]; then sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npm run db:seed"; fi

cat > /etc/systemd/system/interviewapp.service <<UNIT
[Unit]
Description=Interview Management System
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node scripts/start-prod.mjs
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=$BASE

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/interviewapp-backup.service <<UNIT
[Unit]
Description=Interview app backup

[Service]
Type=oneshot
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm run db:backup
UNIT
cat > /etc/systemd/system/interviewapp-backup.timer <<UNIT
[Unit]
Description=Nightly interview app backup

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
UNIT

cat > /etc/nginx/sites-available/interviewapp <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 10m;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/interviewapp /etc/nginx/sites-enabled/interviewapp
nginx -t && systemctl reload nginx

systemctl daemon-reload
systemctl enable --now interviewapp.service interviewapp-backup.timer
systemctl restart interviewapp.service

# Firewall: SSH + web only (the app port stays closed)
ufw allow OpenSSH; ufw allow 'Nginx Full'; ufw --force enable

# HTTPS (DNS A record for $DOMAIN must already point at this server)
certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --non-interactive --redirect

echo
echo "Done: https://$DOMAIN"
echo "Logs: journalctl -u interviewapp -f"
echo "If you used SEED=1, log in as the seeded admin and change its password NOW (default admin123)."
