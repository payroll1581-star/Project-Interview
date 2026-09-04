# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A frontend-only Interview Management System: candidate tracking, interview scheduling, and a dashboard. Vite + React 19 + TypeScript + Tailwind CSS v4. There is no backend — all data lives in-memory, seeded from mock fixtures and mutated through React state for the lifetime of the page.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then production build (`vite build`); run this to verify changes compile, since there is no test suite
- `npm run lint` — run oxlint (config in `.oxlintrc.json`, plugins: react, typescript, oxc)
- `npm run preview` — preview the production build

There are no tests in this repo.

## Architecture

### Data flow: single context, no backend

All app state (`candidates`, `interviews`) lives in one `useReducer` inside `src/context/AppDataContext.tsx`, seeded from `src/data/candidates.ts` / `src/data/interviews.ts`. Components read/mutate it via the `useAppData()` hook (`src/context/useAppData.ts`), never via prop drilling or local page state for shared entities.

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
