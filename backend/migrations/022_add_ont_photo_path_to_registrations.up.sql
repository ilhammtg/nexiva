-- 022_add_ont_photo_path_to_registrations.up.sql
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS ont_photo_path TEXT;
