INSERT INTO app_configs (key, value) VALUES
('cust_number_format', 'YEAR,SERIAL'),
('cust_number_start', '1'),
('cust_number_reset', 'NEVER'),
('cust_number_separator', 'none')
ON CONFLICT (key) DO NOTHING;
