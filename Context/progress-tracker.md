# Progress Tracker

## Current Phase
Phase 1 (Foundation: Auth, Roles, Schema, Lead CRUD) — Clerk and Supabase
are both live with real credentials, migration applied, first Admin
bootstrapped. Core loop (sign-in -> leads page) is believed working; needs
the user to confirm in their own browser.

## Current Goal
Confirm the Leads page loads correctly for the bootstrapped Admin in a real
browser, then finish out the rest of Phase 1 (Team Lead/Rep role QA with a
second test user) before moving to Phase 2.

## Completed
- Reviewed Nova Staffs knowledge base; confirmed team structure (8 reps: 5
  Sales, 3 BDE), role model (Admin/Team Lead/Rep), stack (Next.js +
  Supabase + Clerk + Tailwind/shadcn), Zoom integration ambition. Wrote all
  6 context docs (prior session).
- Approved a 3-phase build plan (Foundation -> Pipeline/CSV/Dashboard ->
  Zoom/Polish); saved at
  `C:\Users\nstech\.claude\plans\purrfect-puzzling-cherny.md`.
- Scaffolded the Next.js 16 (App Router, Turbopack, TS) project into
  `/web` (sibling to `/Context`); git initialized at the repo root.
- Installed & configured shadcn/ui (`base-nova` style, Base UI primitives)
  with the blue theme from `ui-context.md` (primary/ring/sidebar colors,
  `--radius` tuned so cards land ~8px / buttons ~6px). Added button, input,
  label, dialog, sheet, table, dropdown-menu, badge, select, avatar,
  sonner, card, tabs components.
- Wrote `types/database.ts` (Role/Team/LeadStatus enums + row types) as the
  single source of truth for these values app-wide.
- Wrote `supabase/migrations/0001_init.sql`: `users`, `leads`, `call_logs`,
  `status_history` tables, enums, indexes, a `current_app_user()` helper
  function, and full RLS policies (one policy per role x team combo rather
  than nested booleans, for readability) implementing the exact visibility
  matrix in `architecture.md`.
- Wrote `lib/supabase.ts` (RLS-scoped client using Clerk's `accessToken`
  passthrough + a service-role admin client for the webhook only) and
  `lib/permissions.ts` (`getCurrentAppUser`, `requireAppUser`,
  `requireAdmin`, `canAssignLeads`).
- Clerk integration: `proxy.ts` (Next 16 renamed `middleware.ts` ->
  `proxy.ts`) gates all non-public routes on sign-in; `(auth)` route group
  for sign-in/sign-up; `app/(app)/layout.tsx` is the shared shell (sidebar +
  topbar) and shows a "pending setup" screen for users with no role yet.
- Clerk webhook (`/api/webhooks/clerk`) mirrors `user.created/updated` into
  `users`, and marks a user `active = false` on `user.deleted` (never hard
  deletes, since leads FK-reference `users`).
- Lead CRUD: `lib/actions/leads.ts` Server Actions (`getLeads`,
  `getAssignableUsers`, `createLead`, `updateLead`, `deleteLead`) + UI
  (`components/leads/leads-view.tsx` table, `lead-form.tsx` shared
  add/edit form, `status-badge.tsx` using the exact status colors from
  `ui-context.md`). Add = modal dialog, edit/view = right-side sheet, per
  `ui-context.md` layout patterns. Status changes write a `status_history`
  row automatically.
- Admin Users page (`app/(app)/users`, admin-only via its own
  `layout.tsx` guard): table with inline role/team `Select`s and an
  activate/deactivate button, backed by `lib/actions/users.ts`. Includes a
  guard preventing the calling Admin from demoting/deactivating themself
  (lockout risk on a single-admin system).
- `npx tsc --noEmit` and `npx eslint .` both clean; `npm run build`
  succeeds.
- Updated `code-standards.md` (File Organization, proxy.ts rename,
  the merged `(app)` route group vs. separate `(admin)`/`(dashboard)`) and
  `architecture.md` (Supabase Third Party Auth requirement for RLS,
  first-admin bootstrap step) to match what was actually built.
- **Provisioned Clerk for real** via the Clerk CLI: installed `clerk` CLI,
  logged in, linked the project to the user's Clerk app
  (`app_3Gp6Jd2LSJoD94orPPf8uNfleBL`) with `clerk init` + `clerk env pull`
  — real publishable/secret keys now in `web/.env.local`. Moved
  sign-in/sign-up pages out of the `(auth)` route group to the plain
  `app/sign-in`, `app/sign-up` paths the Clerk CLI expects (route groups
  don't affect the URL, so no behavior change, just avoids the CLI
  creating duplicate/conflicting routes on future `clerk init` runs — the
  `(auth)` group itself was removed since nothing else lived in it).
  Added the `/__clerk/:path*` proxy matcher entry. Installed `@clerk/ui`
  and applied the shadcn theme (`ClerkProvider appearance`, plus the
  shadcn CSS import) since this project already uses shadcn/ui. Moved
  `ClerkProvider` inside `<body>` (was incorrectly wrapping `<html>`).
  `clerk doctor` and a browser smoke-test (via curl: `/` redirects
  unauthenticated visitors to Clerk-hosted `/sign-in`, both auth pages
  return 200) confirm the auth flow works end-to-end.
- User signed up as the first real user in a browser. Fixed two Clerk
  instance settings via the Clerk CLI (`clerk config patch`): disabled the
  HaveIBeenPwned breach-password check (`auth_password.disable_hibp`,
  user wants short/memorable team passwords) — left complexity
  requirements off (already default) and confirmed `device_trust.enabled`
  stays on, which already challenges any new-device sign-in for a second
  factor, covering the risk of a reused/leaked password. Also fixed
  Clerk's sign-in/up pages rendering with browser-default fonts (Times New
  Roman): the `@clerk/ui` shadcn theme depends on Tailwind scanning a
  `node_modules` JS file for class names, which this project's bundler
  (Turbopack) wasn't doing (confirmed zero `.cl-*` rules in the compiled
  CSS) — fixed by setting `appearance.variables.fontFamily` directly to
  the app's existing Geist sans variable in `app/layout.tsx`, which
  doesn't depend on that class-scanning mechanism at all.
- **Provisioned Supabase for real**: installed the Supabase CLI, logged in
  with a personal access token (non-interactive environment can't do the
  browser OAuth flow Clerk's CLI used), linked the repo to the user's
  existing "NovaCRM" project (`junpizfmrbfnwfpqanal`) with
  `supabase link`, and applied `0001_init.sql` with `supabase db push`
  (confirmed via `supabase migration list`: local and remote both at
  `0001`). Pulled the project URL + legacy anon/service_role JWT keys via
  `supabase projects api-keys` into `web/.env.local`.
- **Linked Clerk as a Supabase Third Party Auth provider** (the step
  RLS depends on) — not via `supabase config push` (see incident below),
  but directly via `POST /v1/projects/{ref}/config/auth/third-party-auth`
  with Clerk's OIDC issuer URL (`https://<instance>.clerk.accounts.dev`,
  decoded from the Clerk publishable key). Verified the integration is
  live and resolved Clerk's JWKS correctly (`kid` matches the Clerk
  instance ID from `clerk doctor`).
- **Incident**: ran `supabase config push` intending only to flip the
  Clerk third-party-auth toggle in `config.toml`, not realizing that
  command pushes the *entire* local config file — and since
  `web/supabase/config.toml` was a freshly-scaffolded template (never
  pulled from the real project), it silently overwrote several unrelated
  live Auth settings (site_url, redirect allow-list, MFA TOTP
  enroll/verify, email-confirmation-required, OTP length/rate limits,
  and corrupted the SMS/MFA-phone OTP template string). A separate
  `storage.vector.enabled` change in the same push failed with a 402
  (paid-tier-only feature), which incidentally meant storage config was
  untouched. Caught it immediately from the printed diff, restored every
  changed Auth field to its original value via a direct
  `PATCH /v1/projects/{ref}/config/auth` call, and fixed
  `web/supabase/config.toml` to match reality (not just the Clerk change)
  so a future push wouldn't reintroduce the same drift. Net effect on the
  app is believed to be zero either way, since NovaCRM never calls
  Supabase's native Auth endpoints (Clerk is the only sign-in path;
  Supabase is DB + RLS only) — but the settings were live on the account
  regardless and needed reverting on principle. **Lesson**: never run
  `supabase config push` against a real project without first pulling
  and diffing the actual remote config — treat it as equivalent in blast
  radius to `git push --force`.
- Manually bootstrapped the first Admin: found the signed-up user via
  `clerk users list`, then inserted their `users` row directly via the
  Supabase REST API using the service-role key (`role: admin`, since no
  webhook has fired yet to do this automatically — see Next Up).

## In Progress
- None — both Clerk and Supabase are provisioned with real credentials.
  Dev server logs show the bootstrapped Admin's browser successfully
  loading `/leads` (200), which implies the full chain — Clerk session ->
  Supabase RLS-scoped query -> page render — is working, but this was
  observed passively in server logs, not confirmed by the user directly.

## Next Up
1. User confirms in-browser that the Leads page renders correctly (empty
   state) and that Add Lead / edit work.
2. Set up the Clerk webhook endpoint once deployed (or tunneled via
   `clerk webhooks listen`) and fill in `CLERK_WEBHOOK_SIGNING_SECRET` —
   needed so *future* sign-ups get a `users` row automatically. Right now
   only the one bootstrapped Admin has a row (inserted manually via the
   Supabase REST API with the service-role key, since no webhook fired
   for that first sign-up).
3. Add a second test user (sign up, leave unassigned, then Admin assigns
   role/team from the Users page) to manually reason through RLS for
   Team Lead/Rep — Admin-only was exercisable solo; scoping rules need at
   least 2 accounts to verify "can't see the other rep's leads".
4. Phase 2: CSV import, Kanban pipeline view, filter bar, dashboard stat
   tiles (see the plan file for the detailed breakdown).

## Open Questions
- **Zoom app type**: defaulted to Server-to-Server OAuth (logged in the
  plan file) — revisit with Nova Staffs' Zoom admin before Phase 3.
- **Duplicate leads**: decided against a persistent `duplicate_of` column —
  CSV import (Phase 2) will check for an existing phone number at
  import-time and surface a non-blocking warning in the mapping/review
  step, nothing stored permanently. Revisit only if leadership wants a
  persistent "possible duplicate" flag on the lead record itself.
- **Lead reassignment history**: kept the lightweight `status_history`
  table only (no separate full audit trail) — unchanged from prior
  session's assumption.
- **Holidays/closures**: still just a note for later follow-up-date logic,
  not implemented.

## Architecture Decisions
- Next.js App Router, single `(app)` route group instead of separate
  `(admin)`/`(dashboard)` groups — one shared shell, admin-only routes
  nest their own guard layout instead. See `code-standards.md`.
- `proxy.ts` (not `middleware.ts` — Next.js 16 renamed the convention) does
  only the coarse "signed in?" check; Admin-only gating happens in
  `app/(app)/users/layout.tsx` via a Supabase read, not via Clerk metadata
  synced to the edge. Simpler, one less moving part, acceptable latency
  for an 8-person internal tool.
- RLS policies are split one-per-role-per-team (e.g.
  `leads_select_bde_team_lead`, `leads_select_sales_rep`) rather than one
  giant boolean expression per table — Postgres ORs multiple permissive
  policies together, so this reads far more clearly and each policy maps
  1:1 to a sentence in `architecture.md`'s visibility matrix.
- No CSV-import-time duplicate column on `leads` (see Open Questions).
- Supabase RLS requires Clerk configured as a Supabase "Third Party Auth"
  provider (not the deprecated JWT template flow) — see `architecture.md`.

## Session Notes
- **Session 1**: Gathered requirements, reviewed the Nova Staffs knowledge
  base, clarified team headcount/role model/Zoom ambition/stack. Produced
  all 6 context docs.
- **Session 2**: Planned and approved the 3-phase build; built the bulk of
  Phase 1 (scaffold through lead CRUD + Admin Users page) as detailed
  above. Blocked on the user provisioning real Clerk/Supabase credentials
  before it can be browser-tested — flagged clearly rather than claiming
  the UI works untested.
- **Session 3**: User created a Clerk app and asked to wire it up via the
  Clerk CLI. Installed the CLI, linked the app, pulled real dev keys,
  reconciled the CLI's expected file layout with what was already built
  (moved sign-in/up pages, dropped the now-empty `(auth)` group), added
  the shadcn theme for Clerk components, fixed `ClerkProvider` placement,
  and verified the auth redirect flow via `clerk doctor` + curl. Supabase
  is still unprovisioned, so lead CRUD remains untested in a real browser.
- **Session 4**: User signed up successfully but hit two Clerk UX issues
  (browser-default font, HIBP breach-password block) — fixed both (see
  Completed). Then provisioned Supabase for real: linked the existing
  "NovaCRM" project via the Supabase CLI with a personal access token,
  applied the schema migration, and linked Clerk as a Third Party Auth
  provider via a direct Management API call. Had an incident with
  `supabase config push` overwriting unrelated live Auth settings —
  caught it from the printed diff and fully reverted via the Management
  API within the same session (see Completed for the full writeup and
  the lesson learned). Manually bootstrapped the first Admin since no
  webhook has synced a `users` row yet. Server logs show the Admin's
  browser successfully loading `/leads` (200) after all this, suggesting
  the full stack works, but that's inferred from logs, not yet confirmed
  directly by the user in their browser.
