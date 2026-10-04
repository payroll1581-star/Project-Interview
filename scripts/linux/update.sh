#!/usr/bin/env bash
# Deploy the latest code on the VPS: sudo bash /opt/interviewapp/app/scripts/linux/update.sh
set -euo pipefail
APP_DIR=/opt/interviewapp/app; APP_USER="${APP_USER:-interviewapp}"
sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && git pull --ff-only && npm ci && npm run build"
systemctl restart interviewapp
systemctl --no-pager status interviewapp | head -5
