-- 018_add_indexes_for_fast_search.down.sql
DROP INDEX IF EXISTS idx_registrations_full_name_trgm;
DROP INDEX IF EXISTS idx_registrations_phone_trgm;
DROP INDEX IF EXISTS idx_registrations_reg_number_trgm;
