-- User asked for two new pipeline statuses ("Connected", "Not Interested")
-- while requesting a status-color pass. Not explicitly confirmed which
-- exact pipeline slot they belong in, but adding an enum value is additive
-- and low-risk either way, so this proceeds per the "reasonable default,
-- log it" rule rather than blocking — logged in progress-tracker.md.
-- "Connected" = successfully reached the candidate (after DNR attempts,
-- before qualifying them). "Not Interested" = a terminal negative outcome
-- alongside Invalid Number.
alter type lead_status add value 'connected' after 'dnr_3';
alter type lead_status add value 'not_interested' after 'invalid_number';
