-- Supports "pending invite" rows: an Admin invites someone by email, we
-- insert a users row immediately (so the Admin can pre-assign role/team)
-- with no clerk_user_id yet, since Clerk hasn't created that person's
-- account until they actually accept the invite and sign up. The
-- `user.created` webhook then fills in clerk_user_id on that same row
-- (matched by email) instead of inserting a duplicate.
alter table users alter column clerk_user_id drop not null;
