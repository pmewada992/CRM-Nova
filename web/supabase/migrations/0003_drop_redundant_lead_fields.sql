-- `notes` is superseded by lead_activities (type = 'note'); `date_called`
-- is superseded by lead_activities (type = 'call'). Neither had any real
-- data (no leads exist yet) or app code reading/writing them anymore.

alter table leads drop column notes;
alter table leads drop column date_called;
