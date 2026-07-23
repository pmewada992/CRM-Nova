-- Broadens lead visibility to "everyone can read, only owners can write"
-- (confirmed with the user), and closes a latent gap this exposes: the
-- activities/deals/payments INSERT policies only ever checked
-- `created_by = me`, never that the caller actually owns the target lead.
-- That was harmless while SELECT was still owner-scoped (you couldn't
-- discover another lead's id through the UI), but isn't anymore.

-- Mirrors the union of the 5 leads_update_* policies from 0001_init.sql.
create function can_edit_lead(check_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from leads l
    where l.id = check_lead_id
    and (
      (select role from current_app_user()) = 'admin'
      or (
        (select role from current_app_user()) = 'team_lead'
        and (
          ((select team from current_app_user()) = 'bde'
            and l.lead_by in (select id from users where team = 'bde'))
          or ((select team from current_app_user()) = 'sales'
            and (l.assigned_to in (select id from users where team = 'sales')
              or l.assigned_to is null))
        )
      )
      or (
        (select role from current_app_user()) = 'rep'
        and (
          ((select team from current_app_user()) = 'bde'
            and l.lead_by = (select id from current_app_user())
            and l.assigned_to is null)
          or ((select team from current_app_user()) = 'sales'
            and l.assigned_to = (select id from current_app_user()))
        )
      )
    )
  );
$$;

drop policy leads_select_admin on leads;
drop policy leads_select_bde_team_lead on leads;
drop policy leads_select_sales_team_lead on leads;
drop policy leads_select_bde_rep on leads;
drop policy leads_select_sales_rep on leads;

-- Any provisioned (role-assigned) user can read every lead. Editing stays
-- restricted — see leads_update below.
create policy leads_select_any_provisioned_user on leads for select
  using ((select role from current_app_user()) is not null);

drop policy leads_update_admin on leads;
drop policy leads_update_bde_team_lead on leads;
drop policy leads_update_sales_team_lead on leads;
drop policy leads_update_bde_rep on leads;
drop policy leads_update_sales_rep on leads;

create policy leads_update on leads for update
  using (can_edit_lead(id));

drop policy lead_activities_insert on lead_activities;
create policy lead_activities_insert on lead_activities for insert
  with check (
    created_by = (select id from current_app_user())
    and can_edit_lead(lead_id)
  );

drop policy deals_insert on deals;
create policy deals_insert on deals for insert
  with check (
    (select role from current_app_user()) = 'admin'
    or (
      (select role from current_app_user()) in ('team_lead', 'rep')
      and (select team from current_app_user()) = 'sales'
      and can_edit_lead(lead_id)
    )
  );

drop policy payments_insert on payments;
create policy payments_insert on payments for insert
  with check (
    (select role from current_app_user()) = 'admin'
    or (
      (select role from current_app_user()) in ('team_lead', 'rep')
      and (select team from current_app_user()) = 'sales'
      and can_edit_lead((select lead_id from deals where deals.id = payments.deal_id))
    )
  );
