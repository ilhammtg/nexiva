-- 019_add_customer_number_to_registrations.down.sql
DROP INDEX IF EXISTS idx_registrations_customer_number;
ALTER TABLE registrations DROP COLUMN IF EXISTS customer_number;
