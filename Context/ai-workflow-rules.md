# AI Workflow Rules

## Approach
- Read `progress-tracker.md` at the start of every session before writing
  any code — it is the current state of truth for what's done, in progress,
  and next.
- Work in small, vertical, shippable units (e.g. "lead table + RLS policy +
  basic list UI" is one unit) rather than horizontal passes across the
  whole app.
- Build in this rough order: auth/roles → schema + RLS → lead CRUD → CSV
  import → dashboard/pipeline/filters → Zoom Phone integration → polish.
  Zoom is last because it depends on a Zoom Marketplace app being created
  and authorized, which is an external, human-in-the-loop step.

## Scoping Rules
- Do not start the Zoom Phone integration until: users/roles/teams, lead
  CRUD, and RLS policies are working end-to-end. Calling is the highest-risk,
  most external-dependency-heavy piece — de-risk everything else first.
- Do not introduce a new table, enum value, or role/team concept without
  first checking whether it changes `architecture.md` — if it does, update
  that file in the same unit of work.
- Do not silently expand scope (e.g. adding email campaigns, SMS, round-robin
  auto-assignment) — these are explicitly out of scope per
  `project-overview.md` unless the user asks for them.

## When to Split Work
Split a task into separate units when it touches more than one of:
schema/migration, server logic (API/Server Actions + RLS), and UI.
Suggested split:
1. Migration (schema + RLS policy) — reviewed/applied first.
2. Server logic (Route Handler / Server Action + permission checks).
3. UI (component + page wiring).
Each unit should be independently testable before moving to the next.

## Handling Missing Requirements
- If a requirement is ambiguous or undecided, make the most reasonable
  assumption, implement it, and log the assumption explicitly under
  **Open Questions** in `progress-tracker.md` — do not block on it.
- Do not silently guess on anything that affects data visibility/security
  (who can see or edit what) — these should be flagged clearly even if you
  proceed with a default, since a wrong guess here is a data leak, not just
  a UX nit.

## Protected Files
- Never edit an already-applied file under `/supabase/migrations` — create
  a new migration instead. Migrations are append-only history.
- Never modify RLS policies without explicitly calling it out in
  `progress-tracker.md` under "Architecture Decisions" — access control
  changes should always be visible, never a silent side effect of an
  unrelated feature.
- Never commit `.env*` files, Clerk secret keys, Supabase service role key,
  or Zoom OAuth client secret/tokens.

## Keeping Docs in Sync
- Any schema change → update `architecture.md` (Storage Model section).
- Any new role/permission rule → update `architecture.md` (Auth and Access
  Model) and note it in `progress-tracker.md`.
- Any new reusable UI pattern (e.g. a new card style, a new filter
  component) → add it to `ui-context.md` so future units reuse it instead
  of inventing a new pattern.
- These docs are updated in the same commit/session as the code change that
  motivated them — not "later."

## Before Moving to the Next Unit
- Typecheck and lint pass.
- Any new/changed RLS policy has been manually reasoned through for at
  least the three roles (Admin, Team Lead, Rep) against both teams.
- The unit matches what's actually in scope per `project-overview.md`.
- `progress-tracker.md` is updated: move the item from "In Progress" to
  "Completed," add whatever's now unblocked to "Next Up," and note any new
  open questions or architecture decisions made along the way.
