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

## Running it for real on a Windows PC (office network)

The dev command is not for daily use. In production one process serves both the built pages and the API.

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
BACKUP_DIR=C:\Users\<you>\OneDrive\InterviewApp-backups
PORT=3001
```

Also fill in the `SMTP_*` settings if the system should really send email; otherwise emails are only printed to the server log.

**3. Bring your data over** (skip on a brand-new install): stop the old server, copy the old `app.db` to `DB_PATH`
and the old resume folder to `RESUME_UPLOAD_DIR`. A fresh database has no accounts; `npm run db:seed` creates
demo data plus the admin account, which you should then clean up (below).

**4. Try it:** `npm start`, then open `http://localhost:3001`. Stop it with Ctrl+C.

**5. Start at boot, back up nightly, allow the office network.** In an Administrator PowerShell:

```
powershell -ExecutionPolicy Bypass -File scripts\windows\install-tasks.ps1 -WhatIf   # preview
powershell -ExecutionPolicy Bypass -File scripts\windows\install-tasks.ps1
Start-ScheduledTask -TaskName InterviewApp-Server
```

Interviewers then open `http://<computer-name>:3001`. Pages and logins travel over plain HTTP, so keep this to a
network you trust and do not expose the port to the internet. The PC must stay on during working hours.
Undo everything with `-Remove`.

**Updating:** `git pull`, `npm ci`, `npm run build`, then `Stop-ScheduledTask` / `Start-ScheduledTask -TaskName InterviewApp-Server`.
The database migrates itself on start-up.

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

Candidate confirmation when an interview is scheduled; an "interview updated" notice to the candidate and the assigned
interviewers when the time, room or location changes; and the manual **Notify** reminder to interviewers.

Scheduling refuses double-bookings (same interviewer or same room at overlapping times) and lets an admin override
with "Schedule anyway".
