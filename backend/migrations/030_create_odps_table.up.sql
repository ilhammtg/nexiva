CREATE TABLE IF NOT EXISTS odps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    olt_port_config_id UUID REFERENCES olt_port_configs(id) ON DELETE SET NULL,
    total_ports INT NOT NULL DEFAULT 8,
    latitude DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    longitude DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    address_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_odps_code ON odps(code);
CREATE INDEX IF NOT EXISTS idx_odps_olt_port ON odps(olt_port_config_id);
