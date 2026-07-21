-- NovaCRM initial schema: users, leads, call_logs, status_history + RLS.
-- Roles: admin, team_lead, rep. Teams: sales, bde.
-- Visibility rules per architecture.md "Auth and Access Model".

create type role as enum ('admin', 'team_lead', 'rep');
create type team as enum ('sales', 'bde');
create type lead_status as enum (
  'dnr_1', 'dnr_2', 'dnr_3', 'invalid_number',
  'qualified', 'interested', 'hot_prospect', 'meeting_done'
);

create table users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  name text not null,
  email text not null,
  role role,
  team team,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  linkedin text,
  visa_status text,
  graduation_date date,
  lead_by uuid references users (id),
  assigned_to uuid references users (id),
  status lead_status not null default 'dnr_1',
  notes text,
  date_called timestamptz,
  next_followup date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table call_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id),
  caller_id uuid not null references users (id),
  zoom_call_id text,
  started_at timestamptz not null default now(),
  duration_seconds integer,
  outcome text
);

create table status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id),
  old_status lead_status,
  new_status lead_status not null,
  changed_by uuid not null references users (id),
  changed_at timestamptz not null default now()
);

create index leads_lead_by_idx on leads (lead_by);
create index leads_assigned_to_idx on leads (assigned_to);
create index leads_status_idx on leads (status);
create index call_logs_lead_id_idx on call_logs (lead_id);
create index status_history_lead_id_idx on status_history (lead_id);

-- Looks up the calling user's row from their Clerk session (set by the
-- Supabase JWT `sub` claim, which Clerk populates with the Clerk user id).
create function current_app_user()
returns users
language sql
stable
security definer
set search_path = public
as $$
  select * from users where clerk_user_id = auth.jwt() ->> 'sub' limit 1;
$$;

alter table users enable row level security;
alter table leads enable row level security;
alter table call_logs enable row level security;
alter table status_history enable row level security;

-- users: admin has full access; everyone can read their own row (needed to
-- resolve their own role/team client-side) and their team's roster.
create policy users_select on users for select
  using (
    (select role from current_app_user()) = 'admin'
    or clerk_user_id = auth.jwt() ->> 'sub'
    or team = (select team from current_app_user())
  );

create policy users_insert on users for insert
  with check ((select role from current_app_user()) = 'admin');

create policy users_update on users for update
  using ((select role from current_app_user()) = 'admin');

create policy users_delete on users for delete
  using ((select role from current_app_user()) = 'admin');

-- leads: admin sees all. team_lead sees every lead belonging to their team
-- (bde -> anything they added; sales -> anything assigned to a Sales rep,
-- plus unassigned leads awaiting assignment). rep sees only their own
-- records (bde -> lead_by = me; sales -> assigned_to = me).
create policy leads_select_admin on leads for select
  using ((select role from current_app_user()) = 'admin');

create policy leads_select_bde_team_lead on leads for select
  using (
    (select role from current_app_user()) = 'team_lead'
    and (select team from current_app_user()) = 'bde'
    and lead_by in (select id from users where team = 'bde')
  );

create policy leads_select_sales_team_lead on leads for select
  using (
    (select role from current_app_user()) = 'team_lead'
    and (select team from current_app_user()) = 'sales'
    and (
      assigned_to in (select id from users where team = 'sales')
      or assigned_to is null
    )
  );

create policy leads_select_bde_rep on leads for select
  using (
    (select role from current_app_user()) = 'rep'
    and (select team from current_app_user()) = 'bde'
    and lead_by = (select id from current_app_user())
  );

create policy leads_select_sales_rep on leads for select
  using (
    (select role from current_app_user()) = 'rep'
    and (select team from current_app_user()) = 'sales'
    and assigned_to = (select id from current_app_user())
  );

create policy leads_insert on leads for insert
  with check (
    (select role from current_app_user()) in ('admin', 'team_lead', 'rep')
  );

-- update: mirrors the select policies, with one added invariant — a BDE
-- rep may only edit a lead up to the point it gets assigned (per
-- architecture.md "Invariants": contact fields are BDE-owned pre-assignment,
-- pipeline fields are Sales-owned after).
create policy leads_update_admin on leads for update
  using ((select role from current_app_user()) = 'admin');

create policy leads_update_bde_team_lead on leads for update
  using (
    (select role from current_app_user()) = 'team_lead'
    and (select team from current_app_user()) = 'bde'
    and lead_by in (select id from users where team = 'bde')
  );

create policy leads_update_sales_team_lead on leads for update
  using (
    (select role from current_app_user()) = 'team_lead'
    and (select team from current_app_user()) = 'sales'
    and (
      assigned_to in (select id from users where team = 'sales')
      or assigned_to is null
    )
  );

create policy leads_update_bde_rep on leads for update
  using (
    (select role from current_app_user()) = 'rep'
    and (select team from current_app_user()) = 'bde'
    and lead_by = (select id from current_app_user())
    and assigned_to is null
  );

create policy leads_update_sales_rep on leads for update
  using (
    (select role from current_app_user()) = 'rep'
    and (select team from current_app_user()) = 'sales'
    and assigned_to = (select id from current_app_user())
  );

create policy leads_delete on leads for delete
  using ((select role from current_app_user()) = 'admin');

-- call_logs: visible to whoever can see the parent lead.
create policy call_logs_select on call_logs for select
  using (
    exists (
      select 1 from leads
      where leads.id = call_logs.lead_id
    )
  );

create policy call_logs_insert on call_logs for insert
  with check (caller_id = (select id from current_app_user()));

-- status_history: same visibility as the parent lead; insert-only, never
-- edited or deleted (audit trail).
create policy status_history_select on status_history for select
  using (
    exists (
      select 1 from leads
      where leads.id = status_history.lead_id
    )
  );

create policy status_history_insert on status_history for insert
  with check (changed_by = (select id from current_app_user()));
