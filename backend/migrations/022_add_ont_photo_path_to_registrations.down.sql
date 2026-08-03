-- 022_add_ont_photo_path_to_registrations.down.sql
ALTER TABLE registrations DROP COLUMN IF EXISTS ont_photo_path;
