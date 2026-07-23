-- "New Lead" is the natural starting state (before any DNR attempt) and
-- becomes the new default; "Enrolled" is the final successful outcome
-- after Meeting Done.
alter type lead_status add value 'new_lead' before 'dnr_1';
alter type lead_status add value 'enrolled' after 'meeting_done';
