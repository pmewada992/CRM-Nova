-- Separate migration from 0007 on purpose: a newly added enum value isn't
-- usable until its own transaction commits, so it can't be referenced as a
-- column default in the same migration that adds it.
alter table leads alter column status set default 'new_lead';
