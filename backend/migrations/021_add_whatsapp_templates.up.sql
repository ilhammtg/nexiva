INSERT INTO app_configs (key, value, description) VALUES
  ('notif_tmpl_new_registration', '📋 Pendaftaran baru masuk!\nNama: {{FullName}}\nHP: {{Phone}}\nReg: {{RegNumber}}', 'Template pesan WhatsApp untuk pendaftaran baru masuk'),
  ('notif_tmpl_survey_scheduled', '📅 Jadwal survei dikonfirmasi untuk {{FullName}}.\nNomor registrasi: {{RegNumber}}', 'Template pesan WhatsApp untuk jadwal survei dikonfirmasi'),
  ('notif_tmpl_payment_confirmed', '✅ Pembayaran Anda dikonfirmasi, {{FullName}}.\nKami akan segera menjadwalkan instalasi.', 'Template pesan WhatsApp untuk konfirmasi pembayaran'),
  ('notif_tmpl_activation_success', '🎉 Selamat {{FullName}}! Layanan internet Anda sudah aktif.\nUsername PPPoE: {{PPPoEUsername}}\nPassword dikirim terpisah.', 'Template pesan WhatsApp untuk aktivasi sukses'),
  ('notif_tmpl_provisioning_failed', '⚠️ Provisioning gagal untuk {{FullName}} ({{RegNumber}}).\nError: {{Error}}', 'Template pesan WhatsApp untuk kesalahan provisioning')
ON CONFLICT (key) DO NOTHING;
