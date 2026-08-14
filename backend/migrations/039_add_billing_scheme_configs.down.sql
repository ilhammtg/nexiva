-- 039_add_billing_scheme_configs.down.sql
DELETE FROM app_configs WHERE key IN (
  'billing_scheme',
  'billing_due_day',
  'billing_grace_period_days',
  'billing_reminder_days_before',
  'billing_prepaid_period_days'
);
