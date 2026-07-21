# Architecture Context

## Stack
- **Framework**: Next.js (App Router), TypeScript
- **Database**: Supabase (Postgres), accessed via the Supabase JS client
- **Auth / Identity**: Clerk (handles login, sessions, invites)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Calling**: Zoom Phone REST API (full API-based click-to-call, OAuth app
  registered in the Zoom Marketplace)
- **Hosting**: Vercel (assumed default; revisit if you have a preference)
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
  Role and team are set inside NovaCRM by the Admin, not by Clerk.
- RLS policies read the caller's identity via `auth.jwt() ->> 'sub'`, which
  only resolves to the Clerk user id once **Clerk is added as a Supabase
  Third Party Auth provider** (Supabase dashboard > Authentication > Sign In
  / Providers). This is a required one-time manual setup step per
  environment — without it every RLS policy denies access. The app's
  Supabase client (`lib/supabase.ts`) forwards the Clerk session token via
  the `accessToken` option on `createClient`, not the deprecated JWT
  template approach.

## Storage Model
Core tables (names indicative, finalize during schema design):

- `users` — clerk_user_id, name, email, role (`admin` | `team_lead` | `rep`),
  team (`sales` | `bde` | null for Admin), active (boolean), created_at
- `leads` — name, phone, email, linkedin, visa_status, graduation_date,
  lead_by (FK → users, the BDE who added it), assigned_to (FK → users,
  nullable until assigned), status (enum: `dnr_1`, `dnr_2`, `dnr_3`,
  `invalid_number`, `qualified`, `interested`, `hot_prospect`,
  `meeting_done`), notes (text or separate notes table), date_called,
  next_followup, created_at, updated_at
- `call_logs` — lead_id (FK), caller_id (FK → users), zoom_call_id,
  started_at, duration_seconds, outcome/notes
- `status_history` (optional but recommended) — lead_id, old_status,
  new_status, changed_by, changed_at — gives Team Leads/Admin an audit trail
  without cluttering the main `notes` field

Single-organization system in v1 — no `organizations` table needed unless
Nova Staffs plans to onboard other companies onto this CRM later.

## Auth and Access Model
Roles: `admin`, `team_lead`, `rep`
Teams: `sales`, `bde`

Visibility rules:
- **Admin**: full read/write on all leads, all users, all teams. Only Admin
  can add, remove, or deactivate a user, and only Admin can change a user's
  role or team.
- **Team Lead** (per team): can see and manage **all leads belonging to
  their own team** — a Sales Team Lead sees every lead assigned to any
  Sales rep (plus unassigned leads awaiting assignment); a BDE Team Lead
  sees every lead added by any BDE rep. A Team Lead cannot see the other
  team's leads and cannot manage users.
- **Rep**: strict "own records only" visibility.
  - **BDE rep**: sees only the leads they personally added (`lead_by = me`).
  - **Sales rep**: sees only the leads assigned to them (`assigned_to = me`).
- Today, the Admin also personally holds the Team Lead permissions for both
  teams. The role model must support promoting a specific rep to Team Lead
  for their team later without a schema change — `role` is just a value on
  the `users` row, not hardcoded to a person.
- **Bootstrap**: every new user lands with `role = null, team = null`
  ("pending setup") until an Admin assigns them — but the very first Admin
  has nobody to do that for them. That first promotion is a one-time manual
  `update users set role = 'admin' where email = '...'` in the Supabase SQL
  editor (documented in `web/README.md`), not an in-app flow.

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
  to a Sales rep; after assignment, pipeline fields (`status`, `notes`,
  `date_called`, `next_followup`) are owned by the assigned Sales rep (plus
  their Team Lead and Admin).
- A rep can never query or receive leads outside their own scope
  (`lead_by = me` for BDE, `assigned_to = me` for Sales) — enforced by RLS,
  not just UI filtering.
- Every placed call must produce a `call_logs` row — the Zoom integration
  should never silently fail to log a call outcome.
- Zoom credentials/tokens are never exposed to the client; all Zoom API
  calls are made server-side (Route Handlers), with the browser only
  triggering a server action that talks to Zoom.
