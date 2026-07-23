# Code Standards

## General
- Prefer clarity over cleverness — this codebase will be maintained by AI
  agents across many sessions, so explicit, boring code beats compact code.
- Small, single-responsibility functions and components.
- Descriptive names (`assignLeadToRep`, not `doAssign`).
- No dead code, no commented-out blocks left behind — delete or explain.
- Conventional Commits for messages (`feat:`, `fix:`, `chore:`, `refactor:`).
- ESLint + Prettier enforced; no unformatted code committed.

## TypeScript
- `strict: true` in `tsconfig.json`. No implicit `any`.
- No `any` — use `unknown` + narrowing, or a proper type/interface.
- Use `zod` schemas for all external input (forms, API request bodies, CSV
  rows) and derive TypeScript types from the schema (`z.infer<...>`) rather
  than maintaining types by hand in two places.
- Shared types live in `/types`, not duplicated per file.
- Enums for fixed sets (lead status, role, team) defined once and imported
  everywhere — never re-type the string literals.

## Next.js (App Router)
- Server Components by default; add `"use client"` only where interactivity
  (state, event handlers) is actually needed.
- Mutations go through Server Actions where practical; use Route Handlers
  (`/app/api/.../route.ts`) for anything Zoom needs to call server-side, or
  for endpoints consumed by non-React clients (e.g. CSV upload processing).
- Route groups actually used: `(auth)` for sign-in/sign-up, and a single
  `(app)` group (not separate `(admin)`/`(dashboard)`) so every logged-in
  route shares one sidebar/topbar shell (`app/(app)/layout.tsx`). The
  Admin-only `users` route nests its own `layout.tsx` inside `(app)/users`
  that redirects non-Admins — simpler than a parallel route group for one
  route.
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`** (exported function
  `proxy`, Node.js runtime only). `proxy.ts` handles the Clerk
  signed-in-or-not check for every non-public route; fine-grained checks
  (Admin-only, team/own-record scoping) happen in layouts/Server
  Actions/RLS, not in `proxy.ts` — this project skips syncing role into
  Clerk metadata just to make the Admin check edge-fast, since the extra
  moving part isn't worth it for an 8-person internal tool.
- Loading and error states (`loading.tsx`, `error.tsx`) provided for any
  route that fetches data.

## Styling
- Tailwind CSS utility classes only — no inline `style={{}}` unless
  truly dynamic (e.g. a computed width).
- Design tokens (blue palette, spacing, radius) defined once in
  `tailwind.config.ts` / CSS variables — see `ui-context.md` for values.
- Base components from shadcn/ui, customized via Tailwind, not forked/copied
  and hand-edited unless necessary.
- Consistent spacing scale (Tailwind's default scale) — no arbitrary magic
  numbers like `mt-[13px]` unless unavoidable.

## API Routes
- One responsibility per route handler.
- Validate every request body/query with `zod` before touching the database
  or Zoom.
- Consistent response shape: `{ data, error }` — never return raw arrays or
  throw unhandled exceptions to the client.
- Every route re-checks the caller's Clerk session and role — never trust a
  client-supplied `role` or `userId`.
- Zoom API calls are isolated in `/lib/zoom.ts` — route handlers call this
  module, they don't build Zoom requests inline.
- **CSV import** (`/api/csv-import`) is deliberately a Route Handler
  called via `fetch` from a client component in batches (500 rows/request,
  chunked client-side after parsing the whole file), not a single request
  with the whole file — built for 30,000+ row imports, and a single
  giant request risks serverless function timeouts with zero progress
  feedback. Client-side CSV parsing uses `papaparse` (not a hand-rolled
  splitter) — real CSVs have quoted fields with embedded commas/quotes
  that a naive `.split(',')` mangles.

## Error Messages (Server Actions & Route Handlers)
- **Mask, don't rely on error classes surviving the client boundary.**
  Thrown errors from a Server Action reach a Client Component as a plain
  `Error` — a custom subclass's identity (`PermissionError`,
  `ValidationError`, both in `lib/permissions.ts`) does **not** survive
  serialization, only `.message` does. So the safe/unsafe split happens at
  the **throw site** (server), not the catch site (client):
  - Deliberate, human-readable messages (validation failures,
    permission denials, business rules like "You can't deactivate your
    own account.") are thrown as-is via `ValidationError`/`PermissionError`
    — these display verbatim.
  - Raw Supabase/Postgres errors are **never** forwarded — every
    `if (error) throw ...` for a DB call throws a fixed
    `new Error("Something went wrong.")` instead of `error.message`.
  - `lib/hooks/use-action-status.ts`'s `friendlyMessage()` on the client
    just displays whatever `.message` arrives, trusting the server already
    did the masking — it does **not** attempt an `instanceof` check
    against `lib/permissions.ts` classes (that file is `server-only` and
    importing it into client code fails the build outright).
- **Inline feedback, not toasts**, for form/action results: `useActionStatus()`
  wraps a Server Action call with pending/success/error state;
  `<ActionFeedback status={...} />` (`components/ui/action-feedback.tsx`)
  renders green success / red error text under the triggering button,
  success auto-clearing after ~3s. Loading state disables the button via
  `isPending` from the same hook. Established across
  `profile-card.tsx`/`activity-feed.tsx`/`deals-panel.tsx`/
  `users-table.tsx` — new interactive actions should follow the same
  pattern rather than reaching for `sonner`'s `toast.error`.

## Data and Storage
- Supabase server-side client uses the service role key only inside server
  code (Route Handlers / Server Actions) — never shipped to the browser.
- Row Level Security policies are mandatory on every table containing lead
  or user data, even though the app layer also checks — defense in depth.
- All schema changes go through versioned SQL files in
  `/supabase/migrations` — no ad hoc changes via the Supabase dashboard for
  anything beyond local experimentation.
- No string-concatenated SQL; use the Supabase client's query builder or
  parameterized queries.
- Generate and commit typed Supabase types
  (`supabase gen types typescript`) so the app is type-safe against the real schema.

## File Organization
Project root is `/web` (sibling to `/Context`). Actual layout:
```
/web
  /app
    /sign-in/[[...sign-in]]/... (top-level, not a route group — the Clerk
                                 CLI expects this exact path; a route
                                 group doesn't change the URL anyway)
    /sign-up/[[...sign-up]]/...
    /(app)/layout.tsx        (sidebar/topbar shell, "pending setup" gate)
    /(app)/leads/page.tsx    (list: search + pagination)
    /(app)/leads/[id]/page.tsx (full-page detail, 3-column layout)
    /(app)/users/layout.tsx  (admin-only guard)
    /(app)/users/...
    /(app)/dashboard/layout.tsx (admin-only guard, same pattern as users/)
    /(app)/dashboard/page.tsx
    /(app)/pipeline/...      (Phase 2)
    /api/webhooks/clerk/route.ts
    /api/csv-import/route.ts (chunked batch insert, see code-standards
                              "CSV Import" note below)
    /api/zoom/...            (Phase 3)
    proxy.ts                 (was middleware.ts pre-Next-16)
  /components
    /ui/           (shadcn primitives, + action-feedback.tsx)
    /layout/       (app-shell.tsx)
    /leads/        (list view, shared LeadForm, status-badge, csv-import.tsx)
    /leads/detail/ (profile-card, activity-feed, deals-panel — the
                    3-column detail-page components)
    /dashboard/    (stat-tile, bar-chart, team-breakdown, performance-tables)
    /users/
  /lib
    supabase.ts    (RLS-scoped client + service-role admin client)
    permissions.ts (role/team scoping helpers, shared by Server Actions)
    /hooks/        (use-action-status.ts — inline pending/success/error)
    /actions/      (leads.ts, activities.ts, deals.ts, users.ts, dashboard.ts)
    /validations/  (zod schemas)
    zoom.ts        (Phase 3)
  /types
  /supabase/migrations
```
