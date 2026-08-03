-- 019_add_customer_number_to_registrations.up.sql
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS customer_number TEXT UNIQUE;
UPDATE registrations SET customer_number = REPLACE(reg_number, 'REG-', 'CUST-') WHERE status = 'active' AND customer_number IS NULL;
CREATE INDEX IF NOT EXISTS idx_registrations_customer_number ON registrations(customer_number);
