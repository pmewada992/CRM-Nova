# Project Overview

## Project Name
NovaCRM — Nova Staffs Internal Lead & Pipeline CRM

## Overview
NovaCRM is an internal tool for Nova Staffs' sales organization. It replaces
spreadsheet-based lead tracking with a single system where BDEs (Business
Development Executives) capture job-seeker leads, Sales reps work those leads
through a call pipeline, and Team Leads / the Admin get full visibility and
control across both teams.

This is **not** the candidate-facing product (resume building, placement,
etc. described in the Nova Staffs knowledge base). It is an internal sales
tool used only by Nova Staffs staff to manage outreach to job-seeker leads.

## Goals
- Replace the current spreadsheet workflow with a single source of truth for leads.
- Give every lead a clear owner and a clear pipeline stage at all times.
- Let reps place a call to a lead in one click via Zoom Phone, with the call
  automatically logged against the lead.
- Give Admin and Team Leads a real-time dashboard with filters to spot
  stalled leads, missed follow-ups, and team performance.
- Enforce role-based **edit** rights so reps only change what they own
  (any rep can *view* every lead read-only — confirmed with the user as a
  deliberate broadening from the original "own records only" design),
  while leadership can edit everything.
- Support fast lead entry, including bulk CSV import from BDEs.

## Core User Flow
1. **BDE adds a lead** — manually (all fields) or via CSV import (Name +
   Phone required, everything else optional). The lead is stamped with
   `Lead by = <BDE name>` and starts unassigned.
2. **Admin or Sales Team Lead assigns the lead** to a Sales rep
   (`Assigned to = <Sales rep name>`).
3. **Sales rep works the lead**: clicks to call via Zoom Phone directly from
   the lead record, logs notes, updates `Status`, sets `Next follow-up` date.
4. **Lead moves through the pipeline**: DNR 1 → DNR 2 → DNR 3 / Invalid
   Number / Qualified → Interested → Hot Prospect → Meeting Done.
5. **Team Leads** (Sales Team Lead, BDE Team Lead) monitor their own team's
   full lead list and pipeline; **Admin** monitors everything, and manages
   users/roles/teams.

## Features
- Lead CRUD with all fields from the knowledge base (Name, Phone, Email,
  LinkedIn, VISA status, Graduation date, Lead by, Assigned to, Status,
  Next follow-up). Notes/call history live in the unified activity
  timeline, not a flat `notes` field (see below).
- HubSpot-style minimal list view (Name, Phone, Lead Owner, Assigned To,
  Last Activity, Status), server-side paginated and searchable by
  Name/Email/Phone — built for tens of thousands of leads, not a few
  hundred (see Scale note below).
- Lead detail is a **full page**, not a drawer: a 3-column layout —
  profile/key-info + quick actions on the left, a unified, tab-filterable
  activity timeline (All / Notes / Calls / Tasks) in the center, and a
  Deals & Payments panel on the right.
- Every meaningful change to a lead is logged as a timeline activity:
  created (implicit, from the lead's own timestamp), assigned, status
  changed, call logged, note added, task added/completed. Clicking "Call"
  logs the timestamp immediately; the rep only fills in the outcome
  afterward.
- **Deals & Payments** (placement package sold, price, services included,
  who offered it, and a payment ledger showing collected vs. pending) —
  see the amended Out of Scope note below.
- CSV bulk import for leads — only Name and Phone are mandatory; a mapping
  step lets the importer match CSV columns to CRM fields; duplicate-phone
  detection flags (not silently blocks) likely duplicates. Built for
  30,000+ row imports specifically (chunked/batched, not one request).
- Pipeline / Kanban board view grouped by Status, plus the filterable
  table view above (not built yet).
- A filter bar (by BDE, by Sales rep, by Status, by date range, by VISA
  status, by graduation date, by "follow-up due today/overdue") on the
  Leads list itself — not built yet, distinct from the Admin Dashboard
  below.
- **Admin Dashboard** (`/dashboard`, Admin-only): stat tiles (Qualified,
  Hot Prospects, Meeting Done, Total Collected), a payments-by-month chart
  and a payments-by-Sales-rep contribution chart, a Sales/BDE team
  breakdown, and two per-user performance tables — Sales (calls made,
  qualified leads, closers, total collected) and BDE (leads added,
  qualified+). "Closer" = first payment logged against a deal (later
  payments on the same deal don't count again) — confirmed with the user.
- One-click outbound calling via Zoom Phone from a lead record, with the
  call automatically logged (timestamp, duration, outcome) to that lead's
  activity timeline.
- Role-based user management: Admin can add, remove, deactivate, and manage
  users, including assigning them to a team (Sales/BDE) and a role
  (Admin, Team Lead, Rep). **Invite-only**: public self-serve sign-up is
  off — the only way to join is an Admin-sent Clerk invitation email.
- Every action (add note, log call, change status, reassign, etc.) shows
  inline loading/success/error feedback under the triggering control —
  never a raw technical error, always a friendly message or a generic
  "Something went wrong."
- Follow-up reminders surfaced on each rep's dashboard.
- Simple, modern, minimalist UI in a blue tone, HubSpot-inspired (revised
  from the original Greenhouse-ATS reference — same spirit: lots of white
  space, restrained color, information density kept low on the list view).

## Scale
Expect **30,000+ leads** imported via CSV, not a few hundred — this shapes
several decisions: the leads list is paginated (not a full unbounded
fetch), search uses Postgres trigram indexes (`pg_trgm`) rather than a
plain `LIKE` scan, and CSV import is designed for chunked/batched inserts
rather than one giant request.

## Scope

### In Scope
- Everything listed under Features above.
- Two internal teams (Sales, BDE), each with Admin / Team Lead / Rep roles.
- Zoom Phone click-to-call integration (full API-based, not just `tel:` links).
- CSV import for leads.
- Web app, responsive (desktop-first, usable on tablet/mobile browser).

### Out of Scope (v1)
- Candidate-facing features from the Nova Staffs website/knowledge base
  (resume building, ATS optimization, placement guarantees, etc.).
- Email marketing / SMS drip campaigns.
- **Payroll or commission calculation** for Nova Staffs employees stays out
  of scope. **Lightweight deal/payment tracking on a lead** (package sold,
  price, a payment ledger showing collected vs. pending) is now **in
  scope** — this is tracking what was sold to/collected from a candidate,
  not automating staff pay. Revised from the original blanket "invoicing"
  exclusion once the user confirmed this was a real requirement, not just
  UI inspiration.
- Multi-tenant support (this CRM serves one organization: Nova Staffs).
- Native mobile app (a responsive web app is sufficient for v1).
- Automatic lead assignment / round-robin (assignment is manual by Admin/Team Lead in v1).

## Success Criteria
- All 8 users (5 Sales, 3 BDE) plus Admin can log in and see only the leads
  their role/team permits.
- A BDE can import a CSV of leads with just Name + Phone and have them land
  correctly in the system.
- A Sales rep can click a button on a lead and have Zoom Phone place the
  call, with the call logged automatically.
- Admin can filter/search leads by any combination of BDE, Sales rep,
  status, date range, VISA status, and graduation date, and get correct results.
- Admin can add, remove, or change the role/team of any user without needing
  a developer to intervene, and can invite new users by email (no public
  sign-up).
- Any rep can view any lead read-only; no rep can **edit** another rep's
  lead unless they are a Team Lead or Admin.
