# Architecture Context

## Stack
- **Framework**: Next.js (App Router), TypeScript
- **Database**: Supabase (Postgres), accessed via the Supabase JS client
- **Auth / Identity**: Clerk (handles login, sessions, invites)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Calling**: Zoom Phone REST API (full API-based click-to-call, OAuth app
  registered in the Zoom Marketplace)
- **Hosting**: Netlify (`@netlify/plugin-nextjs`), deployed from GitHub —
  superseded the original "Vercel assumed default" placeholder once the
  user actually chose Netlify
- **Icons**: lucide-react

## System Boundaries
- **Clerk** is the source of truth for who can log in and their credentials/
  sessions. Clerk does **not** store business roles (Admin/Team Lead/Rep) or
  team assignment — that lives in Supabase.
- **Supabase** is the source of truth for all application data: users
  (mirrored from Clerk), teams, leads, call logs, status history.
- **Zoom** is the source of truth for call execution and call metadata only
  (call ID, duration, recording link if enabled). It is never the source of
  truth for lead data — call outcomes get written back into Supabase.
- A Clerk webhook (`user.created` / `user.updated` / `user.deleted`) keeps a
  mirrored `users` row in Supabase in sync (id, clerk_user_id, name, email).
  Role and team are set inside NovaCRM by the Admin, not by Clerk. The
  endpoint (`https://novastaffscrm.netlify.app/api/webhooks/clerk`,
  registered manually in Clerk Dashboard > Webhooks — this step isn't
  scriptable via the Clerk CLI, the signing secret is a one-time reveal in
  the browser) verifies requests with `CLERK_WEBHOOK_SIGNING_SECRET`. This
  var was missing entirely for a stretch after the Netlify deploy, so
  `user.created` silently never linked new sign-ups to their `users` row —
  an Admin could assign a role to a pending invite row forever and the
  real signed-in user would still resolve to nobody. Fixed by registering
  the endpoint and setting the secret; two already-stuck real users were
  manually re-linked by clerk_user_id as a one-time repair.
- **Organizations are disabled** (`clerk disable orgs`) — this is a
  single-org internal tool, so Clerk's org-creation/selection step (which
  is on by default with `force_organization_selection`) has no reason to
  show during sign-up. `first_name`/`last_name` are set `required: true`
  on the Clerk instance instead, so `<SignUp/>` collects a real name
  natively — no custom sign-up form needed for either change.
- **Invite-only**: Clerk's `auth_access_control.sign_up_mode` is
  `"restricted"` (was `"public"`) — public self-serve sign-up is off.
  Admin invites someone via `inviteUser()` (`lib/actions/users.ts`, uses
  `clerkClient().invitations.createInvitation`); the emailed link carries
  an invitation ticket that lets sign-up proceed at `/sign-up` despite
  restricted mode. `<SignIn/>` automatically stops rendering its "Sign up"
  footer link once restricted mode is on — verified in-app, not assumed.
- **Pending invite rows**: `inviteUser()` also inserts a placeholder
  `users` row (`clerk_user_id: null`, migration `0009` made this column
  nullable) immediately after the Clerk invitation sends, so the Admin can
  pre-assign role/team before the person actually signs up. The Clerk
  webhook's `user.created` handler claims that row by email match (`update
  ... where email = ? and clerk_user_id is null`) instead of inserting a
  duplicate, falling back to a fresh insert only if no pending row exists.
  A pending row shows as "Invite Sent" in the Users table with a "Remove"
  action in place of the usual Deactivate control (`removeUser()` — guarded
  by `clerk_user_id is null` so it can never delete a real, signed-up
  user).
- RLS policies read the caller's identity via `auth.jwt() ->> 'sub'`, which
  only resolves to the Clerk user id once **Clerk is added as a Supabase
  Third Party Auth provider** (Supabase dashboard > Authentication > Sign In
  / Providers). This is a required one-time manual setup step per
  environment — without it every RLS policy denies access. The app's
  Supabase client (`lib/supabase.ts`) forwards the Clerk session token via
  the `accessToken` option on `createClient`, not the deprecated JWT
  template approach.

## Storage Model
- `users` — clerk_user_id (**nullable**, migration `0009` — see "Pending
  invite rows" below), name, email, role (`admin` | `team_lead` | `rep`),
  team (`sales` | `bde` | null for Admin), active (boolean), created_at
- `leads` — name, phone, email, linkedin, visa_status, graduation_date,
  lead_by (FK → users, the BDE who added it), assigned_to (FK → users,
  nullable until assigned), status (enum: `new_lead` (default), `dnr_1`,
  `dnr_2`, `dnr_3`, `connected`, `invalid_number`, `not_interested`,
  `qualified`, `interested`, `hot_prospect`, `meeting_done`, `enrolled` —
  migrations `0006`–`0008`), next_followup, created_at, updated_at. Has GIN trigram
  indexes (`pg_trgm`) on `name`, `phone`, `email` for fast partial-match
  search at 30k+ row scale (plain `LIKE`/`ILIKE` doesn't use a btree index
  for `%term%` patterns), plus a plain btree index on `phone` (migration
  0004) for the exact-match `IN (...)` lookups CSV import's duplicate
  check does — the trigram index is tuned for `%term%`, not equality. No
  `notes`/`date_called` columns — superseded by
  `lead_activities` (dropped in migration 0003; see below).
- `lead_activities` — the unified, tab-filterable activity timeline shown
  on the lead detail page. One polymorphic table rather than several
  narrow ones: `lead_id`, `type` (enum: `assigned` | `status_changed` |
  `call` | `note` | `task`), `created_by`, `created_at`, `body` (free text,
  used by note/call), `old_status`/`new_status` (status_changed),
  `old_assigned_to`/`new_assigned_to` (assigned), `call_outcome`/
  `call_duration_seconds`/`zoom_call_id` (call), `task_due_date`/
  `task_completed_at` (task). Replaces the original separate `call_logs`
  and `status_history` tables (dropped in migration 0002) — a lead's
  "created" event isn't stored as a row here, it's derived from
  `leads.created_at` directly.
- `deals` — `lead_id` (FK), `package_name`, `price`, `services` (free
  text), `offer_date`, `offered_by` (FK → users). A placement package sold
  to/offered to the candidate.
- `payments` — `deal_id` (FK), `amount`, `collected_at`. A ledger (not a
  single running total) so partial/multiple payments over time are
  representable; collected/pending is computed as `sum(payments.amount)`
  vs. `deals.price`.

Single-organization system in v1 — no `organizations` table needed unless
Nova Staffs plans to onboard other companies onto this CRM later.

## Auth and Access Model
Roles: `admin`, `team_lead`, `rep`
Teams: `sales`, `bde`

Visibility rules (revised — see "Company-wide read, owner-only write"
below for the current model; this list is what still differs by role):
- **Admin**: full read/write on all leads, all users, all teams. Only Admin
  can add, remove, or deactivate a user, and only Admin can change a user's
  role or team.
- **Team Lead** (per team): can **edit** every lead belonging to their own
  team — a Sales Team Lead every lead assigned to any Sales rep (plus
  unassigned leads awaiting assignment); a BDE Team Lead every lead added
  by any BDE rep. Cannot manage users.
- **Rep**: can **edit** only their own leads.
  - **BDE rep**: `lead_by = me`, and only pre-assignment.
  - **Sales rep**: `assigned_to = me`.
- Today, the Admin also personally holds the Team Lead permissions for both
  teams. The role model must support promoting a specific rep to Team Lead
  for their team later without a schema change — `role` is just a value on
  the `users` row, not hardcoded to a person.
- **Bootstrap**: every new user lands with `role = null, team = null`
  ("pending setup") until an Admin assigns them — but the very first Admin
  has nobody to do that for them. That first promotion is a one-time manual
  `update users set role = 'admin' where email = '...'` in the Supabase SQL
  editor (documented in `web/README.md`), not an in-app flow.
- **Deals/payments**: write access (`deals`/`payments` insert) is Admin +
  Sales (`team_lead`/`rep` on the `sales` team) — and, since the visibility
  change below, **only on a lead that Sales member can actually edit**, not
  any Sales-owned lead. Read access follows the same chain as the parent
  lead.

### Company-wide read, owner-only write (migration 0005)
Confirmed with the user: **any provisioned user (any role, any team) can
read every lead** — not just their own team's, as the bullets above once
scoped it. Only *editing* stays restricted to the rules above. In effect:
Leads SELECT is now a single policy (`role is not null`); everything else
(who can UPDATE a lead, INSERT a `lead_activities`/`deals`/`payments` row)
still follows the per-role/team rules, enforced via one shared
`can_edit_lead(lead_id)` SQL function (and its `canEditLead()` TypeScript
mirror in `lib/permissions.ts`, used to hide/disable edit affordances in
the UI for leads the viewer can only browse).

**Why this needed a companion fix, not just a SELECT change**: the
`lead_activities`/`deals`/`payments` INSERT policies only ever checked
`created_by = me`, never that the caller had edit rights on the target
lead. That was harmless while SELECT was owner-scoped (no UI path to
discover another lead's id) — but becomes a real gap once every lead is
readable, since anyone could otherwise log a call or add a deal on any
lead by calling the Server Action directly with an arbitrary `lead_id`.
Migration 0005 adds `can_edit_lead(lead_id)` to those `with check` clauses
in the same unit, not as a follow-up.

Enforcement happens in two layers:
1. **Application layer** — Next.js Server Actions / Route Handlers check
   the caller's role/team (via Clerk session → Supabase `users` row) before
   returning or mutating data.
2. **Database layer (RLS)** — Supabase Row Level Security policies mirror
   the same rules, so no client-side or misconfigured server code can leak
   another rep's leads. RLS is the safety net, not the only check.

## Invariants
- Every lead row must have a non-null `name` and `phone` — no lead can be
  created (manually or via CSV) without both.
- Only Admin can create, deactivate, or delete a user account.
- Only Admin and the relevant Team Lead can set/change `assigned_to` on a lead.
- A BDE rep can edit a lead's contact fields only until it has been assigned
  to a Sales rep; after assignment, pipeline fields (`status`,
  `next_followup`, and all activity-timeline entries) are owned by the
  assigned Sales rep (plus their Team Lead and Admin).
- A rep can read any lead (see "Company-wide read" above) but can never
  **edit** one outside their own scope (`lead_by = me` for BDE,
  `assigned_to = me` for Sales), nor insert an activity/deal/payment
  against one — enforced by RLS via `can_edit_lead()`, not just UI hiding.
- Every placed call must produce a `lead_activities` row (`type = 'call'`)
  — the Zoom integration should never silently fail to log a call outcome.
  A call activity is inserted the instant the call is initiated (timestamp
  captured immediately); outcome/duration are filled in afterward, they
  don't gate the row's existence.
- Zoom credentials/tokens are never exposed to the client; all Zoom API
  calls are made server-side (Route Handlers), with the browser only
  triggering a server action that talks to Zoom.
