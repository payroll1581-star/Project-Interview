# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Interview Management System: candidate tracking, interview scheduling, and a dashboard. Vite + React 19 + TypeScript + Tailwind CSS v4 on the frontend, backed by a small Node/Express + SQLite (`better-sqlite3`) API in `server/`. Data persists in `server/data/app.db` (gitignored) across restarts — it is no longer in-memory mock state.

## Commands

- `npm run dev` — start the Vite dev server (frontend only)
- `npm run server` — start the Express API server (`server/index.js`, default port 3001)
- `npm run dev:all` — run both of the above together via `concurrently`
- `npm start` — production entry (`scripts/start-prod.mjs`): sets `NODE_ENV=production` and serves the built `dist/` plus the API from one port; needs `npm run build` first. See `README.md` for the Windows deployment, backup/restore and retention procedures.
- `npm run db:backup` — online SQLite backup + resume-folder mirror into `BACKUP_DIR` (`server/backup.js`, logic in `server/lib/backup.js`); `npm run db:purge -- --months N [--apply]` — dry-run/delete rejected candidates inactive for N months (`server/lib/retention.js`)
- `npm run db:seed` — seed `server/data/app.db` from the fixture data baked into `server/seed.js` (idempotent — no-ops if the `users` table isn't empty; delete the `.db` file to reseed from scratch)
- `npm run build` — type-check (`tsc -b`) then production build (`vite build`) for the frontend; run this to verify frontend changes compile
- `npm run lint` — run oxlint (config in `.oxlintrc.json`, plugins: react, typescript, oxc) — frontend only, does not lint `server/`
- `npm test` — run the backend test suite once (Vitest, config in `vitest.config.ts`); `npm run test:watch` for watch mode
- `npm run preview` — preview the production frontend build

The frontend talks to the API at `/api/*`, proxied to `http://localhost:3001` in dev by `vite.config.ts`'s `server.proxy`. Both `npm run dev` and `npm run server` (or `npm run dev:all`) must be running for the app to work.

## Testing

Backend tests live alongside the code they cover as `*.test.js` (e.g. `server/routes/candidates.test.js`), run via Vitest against the real Express `app` (exported from `server/index.js`, which only calls `app.listen()` when `NODE_ENV !== 'test'`) using `supertest`. Tests run against an isolated `:memory:` SQLite database — `server/db.js` reads its path from `DB_PATH`, which `vitest.config.ts` sets to `:memory:`; the real `server/data/app.db` is never touched by the suite. Each test file gets a fresh in-memory DB (Vitest isolates modules per file by default), so seed a test's own users via `server/test/helpers.js`'s `createUser`/`clearData` rather than relying on `server/seed.js`'s fixture data. There is no frontend test suite yet — `npm run build`'s type-check is what currently guards frontend changes.

## Backend (`server/`)

Plain ESM JavaScript, no build step, no TypeScript, no ORM — see `server/db.js` (opens the SQLite connection and applies `server/schema.sql` on startup), `server/routes/*.js` (one router per resource: `auth`, `candidates`, `interviews`, `users`), and `server/middleware/auth.js` (`requireAuth`/`requireRole` guard using opaque session tokens stored in the `sessions` table, not JWTs). Production is meant to sit behind an HTTPS reverse proxy: `helmet`'s defaults (`upgrade-insecure-requests`, HSTS) make plain-HTTP access from other machines unsupported, and `TRUST_PROXY` (parsed by `server/lib/trustProxy.js`; a hop count or IPs, never `true`) must be set there so the login rate limiter sees real client addresses. Config values read from env use `||` (not `??`) so a blank `KEY=` line copied from `.env.example` falls back to the default — a blank `DB_PATH` would otherwise open a throwaway SQLite database. Because `better-sqlite3` and `bcryptjs`'s sync API are used throughout, most route handlers are synchronous — no `async`/`await` needed. The exceptions are handlers that send email via `server/lib/mailer.js` (nodemailer), which is inherently async — see `POST /api/interviews/:id/notify` in `server/routes/interviews.js`.

`Interview.evaluation` (one optional evaluation per interview) is flattened onto nullable `eval_*` columns on the `interviews` table rather than a separate table; `server/lib/serialize.js` reconstructs the nested shape the frontend's `Interview` type expects. `Interview.interviewerIds` is backed by the `interview_interviewers` join table.

The business rule that scheduling an interview auto-updates the candidate's status to `'Interview Scheduled'` (unless already `Offer`/`Rejected`) now lives server-side in `server/routes/interviews.js`'s `POST /` handler, inside one `db.transaction(...)`. The counterpart lives in `POST /api/interviews/:id/complete` and `POST /api/interviews/:id/cancel` (shared helper `advanceCandidateIfInterviewed`): once no `Scheduled` interview remains and at least one is `Completed`, an `Interview Scheduled` candidate advances to `'Interviewed'` (both endpoints return `{ interview, candidate }`). `candidates.status` has a CHECK constraint, so adding a status needs a table rebuild — see `server/lib/migrations.js`, run from `server/db.js` on startup. `POST /api/interviews` and `PATCH /api/interviews/:id` reject double-bookings (same interviewer or same room, overlapping times, only against `Scheduled` interviews) with a 409 `{ code: 'schedule_conflict', conflicts }` unless the body has `allowConflict: true`; `PATCH` only re-checks when date/duration/room changed. `PATCH` also emails the candidate and assigned interviewers (fire-and-forget) when date, room or location change; `POST` emails each assigned interviewer, and `cancel` emails them unless the interview's time has passed. All of these go through `sendAndLog` in `server/routes/interviews.js`, which logs only counts and skips the log entry if the interview was erased meanwhile. Deleting a candidate goes through `eraseCandidate` in `server/lib/candidateData.js`, which also scrubs the candidate's name/email from `activity_log` (denormalized snapshots) — keep any new code that logs candidate details compatible with that scrub. Admins can edit an interviewer (`PATCH /api/users/:id`) and reset their password (`POST /api/users/:id/reset-password`, revokes their sessions). Authorization mirrors what the UI already enforced: candidate/interview/user *mutations* are admin-only except completing an interview (`POST /api/interviews/:id/complete`), which is also allowed for an interviewer assigned to that interview.

## Architecture

### Data flow: single context backed by the API

App state (`candidates`, `interviews`, `users`) lives in one `useReducer` inside `src/context/AppDataContext.tsx`, populated by fetching `/api/candidates`, `/api/interviews`, `/api/users` (see `refresh()` in that file) rather than from static fixtures. Components read/mutate it via the `useAppData()` hook (`src/context/useAppData.ts`), never via prop drilling or local page state for shared entities. Every mutation function on the context (`addCandidate`, `scheduleInterview`, `cancelInterview`, etc.) is `async`: it calls the matching REST endpoint via `src/lib/api.ts`, then dispatches the same reducer action it always did using the server's response. `AuthProvider` (`src/context/AuthProvider.tsx`) calls `refresh()` after login and `clear()` after logout to load/discard this data in step with the session.

The context object itself is split into `src/context/dataContext.ts` (the `createContext` call + `AppDataContextValue` type) separately from the provider component in `AppDataContext.tsx`. This split exists to satisfy oxlint's `react/only-export-components` rule (a file exporting both a component and a non-component triggers a fast-refresh warning) — keep new context values following this pattern rather than merging the files back together. Also note: `dataContext.ts`/`AppDataContext.tsx` differ only by case, which works on this case-insensitive Windows filesystem but would break on a case-sensitive one — don't introduce another filename that collides only by case.

The key cross-cutting behavior is in `scheduleInterview` (in `AppDataContext.tsx`): creating an interview for a candidate also auto-updates that candidate's status to `'Interview Scheduled'`, unless they're already `'Offer'` or `'Rejected'`. This is why scheduling must go through the shared context rather than being local to any one page — it needs to stay consistent across the Candidate Detail page, the Scheduling page, and the Dashboard simultaneously.

Derived/computed values (`upcomingInterviews`, `interviewsThisWeek`, `candidateStatusCounts`) are computed inside the context's `useMemo`, not stored as separate state — treat them as read-only selectors.

### Routing

`src/routes.tsx` defines all routes using `react-router` v8's declarative API (`BrowserRouter`/`Routes`/`Route`/`Outlet` — not `createBrowserRouter`, since there's no data loading to justify it). A single layout route (`AppLayout`) wraps every page with `Sidebar` + `Topbar`. `/` redirects to `/dashboard`. Interview scheduling is a modal (`ScheduleInterviewForm`), not a route — it's opened from Candidates, Candidate Detail, and Scheduling pages.

### Component layering

- `components/ui/` — generic, presentation-only primitives (Card, Badge, Button, Table, Modal, Input/Select/Textarea, EmptyState). No knowledge of `AppDataContext`.
- `components/candidates/`, `components/interviews/`, `components/dashboard/` — feature components that call `useAppData()` directly.
- `components/layout/` — the app shell (`AppLayout`, `Sidebar`, `Topbar`).
- `pages/` — route-level components that compose feature components; own their own local UI state (e.g. search/filter text, which modal is open).

Modals (`CandidateFormModal`, `ScheduleInterviewForm`) render their form body only when `open` is true (`{open && <FormBody .../>}`) rather than resetting form state via `useEffect`. This is intentional — it satisfies oxlint's `react(set-state-in-effect)` warning and gives a fresh, unmounted-then-remounted form each time the modal opens. Follow this pattern for any new modal forms instead of adding a reset effect.

### Styling

Tailwind v4 is configured CSS-first — there is no `tailwind.config.*` file. The only setup is `@import "tailwindcss";` in `src/index.css` plus the `@tailwindcss/vite` plugin in `vite.config.ts`. Add custom design tokens via an `@theme` block in `src/index.css` if needed, not a config file.

Status-to-color mapping for `CandidateStatus`/`InterviewStatus` lives centrally in `src/lib/status.ts` (`candidateStatusStyles`, `interviewStatusStyles`) and is consumed by `components/ui/StatusPill.tsx` and `components/dashboard/StatusFunnel.tsx`. Add new statuses there, not by hardcoding colors in components.

### TypeScript config notes

`tsconfig.app.json` has `verbatimModuleSyntax: true` — type-only imports must use `import type { ... }` (mixing value and type imports from the same module needs a separate `import type` statement). `noUnusedLocals`/`noUnusedParameters` are enforced, so unused variables/params fail the build, not just lint.
