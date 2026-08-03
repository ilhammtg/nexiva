package model

import (
	"time"

	"github.com/google/uuid"
)

type ODP struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	Code            string     `json:"code" db:"code"`
	Name            string     `json:"name" db:"name"`
	OLTPortConfigID *uuid.UUID `json:"olt_port_config_id" db:"olt_port_config_id"`
	TotalPorts      int        `json:"total_ports" db:"total_ports"`
	UsedPorts       int        `json:"used_ports" db:"used_ports"`
	Latitude        float64    `json:"latitude" db:"latitude"`
	Longitude       float64    `json:"longitude" db:"longitude"`
	AddressNotes    string     `json:"address_notes" db:"address_notes"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

type CreateODPRequest struct {
	Code            string     `json:"code"`
	Name            string     `json:"name"`
	OLTPortConfigID *uuid.UUID `json:"olt_port_config_id"`
	TotalPorts      int        `json:"total_ports"`
	Latitude        float64    `json:"latitude"`
	Longitude       float64    `json:"longitude"`
	AddressNotes    string     `json:"address_notes"`
}
