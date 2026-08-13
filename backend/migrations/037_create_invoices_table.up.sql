-- 037_create_invoices_table.up.sql
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    period DATE NOT NULL,
    amount BIGINT NOT NULL,
    tax_amount BIGINT NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
    paid_at TIMESTAMPTZ,
    payment_bank VARCHAR(128),
    payment_confirmed_at TIMESTAMPTZ,
    payment_confirmed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_registration_id ON invoices(registration_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Update registrations check constraint to include 'isolir'
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_status_check CHECK (status IN (
  'pending_review','survey_scheduled','survey_done','survey_failed',
  'rejected','waiting_payment','payment_confirmed',
  'installation_scheduled','provisioning','provisioning_failed','active','isolir'
));
