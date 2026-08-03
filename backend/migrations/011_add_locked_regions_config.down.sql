-- 011_add_locked_regions_config.down.sql
DELETE FROM app_configs WHERE key = 'locked_regions';
