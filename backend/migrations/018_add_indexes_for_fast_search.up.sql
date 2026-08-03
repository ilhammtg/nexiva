-- 018_add_indexes_for_fast_search.up.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_registrations_full_name_trgm ON registrations USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_registrations_phone_trgm ON registrations USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_registrations_reg_number_trgm ON registrations USING gin (reg_number gin_trgm_ops);
