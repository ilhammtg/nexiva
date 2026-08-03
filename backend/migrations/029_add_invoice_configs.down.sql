-- 029_add_invoice_configs.down.sql
DELETE FROM app_configs WHERE key IN (
  'invoice_company_name',
  'invoice_company_address',
  'invoice_company_phone',
  'invoice_company_email',
  'invoice_tax_rate',
  'invoice_payment_instructions',
  'wa_system_number'
);
