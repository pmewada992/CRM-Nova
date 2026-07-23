-- Redesign: unified activity timeline (replaces call_logs/status_history),
-- deals + payments (placement fee tracking), trigram search indexes.
-- See progress-tracker.md Session 4/5 for the reasoning.

create extension if not exists pg_trgm;

create index leads_name_trgm_idx on leads using gin (name gin_trgm_ops);
create index leads_phone_trgm_idx on leads using gin (phone gin_trgm_ops);
create index leads_email_trgm_idx on leads using gin (email gin_trgm_ops);

-- Both tables are empty (no leads exist yet) — safe to drop and replace
-- with a single polymorphic timeline instead of editing 0001.
drop table call_logs;
drop table status_history;

create type activity_type as enum (
  'assigned', 'status_changed', 'call', 'note', 'task'
);

create table lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id),
  type activity_type not null,
  created_by uuid not null references users (id),
  created_at timestamptz not null default now(),
  -- note / free-text context on any activity type
  body text,
  -- status_changed
  old_status lead_status,
  new_status lead_status,
  -- assigned
  old_assigned_to uuid references users (id),
  new_assigned_to uuid references users (id),
  -- call
  call_outcome text,
  call_duration_seconds integer,
  zoom_call_id text,
  -- task
  task_due_date date,
  task_completed_at timestamptz
);

create index lead_activities_lead_id_idx on lead_activities (lead_id);
create index lead_activities_type_idx on lead_activities (type);

create table deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id),
  package_name text not null,
  price numeric(10, 2) not null,
  services text,
  offer_date date not null default current_date,
  offered_by uuid not null references users (id),
  created_at timestamptz not null default now()
);

create index deals_lead_id_idx on deals (lead_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals (id),
  amount numeric(10, 2) not null,
  collected_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index payments_deal_id_idx on payments (deal_id);

alter table lead_activities enable row level security;
alter table deals enable row level security;
alter table payments enable row level security;

-- lead_activities: visible to whoever can see the parent lead (the
-- subquery re-checks leads' own RLS for the current session).
create policy lead_activities_select on lead_activities for select
  using (exists (select 1 from leads where leads.id = lead_activities.lead_id));

create policy lead_activities_insert on lead_activities for insert
  with check (created_by = (select id from current_app_user()));

-- update only by whoever logged it, or Admin — e.g. filling in a call's
-- outcome/duration after the fact, or completing a task.
create policy lead_activities_update on lead_activities for update
  using (
    created_by = (select id from current_app_user())
    or (select role from current_app_user()) = 'admin'
  );

-- deals/payments: BDEs generate leads but don't close placements, so
-- writes are Admin + Sales only (assumption flagged in progress-tracker.md,
-- revisit if that's wrong). Select still just follows lead visibility.
create policy deals_select on deals for select
  using (exists (select 1 from leads where leads.id = deals.lead_id));

create policy deals_insert on deals for insert
  with check (
    (select role from current_app_user()) = 'admin'
    or (
      (select role from current_app_user()) in ('team_lead', 'rep')
      and (select team from current_app_user()) = 'sales'
    )
  );

create policy payments_select on payments for select
  using (
    exists (
      select 1 from deals
      where deals.id = payments.deal_id
    )
  );

create policy payments_insert on payments for insert
  with check (
    (select role from current_app_user()) = 'admin'
    or (
      (select role from current_app_user()) in ('team_lead', 'rep')
      and (select team from current_app_user()) = 'sales'
    )
  );
