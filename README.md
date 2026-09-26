# Interview Management System

Candidate tracking, interview scheduling, evaluations, and a dashboard for a small HR team.
React 19 + TypeScript + Tailwind on the frontend; a small Express + SQLite (`better-sqlite3`) API in `server/`.
Architecture notes for contributors live in [CLAUDE.md](CLAUDE.md).

## Development

Requires Node 24.

```
npm ci
npm run db:seed     # demo data; creates admin@example.com / admin123 (dev only!)
npm run dev:all     # web on :5173, API on :3001
npm test            # backend tests (in-memory database, never touches your real data)
npm run lint && npm run build
```

Copy `.env.example` to `.env` to configure email, ports and storage. The test suite never sends real email.

## Running it for real on a Windows PC or server

The dev command is not for daily use. In production one process serves both the built pages and the API.
Users must reach it over **HTTPS through a reverse proxy** (see "Behind the company's HTTPS reverse proxy" below):
the app tells browsers to upgrade to HTTPS (`upgrade-insecure-requests` and `Strict-Transport-Security`), so opening it
over plain HTTP from another computer is not supported and may show a blank page or fail to log in.

**1. Deploy to a plain folder, not OneDrive.** OneDrive syncing a database that is being written can corrupt it,
and syncing `node_modules` is slow. For example:

```
git clone <repo url> C:\InterviewApp\app
cd C:\InterviewApp\app
npm ci
npm run build
```

**2. Configure `.env`** (copy `.env.example`). At minimum:

```
DB_PATH=C:\InterviewApp\data\app.db
RESUME_UPLOAD_DIR=C:\InterviewApp\data\resumes
BACKUP_DIR=D:\Backups\InterviewApp
PORT=3001
TRUST_PROXY=1
```

Also fill in the `SMTP_*` settings if the system should really send email; otherwise emails are only printed to the server log.

**3. Bring your data over** (skip on a brand-new install): stop the old server, copy the old `app.db` to `DB_PATH`
and the old resume folder to `RESUME_UPLOAD_DIR`. It is just two file copies; the database upgrades itself on start-up.
A fresh database has no accounts; `npm run db:seed` creates demo data plus the admin account, which you should then
clean up (below).

**4. Try it:** `npm start`, then open `http://localhost:3001` on that machine. Stop it with Ctrl+C.

**5. Start at boot and back up nightly.** In an Administrator PowerShell:

```
powershell -ExecutionPolicy Bypass -File scripts\windows\install-tasks.ps1 -SkipFirewall -WhatIf   # preview
powershell -ExecutionPolicy Bypass -File scripts\windows\install-tasks.ps1 -SkipFirewall
Start-ScheduledTask -TaskName InterviewApp-Server
```

`-SkipFirewall` keeps the app's own port closed to the network, which is what you want behind a reverse proxy on the
same machine. Leave it off only for a private test where other computers must reach the port directly.
Undo everything with `-Remove`. The PC/server must stay on during working hours.

**Updating:** `git pull`, `npm ci`, `npm run build`, then `Stop-ScheduledTask` / `Start-ScheduledTask -TaskName InterviewApp-Server`.
The database migrates itself on start-up.

### Behind the company's HTTPS reverse proxy (hand-over notes for IT)

- Publish an HTTPS site (IIS with URL Rewrite/ARR, or any reverse proxy) that forwards to `http://localhost:3001`.
  It must send `X-Forwarded-For` (and `X-Forwarded-Proto`) and accept request bodies of at least 5 MB (resume uploads).
- Set `TRUST_PROXY` in `.env` to the **number of proxies in front of the app** (normally `1`), or to their IP addresses.
  Never `true`. Without it the login rate limit (10 tries per 15 minutes) counts every user as the proxy's single address,
  so a handful of logins would lock everybody out.
- Do not open the app port (3001) in the firewall; only the proxy's HTTPS port needs to be reachable.
- Back up the folder `BACKUP_DIR` (dated database copies plus a mirror of the resumes), not the live `app.db`, which
  can be caught mid-write by a file-level backup. Backups keep deleted candidates until they expire, so agree the
  retention period with HR / legal.
- `npm ci` downloads a prebuilt native module for `better-sqlite3` and needs access to the npm registry and GitHub. If the
  server cannot reach them, run `npm ci` and `npm run build` on another Windows x64 machine with the **same Node version**
  and copy the whole folder (including `node_modules` and `dist`).
- Sign-in uses the app's own accounts (email + password); there is no company SSO/AD integration.

### Before real candidates go in (checklist)

- [ ] Log in as the seeded admin and **change its password** (top bar). Seeded accounts use well-known passwords:
      `admin123` for the admin, `interview123` for the four demo interviewers.
- [ ] Delete the demo interviewers, or reset their passwords (Interviewers page > Reset password), and delete demo candidates.
- [ ] Set `SMTP_*` and check `APP_TIMEZONE`.
- [ ] Run `npm run db:backup` once and practise the restore below.

## Backups and restore

`npm run db:backup` (the scheduled task runs it nightly at 02:00) writes `app-<UTC date>-<time>.db` into `BACKUP_DIR`,
mirrors the resume files into `BACKUP_DIR\resumes`, and deletes database copies older than 14 days
(`-- --keep-days N` to change). It is safe while the server is running.

**Restore:** stop the server, copy the chosen `app-*.db` over `DB_PATH`, copy the files in `BACKUP_DIR\resumes` back into
`RESUME_UPLOAD_DIR`, start the server.

## Personal data (candidates)

- **Deleting a candidate** removes their record, interviews and resume file, and replaces their name and email in the
  activity log with "Deleted candidate". Older database backups still contain them until they age out (14 days by default).
- **Retention:** `npm run db:purge -- --months 12` lists *rejected* candidates with no activity for 12 months (dry run).
  Add `--apply` to delete them permanently. Decide the retention period with your HR / legal team.
- Interviewers only see candidates assigned to their interviews.

## What the system emails

- **When an interview is scheduled:** a confirmation to the candidate, and a "New interview assigned" email to each
  assigned interviewer (candidate name and position only, never their contact details).
- **When the time, room or location changes:** an "Interview updated" notice to the candidate and the interviewers.
- **When an interview is cancelled:** a "cancelled" notice to the interviewers (not the candidate). Nothing is sent if
  the interview's time has already passed.
- **Manual reminder:** the **Notify** button on a scheduled interview emails its interviewers on demand.

There are no automatic timed reminders. Emails are only really sent once the `SMTP_*` settings in `.env` are filled in
(ask IT for the mail server, port, sender address and credentials or relay); until then they are printed to the server log.
Each batch is recorded in the activity log as a count ("2/2 sent"), never with addresses.

Scheduling refuses double-bookings (same interviewer or same room at overlapping times) and lets an admin override
with "Schedule anyway".
