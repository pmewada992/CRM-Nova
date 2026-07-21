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
- Enforce strict, role-based visibility so reps only see what they own,
  while leadership sees everything.
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
  Notes, Date called, Next follow-up).
- CSV bulk import for leads — only Name and Phone are mandatory; a mapping
  step lets the importer match CSV columns to CRM fields; duplicate-phone
  detection flags (not silently blocks) likely duplicates.
- Pipeline / Kanban board view grouped by Status, plus a filterable table view.
- Dashboard with filters: by BDE, by Sales rep, by Status, by date range,
  by VISA status, by graduation date, by "follow-up due today/overdue".
- One-click outbound calling via Zoom Phone from a lead record, with the
  call automatically logged (timestamp, duration, outcome) to that lead's
  activity history.
- Role-based user management: Admin can add, remove, deactivate, and manage
  users, including assigning them to a team (Sales/BDE) and a role
  (Admin, Team Lead, Rep).
- Per-lead notes and a chronological activity/call history.
- Follow-up reminders surfaced on each rep's dashboard.
- Simple, modern, minimal UI in a blue tone, in the spirit of Greenhouse ATS.

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
- Payroll, invoicing, or commission calculation.
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
  a developer to intervene.
- No rep can see another rep's leads unless they are a Team Lead or Admin.
