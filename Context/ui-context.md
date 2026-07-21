# UI Context

## Theme
Simple, modern, minimalistic — inspired by Greenhouse ATS's clean recruiting
UI, but in a blue tone instead of Greenhouse's green. Lots of white space,
clear typographic hierarchy, restrained use of color (color is used for
status/meaning, not decoration).

## Colors
Define as CSS variables / Tailwind theme extension so they're used
consistently rather than hardcoded per component.

- **Primary (blue)**: a single blue scale, e.g. `blue-50` through `blue-900`
  (Tailwind's default `blue` or a custom scale anchored on something like
  `#2563EB` for primary actions/links/active states).
- **Neutrals**: gray scale for text/borders/backgrounds (`gray-50`–`gray-900`),
  white background for main content areas.
- **Status colors** (used consistently across table, kanban, and badges):
  - `DNR 1 / DNR 2 / DNR 3` — neutral gray, slightly darkening per attempt
  - `Invalid Number` — red
  - `Qualified` — amber/yellow
  - `Interested` — blue
  - `Hot Prospect` — orange
  - `Meeting Done` — green
- Never introduce a new color for a new status without adding it here first.

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
- **App shell**: fixed left sidebar for navigation (Leads, Pipeline,
  Dashboard, Users [Admin only]), top bar with global search + quick filters
  + current user menu.
- **Leads list**: table view as default, with a view toggle to switch to a
  **Kanban pipeline view** (columns = Status values).
- **Lead detail**: opens in a right-side slide-over drawer (not a full page
  navigation) so reps can quickly move between leads while keeping list
  context — contains contact info, call button, notes, activity/call history.
- **Filters**: a filter bar above the table/kanban (BDE, Sales rep, status,
  date range, VISA status, graduation date, follow-up due) — filters are
  combinable, not mutually exclusive.
- **Add Lead / CSV Import**: modal dialog, with a tab or toggle between
  "Add manually" and "Import CSV" (CSV path includes a column-mapping step
  before confirming import).
- **Admin / Users**: simple table of users with role/team badges and
  inline actions (change role, change team, deactivate) — no separate
  heavyweight admin panel needed for v1.

## Icons
- lucide-react exclusively, sized consistently (`16px` inline with text,
  `20px` for standalone action icons, `24px` for empty states).
