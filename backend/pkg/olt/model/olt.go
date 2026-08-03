package model

// PortData represents slot & port telemetry returned by OLT drivers.
type PortData struct {
	SlotNumber         int     `json:"slotNumber"`
	PortNumber         int     `json:"portNumber"`
	PortType           string  `json:"portType"` // "PON" atau "UPLINK"
	Status             string  `json:"status"`   // "UP", "DOWN", "WARNING"
	TxPowerDBm         float64 `json:"txPowerDbm"`
	TemperatureCelsius float64 `json:"temperatureCelsius"`
	TotalOntConnected  int     `json:"totalOntConnected"`
	TotalOntOnline     int     `json:"totalOntOnline"`
}

// OnuData represents an ONT device registered or unconfigured on an OLT.
type OnuData struct {
	OnuIndex     string  `json:"onuIndex"`     // e.g. "gpon-olt_1/1/1:1" or "gpon-onu_1/3/1:1"
	SerialNumber string  `json:"serialNumber"` // e.g. "ZTEGC8547D68"
	Type         string  `json:"type"`         // e.g. "ZTE-F670"
	State        string  `json:"state"`        // e.g. "ready", "working", "los", "dyinggasp"
	OltRxPower   float64 `json:"oltRxPower"`   // e.g. -24.068 (dBm)
	OnuRxPower   float64 `json:"onuRxPower"`   // e.g. -23.980 (dBm)
	Distance     int     `json:"distance"`     // in meters e.g. 8732
}
