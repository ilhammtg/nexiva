-- 028_add_survey_pending_status.up.sql
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_status_check CHECK (status IN (
  'pending_review','survey_scheduled','survey_done','survey_failed','survey_pending',
  'rejected','waiting_payment','payment_confirmed',
  'installation_scheduled','provisioning','provisioning_failed','active'
));
