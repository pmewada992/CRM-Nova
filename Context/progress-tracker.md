# Progress Tracker

## Current Phase
Phase 1 foundation + HubSpot-style redesign + company-wide read/owner-only
write + invite-only auth + Admin Dashboard + inline-feedback pattern are
all built and the font bug is genuinely fixed and user-confirmed (see
Completed for the circular-CSS-variable root cause). Ran `/ponytail-audit`
and applied all 6 findings (~586 lines, 345 packages removed). Most
recently: a status-color overhaul (new `Connected`/`Not Interested`
statuses, a full recolor per the user's spec), blue quick-action/tab
styling, and Previous/Next Lead navigation. Typecheck/lint/build clean;
**not yet confirmed in-browser by the user**.

## Current Goal
User confirms in-browser: the new status colors and blue buttons/tabs
look right, Previous/Next Lead navigation works (including across a CSV
batch where many leads share one `created_at`), and "Connected"/
"Not Interested" show up correctly in the status dropdown. Then: a real
CSV import, and the rest of Phase 2 (Kanban, filter bar).

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
- **Redesign, prompted by the user's HubSpot-style reference screenshot**
  (see plan file addendum for the full spec):
  - Migration `0002_activities_deals.sql`: `pg_trgm` extension + GIN
    trigram indexes on `leads.name/phone/email` (search at 30k+ scale);
    dropped `call_logs`/`status_history` (both empty) in favor of one
    polymorphic `lead_activities` table (type: assigned/status_changed/
    call/note/task) so the detail page's tab-filterable timeline is one
    query, not a stitched-together join; new `deals`/`payments` tables
    (payments as a ledger, not a running total, so partial payments over
    time are representable). RLS on all three follows the parent lead's
    visibility; deals/payments writes are Admin + Sales only (assumption,
    flagged in `architecture.md`).
  - Migration `0003_drop_redundant_lead_fields.sql`: dropped
    `leads.notes`/`leads.date_called` — both fully superseded by
    `lead_activities` and had zero real data or reads/writes left in the
    app.
  - `lib/actions/leads.ts` rewritten: `getLeads` now takes
    `{ search, page }`, paginates (50/page) via `.range()`, searches
    Name/Email/Phone via `.or(ilike...)` (uses the trigram indexes), and
    computes `last_activity_at` per page with one follow-up query rather
    than a per-row subquery or a denormalized/trigger-maintained column
    (deliberately skipped — not worth the sync-bug risk at 50-rows/page
    scale; revisit only if sorting by last-activity across all 30k rows
    becomes a real need). Added `getLeadById`.
  - New `lib/actions/activities.ts` (`getActivities`, `logCall` — inserts
    the instant the button is clicked, outcome filled in after —
    `updateCallOutcome`, `addNote`, `addTask`, `completeTask`,
    `changeStatus`, `reassignLead` — this is new, assignment changes were
    never logged before) and `lib/actions/deals.ts` (`getDeals`,
    `createDeal`, `logPayment`).
  - UI: `leads-view.tsx` trimmed to Name/Phone/Lead Owner/Assigned To/
    Last Activity/Status, with a debounced search box and page controls;
    row click now navigates to `/leads/[id]` instead of opening a Sheet
    (the Sheet/drawer pattern is gone entirely). New
    `app/(app)/leads/[id]/page.tsx` + `components/leads/detail/`
    (`profile-card.tsx`, `activity-feed.tsx`, `deals-panel.tsx`)
    implementing the 3-column layout from `ui-context.md`.
  - `npx tsc --noEmit` / `npx eslint .` / `npm run build` all clean.
    Seeded one test lead (Priya Mehta) directly via the Supabase REST API
    (service role) so there's real data to look at.
  - **User-confirmed working** in a real browser. Found one real gap:
    `DealCard` showed the collected/pending summary but never listed
    individual payments. Fixed: added a "Payment History" list (date +
    time + amount, newest first) under the progress bar in
    `components/leads/detail/deals-panel.tsx`; also removed the
    `pending > 0` gate on the "Log Payment" button (a fully-paid deal can
    still get a correction/additional payment logged).
- **CSV import**, built for real 30k+-row scale (see plan file's
  "Immediately Next" section for the original spec):
  - Migration `0004_leads_phone_index.sql`: plain btree index on
    `leads.phone` — the trigram GIN index from 0002 is tuned for `%term%`
    partial matches, not the exact-match `IN (...)` lookup the duplicate
    check does.
  - Installed `papaparse` for client-side parsing rather than hand-rolling
    a splitter — verified with a synthetic CSV containing a quoted comma
    (`"Doe, Jane"`) and an escaped quote (`"Quote ""Test"" Guy"`), both of
    which a naive `.split(',')` would have mangled; papaparse handled both
    correctly.
  - `lib/validations/lead.ts`: added `csvRowSchema` (Name + Phone
    required, rest optional) and `csvImportBatchSchema`.
  - `app/api/csv-import/route.ts`: a Route Handler (not a Server Action,
    per `code-standards.md`'s existing convention for this), one batch
    (up to 1000 rows) per call. Checks the batch's phone numbers against
    existing leads and reports a duplicate count in the response, but
    **imports every row regardless** — flag, don't block, per the
    standing decision. Guards against a client-supplied `leadBy` unless
    the caller actually `canAssignLeads` — a naive version would have let
    any request claim an arbitrary BDE's credit.
  - `components/leads/csv-import.tsx`: file picker → parse client-side
    (papaparse, `worker: true` so a multi-MB file doesn't freeze the
    main thread) → column-mapping step with **alias-based** auto-guessing
    (a first pass using exact label matches failed on realistic headers
    like "Full Name"/"Phone Number" — fixed by matching on a per-field
    alias list instead, verified against the same synthetic CSV) → client
    validates + filters invalid rows (missing Name/Phone) → chunks the
    rest into 500-row batches, posted sequentially to `/api/csv-import`
    with a progress bar → final summary (imported / flagged-duplicate /
    skipped-invalid counts). Wired in as an "Import CSV" tab alongside
    "Add Manually" in the existing Add Lead dialog
    (`components/leads/leads-view.tsx`), per `ui-context.md`'s documented
    tab pattern.
  - `npx tsc --noEmit` / `npx eslint .` / `npm run build` all clean; CSV
    parsing + column-auto-mapping verified against a synthetic file
    covering quoting edge cases and realistic headers.
- User confirmed the redesign worked, but the Deals panel had no way to
  view individual payments — added a "Payment History" list (date + time
  + amount, newest first) to `deals-panel.tsx`'s `DealCard`, and dropped
  an overly-restrictive `pending > 0` gate on "Log Payment" (a fully-paid
  deal can still get a correction logged).
- **Company-wide read, owner-only write** (confirmed with the user,
  broader than the original per-team scoping): any provisioned user can
  now view *every* lead read-only; editing stays restricted to the
  existing role/team rules. Migration `0005_company_wide_read.sql`:
  - New `can_edit_lead(lead_id)` SQL function mirroring the union of the
    5 `leads_update_*` policies from 0001 in one place.
  - `leads`: 5 `leads_select_*` policies → 1 (`role is not null`); 5
    `leads_update_*` policies → 1 (`can_edit_lead(id)`).
  - **Closed a latent gap this exposed**: `lead_activities_insert`,
    `deals_insert`, `payments_insert` previously only checked
    `created_by = me`, never that the caller could actually edit the
    target lead — harmless while SELECT was owner-scoped (no UI path to
    another lead's id), a real hole once every lead became readable
    (anyone could've logged a call/deal against an arbitrary `lead_id` by
    calling the Server Action directly). All three now also require
    `can_edit_lead(lead_id)`.
  - `lib/permissions.ts` got a `canEditLead(user, lead)` TS mirror so the
    UI can hide/disable edit affordances (RLS is still the real
    enforcement). `app/(app)/leads/[id]/page.tsx` computes it and threads
    it through `ProfileCard`/`ActivityFeed`/`DealsPanel`; a read-only
    viewer sees an amber "you're viewing this read-only" banner instead
    of edit controls.
- **Invite-only auth** (confirmed with the user): Clerk
  `auth_access_control.sign_up_mode` flipped `"public"` → `"restricted"`
  via a single scoped `clerk config patch` (dry-run diff reviewed first,
  per the standing lesson from the earlier `config push` incident — see
  memory). New `inviteUser(email)` Server Action
  (`lib/actions/users.ts`, uses `clerkClient().invitations.createInvitation`)
  + an "Invite User" button/dialog on the Users page. Verified via curl:
  the sign-in page no longer renders a "Sign up" link; `/sign-up` itself
  still renders (needed for the invitation-ticket flow).
- **Admin Dashboard** (`/dashboard`, own `layout.tsx` guard like
  `users/layout.tsx`; nav entry added as the first sidebar item,
  Admin-only): `lib/actions/dashboard.ts`'s `getDashboardStats()` —
  4 lightweight `count:'exact',head:true` queries for the stat tiles,
  everything else grouped in JS from minimal-column queries (same
  "fine at this size, revisit with a SQL view if it gets slow" reasoning
  already used for skipping a denormalized `last_activity_at`). Loaded
  the `dataviz` skill before building the two bar charts (payments-by-
  month, payment-contribution-by-Sales-rep) — plain CSS bars (no charting
  dependency needed for a handful of uniform-color magnitude bars): ≤24px
  thick, 4px rounded tops, brand blue. "Closer" (confirmed with the user)
  = a deal with ≥1 payment logged, credited to `offered_by`; a 2nd/3rd
  payment on the same deal doesn't count again.
- **Inline action feedback** (loading/success/error under the button,
  never a raw technical error): new `lib/hooks/use-action-status.ts`
  (`useActionStatus()`) + `components/ui/action-feedback.tsx`. Hit a real
  bug building this — the hook originally imported `PermissionError`/
  `ValidationError` from `lib/permissions.ts` to do `instanceof` checks
  client-side, which (a) fails the build outright since that file is
  `server-only`, and (b) wouldn't have worked anyway, since a thrown
  error's class doesn't survive the Server-Action client/server
  boundary — only `.message` does. Fixed by moving the safe/unsafe split
  to the **throw site**: every raw `throw new Error(dbError.message)`
  across `lib/actions/*` and `app/api/csv-import/route.ts` now throws a
  fixed `"Something went wrong."` instead, while intentional
  `ValidationError`/`PermissionError` messages still display verbatim.
  Documented as a standing convention in `code-standards.md`. Rolled out
  across `profile-card.tsx`, `activity-feed.tsx`, `deals-panel.tsx`,
  `users-table.tsx` (replacing `sonner` toasts), and `lead-form.tsx`
  (kept its existing inline error slot, just fixed the message source).
- `npx tsc --noEmit` / `npx eslint .` / `npm run build` all clean.
  Smoke-tested via curl (couldn't drive an actual browser): `/dashboard`
  redirects when signed out (307, matching the existing admin-guard
  pattern), the sign-in page has zero "Sign up"/"Don't have an account"
  matches, `/sign-up` still returns 200.
- **Fixed the invite 404**: `inviteUser`'s `redirectUrl` was a relative
  path (`"/sign-up"`) — Clerk needs an absolute URL to build the
  invitation link against, since a dev instance has no canonical domain
  to resolve a relative path with. Added `NEXT_PUBLIC_APP_URL` (currently
  `http://localhost:3000`, will need updating to the real domain once
  deployed) and build the full URL from it; also added
  `ignoreExisting: true` so an Admin can re-send an invite (needed
  regardless of this bug — expired/bounced invites are a normal case).
- **UI polish pass** (user: "work on frontend, add some minimal styles"):
  - Active nav-link highlighting in the sidebar (`NavLink`, the one
    client-boundary piece of the otherwise-server `AppShell`).
  - `loading.tsx` (shadcn `Skeleton`, shaped like the real content) and
    `error.tsx` (shared `<RouteError/>`) for `/leads`, `/leads/[id]`,
    `/users`, `/dashboard` — closes a gap against `code-standards.md`'s
    own "every data route gets loading/error states" rule, which had
    been documented since Phase 1 but never actually implemented.
  - Empty-state polish on the Leads table (icon, friendlier copy, an
    "Add your first lead" shortcut when there's no search filter active).
  - `<BrandMark/>` (small blue lightning-bolt glyph + "NovaCRM" wordmark)
    extracted from the sidebar and reused on sign-in/sign-up/pending-setup
    screens for consistency.
  - `npx tsc --noEmit` / `npx eslint .` / `npm run build` all clean.
- **`/ponytail-audit` run and all 6 findings applied**: removed `@clerk/ui`
  and `sonner` (345 packages, since `@clerk/ui`'s theme compiled to zero
  `.cl-*` rules under this bundler anyway — confirmed dead weight, not
  just unused), deleted 3 never-imported shadcn primitives
  (`card`/`dropdown-menu`/`sheet.tsx`), deleted the dead `deleteLead`
  action (zero callers), deleted the unused `ACTIVITY_TYPES` runtime array
  (kept `ActivityType` the type, which *is* used), and collapsed
  `dashboard.ts`'s duplicate qualified/hot-prospect/meeting-done total
  computation (it was computing the same three numbers twice — once via
  count queries, once by re-deriving from a full lead scan that wasn't
  even team-filtered). ~586 lines removed, typecheck/lint/build clean.
- **Found and fixed the real font root cause** (after two rounds of
  server-side "looks fine to me" that turned out to be checking the wrong
  thing — the user pushed back with an actual screenshot + DevTools
  Network panel, which was the right call): `app/globals.css`'s
  `@theme inline` block had `--font-sans: var(--font-sans);` — a
  **circular self-reference** left over from the original shadcn scaffold
  (compare the line below it, `--font-mono: var(--font-geist-mono);`,
  which correctly points at the real next/font variable). A CSS custom
  property that references itself computes to invalid, so `font-sans`
  had been silently resolving to nothing and every browser fell back to
  its default serif — since Phase 1, the whole time, not something any
  recent session broke. This is why colors worked (they don't touch
  `--font-sans`) but text didn't. Fixed: `--font-sans: var(--font-geist-sans);`.
  Verified the full chain in the actual compiled CSS this time (`.font-sans`
  → `--font-sans` → `--font-geist-sans` → `"Geist", "Geist Fallback"`),
  not just "the word Geist appears somewhere," which is what my earlier
  (insufficient) curl checks had actually been verifying.
- User confirmed the font fix worked. Hit one self-inflicted issue: ran a
  production `npm run build` while the dev server was still running,
  which corrupted the dev server's `.next` state and produced a real
  "Internal Server Error" — fixed by killing all node processes and
  restarting `next dev` clean. **Lesson**: never run `next build` while
  `next dev` is live against the same `.next` directory; stop the dev
  server first (or just don't rebuild — `next dev` picks up changes on
  its own).
- **New pipeline statuses + full status recolor** (user-specified, one
  open assumption logged): migration `0006_add_lead_statuses.sql` adds
  `connected` (after `dnr_3`) and `not_interested` (after
  `invalid_number`) to the `lead_status` enum — exact pipeline placement
  wasn't explicitly confirmed, proceeded as a reasonable default since
  adding an enum value is low-risk to be wrong about (see
  `ui-context.md`). `status-badge.tsx` recolored per spec: DNR flattened
  to one gray (was tiered), Connected = light green, Invalid Number =
  black/white, Not Interested = red, Qualified = green, Hot Prospect =
  green (same shade as Qualified, and Meeting Done was already green too
  — flagged to the user that 3 statuses now look identical in the table).
- **Lead detail page styling**: quick-action buttons (Note/Call/Task) and
  the active Activity-feed tab are now blue/primary-filled instead of
  outline/default (the latter via `data-active:!bg-primary` override,
  `!important` needed since Tailwind v4 utility order isn't guaranteed by
  className position). Added a Previous/Next Lead button pair (gray
  secondary / blue primary) above the Deals & Payments panel —
  `getAdjacentLeadIds()` in `lib/actions/leads.ts` navigates the default
  newest-first order with `(created_at, id)` tie-breaking, since a CSV
  batch insert gives every row in that batch an identical `created_at`
  (Postgres `now()` is frozen per-transaction) and ordering by
  `created_at` alone would make navigation get stuck within a batch.
- `npx tsc --noEmit` / `npx eslint .` / `npm run build` all clean (build
  run only after confirming no dev server was live, per the lesson above).

## In Progress
- This session's status/color/navigation work is code-complete and
  build-clean but not yet confirmed in-browser by the user. Still
  separately unconfirmed from before: a real CSV import, a real invite
  round-trip end-to-end, and the read-only-lead-viewing banner.

## Next Up
1. User confirms in-browser: open a lead that isn't theirs (read-only
   banner + disabled controls), invite a real email and complete sign-up
   via the link, `/dashboard` shows sane numbers and blocks non-Admins,
   a couple of actions show the right inline feedback (including a
   deliberately-triggered failure).
2. A real CSV import (not just the synthetic-file test).
3. Set up the Clerk webhook endpoint once deployed (or tunneled via
   `clerk webhooks listen`) and fill in `CLERK_WEBHOOK_SIGNING_SECRET` —
   needed so *future* sign-ups (via invitation, now) get a `users` row
   automatically. Right now only the one bootstrapped Admin has a row.
4. Add a second test user to manually re-verify RLS: a rep should be able
   to **open** any lead but not edit one outside their scope, and should
   not be able to create a deal/log a call/etc. against a lead they don't
   own even by calling the Server Action directly (the gap this session
   closed). Also verify the deals/payments Admin+Sales-only assumption
   against a BDE account.
5. Kanban pipeline view, filter bar (rest of the original Phase 2).

## Open Questions
- **Zoom app type**: defaulted to Server-to-Server OAuth (logged in the
  plan file) — revisit with Nova Staffs' Zoom admin before Phase 3.
- **Duplicate leads**: decided against a persistent `duplicate_of` column —
  CSV import checks for an existing phone number per batch and reports a
  duplicate count in the final import summary; rows still get imported
  (flag, don't block), nothing stored permanently. Revisit only if
  leadership wants a persistent "possible duplicate" flag on the lead
  record itself, or wants to see *which* rows were flagged rather than
  just a count.
- **Lead reassignment history**: resolved — `reassignLead` now logs an
  `assigned` activity in `lead_activities` (added along with the redesign
  and visible in the lead detail timeline), so this is a real audit trail,
  not just the lightweight status-only history originally assumed.
- **Holidays/closures**: still just a note for later follow-up-date logic,
  not implemented.
- **New status placement/naming**: `connected` and `not_interested` were
  added to the pipeline per the user's color request, but their exact
  spot in the funnel and whether `hot_prospect`/`qualified`/`meeting_done`
  sharing one green shade is actually fine (vs. wanting distinct shades)
  weren't explicitly confirmed — logged as a default per the "don't
  block, log it" rule. Revisit if the user flags the funnel order or the
  three-way green collision as wrong.

## Debugging Lesson (not a code decision, but worth keeping)
When the user reports "the UI looks wrong" and my server-side checks say
otherwise, checking that a CSS *file* loads (200, right content-type) or
that a keyword like "Geist" *appears somewhere* in the compiled CSS is
**not** the same as verifying the actual variable-resolution chain a
browser evaluates. This cost two extra rounds of "have you tried a hard
refresh" before the real bug (a circular CSS variable — see Completed)
surfaced, and it only surfaced because the user pushed back with a
screenshot + DevTools Network panel instead of accepting "works on my
end." Next time a styling report doesn't match a curl-based check: ask
for a screenshot/DevTools output *first*, and when checking CSS myself,
grep for the specific `--variable: value;` pairs and follow the chain
(`.class` → custom property → the property it points at → does *that*
resolve), not just substring presence.

## Architecture Decisions
- Next.js App Router, single `(app)` route group instead of separate
  `(admin)`/`(dashboard)` groups — one shared shell, admin-only routes
  nest their own guard layout instead. See `code-standards.md`.
- `proxy.ts` (not `middleware.ts` — Next.js 16 renamed the convention) does
  only the coarse "signed in?" check; Admin-only gating happens in
  `app/(app)/users/layout.tsx` via a Supabase read, not via Clerk metadata
  synced to the edge. Simpler, one less moving part, acceptable latency
  for an 8-person internal tool.
- RLS policies were originally split one-per-role-per-team (e.g.
  `leads_select_bde_team_lead`, `leads_select_sales_rep`) rather than one
  giant boolean expression per table, so each policy mapped 1:1 to a
  sentence in `architecture.md`'s visibility matrix. Migration 0005
  collapsed `leads` SELECT to one policy (visibility is now uniform) and
  `leads` UPDATE to one policy backed by a shared `can_edit_lead()`
  function — same "one condition, one place" instinct, just expressed as
  a reusable function once the per-role SELECT distinction went away.
- **Error messages are masked at the throw site, not the catch site** —
  a thrown error's class doesn't survive the Server Action client/server
  boundary (only `.message` does), so `lib/hooks/use-action-status.ts`
  can't do `instanceof PermissionError` client-side. See
  `code-standards.md` "Error Messages."
- No CSV-import-time duplicate column on `leads` (see Open Questions).
- Supabase RLS requires Clerk configured as a Supabase "Third Party Auth"
  provider (not the deprecated JWT template flow) — see `architecture.md`.
- **Lead detail is a full page, not a drawer** — explicit reversal of the
  original `ui-context.md` decision, confirmed with the user.
- **Deals/payments tracking is now in scope** — explicit reversal of
  `project-overview.md`'s original blanket "no invoicing" exclusion,
  confirmed with the user (they want it built for real, not just as UI
  inspiration). Full payroll/commission automation is still out of scope.
- `call_logs`/`status_history`/`leads.notes`/`leads.date_called` are gone
  (migrations 0002/0003) — superseded by the unified `lead_activities`
  table. If a future session finds code referencing any of these, that
  code is stale, not a hint to recreate the old tables.
- CSV import lives at `/api/csv-import` (Route Handler, not a Server
  Action) specifically because it's called via chunked `fetch` from a
  client component rather than a single form submission — matches
  `code-standards.md`'s existing note that CSV upload processing belongs
  in a Route Handler.
- `papaparse` was a deliberate dependency addition, not a ladder
  violation — proper CSV quoting/escaping isn't "a few lines" to get
  right, and this app will process real, messy, 30k-row files.
- **Lead visibility is company-wide read / owner-only write** — another
  explicit reversal (of the original per-team-scoped SELECT), confirmed
  with the user. See `architecture.md` "Company-wide read, owner-only
  write" for the full reasoning, including the write-side gap it forced
  closing at the same time.
- **Public sign-up is off** (Clerk `sign_up_mode: "restricted"`) —
  confirmed with the user; the only way to join is now an Admin-sent
  invitation. A reversal of the implicit "anyone can sign up" default from
  Phase 1.

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
- **Session 5**: User reviewed the live app, reported the Clerk font fix
  hadn't actually taken (fixed the real bug — a `var()` reference with no
  fallback was invalidating the whole font-family declaration) and shared
  a HubSpot-style reference screenshot for a much larger redesign: minimal
  paginated/searchable list, full-page 3-column lead detail, a unified
  activity timeline, and a genuinely new Deals & Payments feature (scoped
  question asked and confirmed before building — see Architecture
  Decisions). Also flagged the org has 30k+ leads coming via CSV, which
  drove the pagination/search/index decisions. Built the whole redesign
  (2 new migrations, rewritten/new Server Actions, new list + detail-page
  UI), clean on typecheck/lint/build, one test lead seeded — not yet
  visually confirmed by the user.
- **Session 6**: User confirmed the redesign works, but the payment
  section only showed a collected/pending summary with no list of
  individual payments — added a Payment History list and removed an
  unnecessarily restrictive condition on the "Log Payment" button (see
  Completed). Then, told to proceed with CSV import (the user's own
  words: "whatever is your next step"), built it for the stated 30k+-row
  scale: a phone btree index for duplicate lookups, `papaparse` for
  correct quote/escape handling, a chunked Route Handler, and a
  mapping/progress/summary UI. Caught and fixed a real bug in my own
  header-auto-mapping logic via a synthetic-CSV smoke test before calling
  it done (exact-match guessing failed on realistic headers like "Full
  Name"; switched to alias-based substring matching) — not yet run
  against a real file by the user.
- **Session 7**: User asked for four things in one message, deferring on
  sequencing: a simpler/HubSpot-er UI, invite-only sign-up, reps able to
  see (not edit) other leads, and an Admin Dashboard with specific
  per-user metrics. Asked two clarifying questions before planning since
  two of the four were genuinely visibility/security-relevant (confirmed:
  company-wide read access, and the exact "closer" definition — first
  payment on a deal, not every payment). Built all four: migration 0005
  (visibility + the write-side gap it exposed and closed in the same
  unit), the Clerk `sign_up_mode` restriction + invite flow, the
  `/dashboard` route with two `dataviz`-skill-guided bar charts and two
  performance tables, and an inline action-feedback pattern rolled out
  app-wide. Hit and fixed a real architectural bug along the way: a
  client hook tried to `instanceof`-check custom error classes from a
  `server-only` file, which doesn't work for two independent reasons
  (fails the build; wouldn't survive the Server Action boundary even if
  it did) — moved the safe/unsafe error distinction to the server-side
  throw site instead. Everything is typecheck/lint/build-clean and
  smoke-tested via curl, but none of it has been through a real browser
  by the user yet.
- **Session 8**: User tried the invite flow — accepting it 404'd. Root
  cause: `redirectUrl: "/sign-up"` was relative, and Clerk needs an
  absolute URL to build the invitation link on a dev instance with no
  canonical domain. Fixed with a new `NEXT_PUBLIC_APP_URL` env var (will
  need updating on deploy) and `ignoreExisting: true` so the Admin could
  re-send. User said they'd expect it to resolve fully once deployed
  (correct — a real domain sidesteps the whole "what's the base URL"
  question) and moved on to asking for a general frontend/styling pass,
  deferring specifics ("minimal styles"). Interpreted as closing a
  documented-but-never-implemented gap (`loading.tsx`/`error.tsx` per
  `code-standards.md`) plus small consistency touches (active nav state,
  empty-state polish, a reusable brand mark) rather than a heavier visual
  redesign, matching the existing "simple, minimalist, HubSpot-toned"
  direction already in `ui-context.md`.
