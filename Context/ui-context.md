# UI Context

## Theme
Simple, modern, minimalistic — revised reference point is **HubSpot CRM**
in a blue tone (originally scoped against Greenhouse ATS; the user later
pointed at HubSpot specifically for the list/detail layout, same "lots of
white space, low-density list view" spirit either way). Clear typographic
hierarchy, restrained use of color (color is used for status/meaning, not
decoration). List views in particular should show only the essential
columns — resist the urge to add more columns just because a field
exists; that's what the detail page is for.

## Colors
Define as CSS variables / Tailwind theme extension so they're used
consistently rather than hardcoded per component.

- **Primary (blue)**: a single blue scale, e.g. `blue-50` through `blue-900`
  (Tailwind's default `blue` or a custom scale anchored on something like
  `#2563EB` for primary actions/links/active states).
- **Neutrals**: gray scale for text/borders/backgrounds (`gray-50`–`gray-900`),
  white background for main content areas.
- **Status colors** (used consistently across table, kanban, and badges;
  revised per the user's explicit color spec — supersedes the original
  amber/orange/darkening-gray scheme):
  - `DNR 1 / DNR 2 / DNR 3` — flat gray (one shade, not tiered)
  - `Connected` — light green shade (lighter than Qualified/Hot Prospect)
  - `Invalid Number` — black background, white text
  - `Not Interested` — red
  - `Qualified` — green
  - `Interested` — blue (unchanged, not part of the revision)
  - `Hot Prospect` — green (same shade as Qualified per the literal spec —
    flagged to the user that this makes the two indistinguishable at a
    glance in the table; revisit with a distinct shade if that's an issue)
  - `Meeting Done` — green (unchanged, not part of the revision — now a
    third status sharing this shade, same flag as above)
  - `New Lead` — flat slate/gray (`bg-slate-100 text-slate-700`), the
    default status on creation (manual or CSV) — visually distinct from
    the DNR gray so a fresh lead doesn't read as "already attempted"
  - `Enrolled` — solid emerald (`bg-emerald-600 text-white`), the funnel's
    terminal success state, placed after `Meeting Done`
- Never introduce a new color for a new status without adding it here first.
- **Pipeline statuses**: `Connected` and `Not Interested` were added
  (migration `0006_add_lead_statuses.sql`) alongside a color-scheme
  request — not explicitly confirmed where exactly they sit in the funnel,
  proceeded as a logged default (`Connected` after the DNR attempts,
  `Not Interested` as a terminal outcome alongside `Invalid Number`) since
  adding an enum value is low-risk to be wrong about. See
  `progress-tracker.md`.

## Typography
- Sans-serif throughout — Inter (or similar geometric/humanist sans).
- A small, deliberate type scale: e.g. `text-xs` (labels/metadata),
  `text-sm` (body/table), `text-base` (default), `text-lg`/`text-xl`
  (section headers), `text-2xl` (page titles). Avoid introducing sizes
  outside this scale.
- Medium/semibold weight for headers and key numbers (dashboard stats),
  regular weight for body text.

## Border Radius
- Consistent, moderate rounding — not sharp corners, not pill-shaped.
- Cards/panels: `rounded-lg` (~8px).
- Buttons, inputs, badges: `rounded-md` (~6px).
- Avatars: fully rounded (`rounded-full`).

## Component Library
- shadcn/ui as the base primitive layer (buttons, inputs, dialogs, dropdowns,
  tables, tabs, badges), styled with the blue theme above.
- lucide-react for all icons — no mixed icon sets.

## Layout Patterns
- **App shell**: fixed left sidebar for navigation — Dashboard (Admin
  only, first item), Leads, Pipeline (not built yet), Users (Admin only).
  Top bar with current user menu. Global search currently lives on the
  Leads page itself, not the shared top bar — there's nothing else to
  search yet; promote it once a second searchable area exists.
- **Leads list**: minimal HubSpot-style columns only — Name, Phone, Lead
  Owner (BDE), Assigned To, Last Activity, Status. Server-side paginated
  (not a full unbounded fetch — the org has 30k+ leads) with a search box
  matching Name/Email/Phone. A view toggle to a **Kanban pipeline view**
  (columns = Status values) is still planned but not built yet.
- **Lead detail is a full page** (`/leads/[id]`), **not a drawer** —
  reversed from the original slide-over decision once the user confirmed
  they want to navigate to a dedicated page (their HubSpot-style reference
  screenshot showed this explicitly). Three-column layout:
  - **Left** — profile card: avatar/initials, name, **blue** (primary,
    filled) quick-action buttons (Note / Call / Task — "Call" logs a call
    activity immediately), key info (Lead Owner, Assigned To, Phone,
    Email, LinkedIn, VISA status, Graduation date), a Status dropdown, an
    Edit button.
  - **Center** — a unified activity timeline behind tabs (All Activities /
    Notes / Calls / Tasks — **selected tab is blue/primary-filled**, not
    the shadcn default white/background), newest first, with a composer
    at the top (a note composer, or a task composer with a due date,
    depending on the active tab). Every meaningful change appears here:
    assignment, status change, call logged, note added, task
    added/completed.
  - **Right** — a "Previous" (gray/secondary) / "Next Lead" (blue/primary)
    button pair above the Deals & Payments panel, navigating within the
    default newest-first lead order (ties broken by id, since a CSV batch
    insert gives every row in that batch an identical `created_at`).
    Below that: Deals & Payments — package/price/services/offer date per
    deal, each with a collected/pending payment summary + progress bar
    and a "Log Payment" action.
  This 3-column profile/activity/side-panel pattern is the reusable
  template for any future full-page detail view in this app, not a
  one-off for leads specifically.
  - **Read-only viewing**: since any provisioned user can now read any
    lead (see `architecture.md` "Company-wide read"), a viewer who can't
    edit the current lead sees an amber banner ("You're viewing this lead
    read-only...") and every edit affordance — status dropdown, reassign,
    Edit button, quick actions, composers, Add Deal/Log Payment — is
    hidden or disabled rather than present-but-silently-failing.
- **Admin Dashboard** (`/dashboard`, Admin only): stat tiles (Qualified /
  Hot Prospects / Meeting Done / Total Collected) at the top, two bar
  charts (payments collected by month, payment contribution by Sales rep
  — plain CSS bars per the `dataviz` skill's mark specs: ≤24px thick, 4px
  rounded tops, uniform brand-blue since these are magnitude-not-identity
  charts), a two-card team breakdown (Sales pipeline totals / BDE leads
  added), and two performance tables (Sales: calls made, qualified leads,
  closers, total collected; BDE: leads added, qualified+). "Closer" =
  a deal with at least one payment logged, credited to `offered_by` —
  confirmed with the user; a second/third payment on the same deal
  doesn't count again.
- **Inline action feedback**: every action button shows a loading state
  while pending, then a small green success line or a red (always
  friendly, never a raw error) line directly under the button —
  `useActionStatus()` + `<ActionFeedback/>`, see `code-standards.md`. Not
  a toast — the feedback sits with the control that triggered it.
- **Loading/error states**: every route that fetches data has a
  `loading.tsx` (shadcn `Skeleton` blocks shaped like the real content —
  table rows, stat tiles, the 3-column detail layout) and an `error.tsx`
  (shared `<RouteError/>`: icon, one-line message, "Try again" button that
  calls `reset()`) — per the standing `code-standards.md` rule, actually
  implemented now rather than just documented.
- **Brand mark**: `<BrandMark/>` (`components/layout/brand-mark.tsx`) — a
  small blue-square lightning-bolt glyph + "NovaCRM" wordmark, `size="lg"`
  centered on auth/pending-setup screens, default size in the sidebar.
  Reuse it rather than re-inlining the logo mark.
- **Active nav state**: sidebar links use `<NavLink/>`
  (`components/layout/nav-link.tsx`, the one client-boundary piece of the
  otherwise-server `AppShell`) — highlights via `bg-sidebar-accent` when
  the current path matches or is nested under the link's `href`.
- **Filters**: a filter bar above the table/kanban (BDE, Sales rep, status,
  date range, VISA status, graduation date, follow-up due) — filters are
  combinable, not mutually exclusive. Not built yet (still Phase 2).
- **Add Lead / CSV Import**: modal dialog, with a tab or toggle between
  "Add manually" and "Import CSV" (CSV path includes a column-mapping step
  before confirming import).
- **Admin / Users**: simple table of users with role/team badges and
  inline actions (change role, change team, deactivate) — no separate
  heavyweight admin panel needed for v1. An "Invite User" button (email
  input) sends a Clerk invitation — the only way to join now that public
  sign-up is off (see `architecture.md` "Invite-only"). A just-invited
  user shows a blue "Invite Sent" status badge and a "Remove" action
  instead of the usual Active/Deactivate controls, until they actually
  sign up (see `architecture.md` "Pending invite rows").

## Icons
- lucide-react exclusively, sized consistently (`16px` inline with text,
  `20px` for standalone action icons, `24px` for empty states).
