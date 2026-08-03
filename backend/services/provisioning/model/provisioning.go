package model

import "time"

// ProvisioningLog represents a row in the provisioning_logs table.
type ProvisioningLog struct {
	ID              string    `db:"id"`
	RegistrationID  string    `db:"registration_id"`
	Target          string    `db:"target"`          // "mikrotik" | "olt_zte"
	Action          string    `db:"action"`          // "create_pppoe_secret" | "register_ont"
	Status          string    `db:"status"`          // "started" | "success" | "failed"
	ErrorMessage    *string   `db:"error_message"`
	DurationMs      *int      `db:"duration_ms"`
	AttemptNumber   int       `db:"attempt_number"`
	CreatedAt       time.Time `db:"created_at"`
}

// ProvisioningDetails holds all data needed to run provisioning for a customer.
type ProvisioningDetails struct {
	RegistrationID    string  `db:"registration_id"`
	PPPoEUsername     string  `db:"pppoe_username"`
	PPPoEPassword     string  `db:"pppoe_password"`
	ONTSerialNumber   string  `db:"ont_serial_number"`
	MikrotikProfile   string  `db:"mikrotik_profile"`
	VlanID            int     `db:"vlan_id"`
	OLTLineProfileID  int     `db:"olt_line_profile_id"`
	OLTSrvProfileID   int     `db:"olt_srv_profile_id"`
	OLTName           *string `db:"olt_name"`
	OLTHost           *string `db:"olt_host"`
	OLTPortSSH        *int    `db:"olt_port_ssh"`
	GponSlot          *int    `db:"gpon_slot"`
	GponPort          *int    `db:"gpon_port"`
}

// MikrotikConfig is the db representation of mikrotik_configs
type MikrotikConfig struct {
	ID          string  `db:"id"`
	Name        string  `db:"name"`
	Host        string  `db:"host"`
	Port        int     `db:"port"`
	Username    string  `db:"username"`
	PasswordEnc string  `db:"password_enc"`
	IsActive    bool    `db:"is_active"`
}
