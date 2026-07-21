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
    /(auth)/sign-in/[[...sign-in]]/...
    /(auth)/sign-up/[[...sign-up]]/...
    /(app)/layout.tsx        (sidebar/topbar shell, "pending setup" gate)
    /(app)/leads/...
    /(app)/users/layout.tsx  (admin-only guard)
    /(app)/users/...
    /(app)/pipeline/...      (Phase 2)
    /api/webhooks/clerk/route.ts
    /api/csv-import/...      (Phase 2)
    /api/zoom/...            (Phase 3)
    proxy.ts                 (was middleware.ts pre-Next-16)
  /components
    /ui/           (shadcn primitives)
    /layout/       (app-shell.tsx)
    /leads/
    /users/
  /lib
    supabase.ts    (RLS-scoped client + service-role admin client)
    permissions.ts (role/team scoping helpers, shared by Server Actions)
    /actions/      (leads.ts, users.ts — Server Actions)
    /validations/  (zod schemas)
    zoom.ts        (Phase 3)
  /types
  /supabase/migrations
```
