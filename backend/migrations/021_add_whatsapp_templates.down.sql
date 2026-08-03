DELETE FROM app_configs WHERE key IN (
  'notif_tmpl_new_registration',
  'notif_tmpl_survey_scheduled',
  'notif_tmpl_payment_confirmed',
  'notif_tmpl_activation_success',
  'notif_tmpl_provisioning_failed'
);
