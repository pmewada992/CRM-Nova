-- Exact-match lookups (CSV import duplicate-phone detection) want a plain
-- btree index; the trigram GIN index from 0002 is tuned for partial-match
-- search (ILIKE '%x%'), not equality/IN() lookups.
create index leads_phone_btree_idx on leads (phone);
