package driver

import "context"

// UnconfiguredONU represents a newly discovered ONU that has not been configured.
type UnconfiguredONU struct {
	OltPort      string `json:"oltPort"`      // e.g. "gpon-olt_1/1/1"
	OnuIndex     int    `json:"onuIndex"`     // e.g. 1
	SerialNumber string `json:"serialNumber"` // e.g. "ZTEG12345678"
	Status       string `json:"status"`       // e.g. "uncfg" or "ready"
}

// BoardStatus represents system resources of the OLT board/processor.
type BoardStatus struct {
	CPUUsage    string  `json:"cpuUsage"`    // e.g. "12%"
	MemoryUsage string  `json:"memoryUsage"` // e.g. "45%"
	Temperature float64 `json:"temperature"` // e.g. 42.5
	Status      string  `json:"status"`      // e.g. "normal"
}

// ONUStatus represents the status of a specific ONU.
type ONUStatus struct {
	OnuPort    string `json:"onuPort"`    // e.g. "gpon-onu_1/1/1:1"
	State      string `json:"state"`      // e.g. "working", "los", "dying-gasp", "offline"
	AdminState string `json:"adminState"` // e.g. "enable", "disable"
	PhaseState string `json:"phaseState"` // e.g. "working"
}

// ONUPower represents optical power level metrics (Rx/Tx) of an ONU.
type ONUPower struct {
	OnuPort    string  `json:"onuPort"`    // e.g. "gpon-onu_1/1/1:1"
	OltRxPower float64 `json:"oltRxPower"` // e.g. -23.50
	OnuRxPower float64 `json:"onuRxPower"` // e.g. -22.10
}

// MacEntry represents a MAC address entry detected behind an ONU.
type MacEntry struct {
	MacAddress string `json:"macAddress"` // e.g. "50:ff:20:12:34:56"
	Vlan       int    `json:"vlan"`       // e.g. 100
	Port       string `json:"port"`       // e.g. "gpon-onu_1/1/1:1"
}

// PortData represents GPON/UPLINK port details for NOC telemetry dashboard.
type PortData struct {
	SlotNumber         int     `json:"slotNumber"`
	PortNumber         int     `json:"portNumber"`
	PortType           string  `json:"portType"` // e.g. "PON" or "UPLINK"
	Status             string  `json:"status"`   // e.g. "UP", "DOWN", "WARNING"
	TxPowerDBm         float64 `json:"txPowerDbm"`
	TemperatureCelsius float64 `json:"temperatureCelsius"`
	TotalOntConnected  int     `json:"totalOntConnected"`
	TotalOntOnline     int     `json:"totalOntOnline"`
}

// OnuData represents an ONT device registered or active on an OLT.
type OnuData struct {
	OnuIndex     string  `json:"onuIndex"`     // e.g. "gpon-onu_1/1/1:1"
	SerialNumber string  `json:"serialNumber"` // e.g. "ZTEGC8547D68"
	Type         string  `json:"type"`         // e.g. "ZTE-F670"
	State        string  `json:"state"`        // e.g. "working", "los", "dyinggasp"
	OltRxPower   float64 `json:"oltRxPower"`   // e.g. -24.068
	OnuRxPower   float64 `json:"onuRxPower"`   // e.g. -23.980
	Distance     int     `json:"distance"`     // in meters
}

// OLTDriver defines the multi-vendor OLT control and monitoring capabilities.
type OLTDriver interface {
	GetUnconfiguredONU(ctx context.Context) ([]UnconfiguredONU, error)
	GetBoardStatus(ctx context.Context) (BoardStatus, error)
	GetONUStatus(ctx context.Context, oltPort string, id int) (ONUStatus, error)
	GetONUPower(ctx context.Context, onuPort string) (ONUPower, error)
	GetONUMac(ctx context.Context, onuPort string) ([]MacEntry, error)
	RegisterONUBridge(ctx context.Context, oltPort string, id int, onuType string, sn string, vlan int) error
	DeleteONU(ctx context.Context, oltPort string, id int) error
	RebootONU(ctx context.Context, onuPort string) error
	RestoreONU(ctx context.Context, onuPort string) error

	// Compatibility APIs for existing routes
	FetchPorts(ctx context.Context) ([]PortData, error)
	FetchONUs(ctx context.Context) ([]OnuData, error)
	FetchUnconfiguredONUs(ctx context.Context) ([]OnuData, error)
	FetchPowerAttenuation(ctx context.Context, onuIndex string) (oltRx float64, onuRx float64, err error)
	Close() error
}
