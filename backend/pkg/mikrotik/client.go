package mikrotik

import (
	"fmt"
	"strconv"
	"strings"
	"github.com/go-routeros/routeros"
)

type Client struct {
	addr     string
	username string
	password string
}

func NewClient(host string, port int, username, password string) *Client {
	return &Client{
		addr:     fmt.Sprintf("%s:%d", host, port),
		username: username,
		password: password,
	}
}

// ActiveConnection represents a /ppp/active entry
type ActiveConnection struct {
	Name     string `json:"name"`
	Service  string `json:"service"`
	CallerID string `json:"caller_id"`
	Address  string `json:"address"`
	Uptime   string `json:"uptime"`
}

// PPPSecret represents a /ppp/secret entry
type PPPSecret struct {
	Name          string `json:"name"`
	Password      string `json:"password"`
	Service       string `json:"service"`
	Profile       string `json:"profile"`
	Disabled      bool   `json:"disabled"`
	IsOnline      bool   `json:"is_online"` // derived
	RemoteAddress string `json:"remote_address"`
}

// ResourceInfo represents system resources
type ResourceInfo struct {
	CPU           int     `json:"cpu_load"`
	FreeMemory    int64   `json:"free_memory"`
	TotalMemory   int64   `json:"total_memory"`
	FreeHDD       int64   `json:"free_hdd"`
	TotalHDD      int64   `json:"total_hdd"`
	Uptime        string  `json:"uptime"`
	BoardName     string  `json:"board_name"`
	Version       string  `json:"version"`
	Temperature   float64 `json:"temperature"`
	Voltage       float64 `json:"voltage"`
}

// InterfaceTraffic represents monitor-traffic rates
type InterfaceTraffic struct {
	Name     string  `json:"name"`
	Rx       float64 `json:"rx"` // in Mbps
	Tx       float64 `json:"tx"` // in Mbps
	Running  bool    `json:"running"`
	Disabled bool    `json:"disabled"`
	Type     string  `json:"type"`
}

// LogEntry represents a /log entry
type LogEntry struct {
	Time    string `json:"time"`
	Topics  string `json:"topics"`
	Message string `json:"message"`
}

func (c *Client) connect() (*routeros.Client, error) {
	return routeros.Dial(c.addr, c.username, c.password)
}

func (c *Client) GetResources() (*ResourceInfo, error) {
	conn, err := c.connect()
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	reply, err := conn.Run("/system/resource/print")
	if err != nil {
		return nil, err
	}

	res := &ResourceInfo{}
	if len(reply.Re) > 0 {
		m := reply.Re[0].Map
		res.Uptime = m["uptime"]
		res.BoardName = m["board-name"]
		res.Version = m["version"]
		
		if val, err := strconv.Atoi(m["cpu-load"]); err == nil {
			res.CPU = val
		}
		if val, err := strconv.ParseInt(m["free-memory"], 10, 64); err == nil {
			res.FreeMemory = val
		}
		if val, err := strconv.ParseInt(m["total-memory"], 10, 64); err == nil {
			res.TotalMemory = val
		}
		if val, err := strconv.ParseInt(m["free-hdd-space"], 10, 64); err == nil {
			res.FreeHDD = val
		}
		if val, err := strconv.ParseInt(m["total-hdd-space"], 10, 64); err == nil {
			res.TotalHDD = val
		}
	}

	// Try health (temperature / voltage)
	replyHealth, err := conn.Run("/system/health/print")
	if err == nil && len(replyHealth.Re) > 0 {
		m := replyHealth.Re[0].Map
		tempStr := m["temperature"]
		if tempStr == "" {
			tempStr = m["cpu-temperature"]
		}
		if val, err := strconv.ParseFloat(tempStr, 64); err == nil {
			res.Temperature = val
		}
		
		voltStr := m["voltage"]
		if val, err := strconv.ParseFloat(voltStr, 64); err == nil {
			res.Voltage = val
		}
	}

	return res, nil
}

func (c *Client) GetActiveConnections() ([]ActiveConnection, error) {
	conn, err := c.connect()
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	reply, err := conn.Run("/ppp/active/print")
	if err != nil {
		return nil, err
	}

	var list []ActiveConnection
	for _, re := range reply.Re {
		m := re.Map
		list = append(list, ActiveConnection{
			Name:     m["name"],
			Service:  m["service"],
			CallerID: m["caller-id"],
			Address:  m["address"],
			Uptime:   m["uptime"],
		})
	}
	return list, nil
}

func (c *Client) GetPPPSecrets() ([]PPPSecret, error) {
	conn, err := c.connect()
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	reply, err := conn.Run("/ppp/secret/print")
	if err != nil {
		return nil, err
	}

	// Get active connections to set IsOnline
	activeReply, _ := conn.Run("/ppp/active/print")
	activeMap := make(map[string]bool)
	if activeReply != nil {
		for _, re := range activeReply.Re {
			activeMap[re.Map["name"]] = true
		}
	}

	var list []PPPSecret
	for _, re := range reply.Re {
		m := re.Map
		list = append(list, PPPSecret{
			Name:          m["name"],
			Password:      m["password"],
			Service:       m["service"],
			Profile:       m["profile"],
			Disabled:      m["disabled"] == "true",
			IsOnline:      activeMap[m["name"]],
			RemoteAddress: m["remote-address"],
		})
	}
	return list, nil
}

func (c *Client) GetTraffic() ([]InterfaceTraffic, error) {
	conn, err := c.connect()
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	ifListReply, err := conn.Run("/interface/print")
	if err != nil {
		return nil, err
	}

	var interfaces []string
	runningMap := make(map[string]bool)
	disabledMap := make(map[string]bool)
	typeMap := make(map[string]string)

	for _, re := range ifListReply.Re {
		name := re.Map["name"]
		if name != "" {
			interfaces = append(interfaces, name)
			runningMap[name] = re.Map["running"] == "true"
			disabledMap[name] = re.Map["disabled"] == "true"
			typeMap[name] = re.Map["type"]
		}
	}

	if len(interfaces) == 0 {
		return nil, nil
	}

	cmd := []string{"/interface/monitor-traffic", "=interface=" + strings.Join(interfaces, ","), "=once="}
	reply, err := conn.Run(cmd...)
	if err != nil {
		return nil, err
	}

	var list []InterfaceTraffic
	for _, re := range reply.Re {
		m := re.Map
		name := m["name"]
		rxBps, _ := strconv.ParseFloat(m["rx-bits-per-second"], 64)
		txBps, _ := strconv.ParseFloat(m["tx-bits-per-second"], 64)

		rxMbps := rxBps / 1000000.0
		txMbps := txBps / 1000000.0

		rxMbps, _ = strconv.ParseFloat(fmt.Sprintf("%.2f", rxMbps), 64)
		txMbps, _ = strconv.ParseFloat(fmt.Sprintf("%.2f", txMbps), 64)

		list = append(list, InterfaceTraffic{
			Name:     name,
			Rx:       rxMbps,
			Tx:       txMbps,
			Running:  runningMap[name],
			Disabled: disabledMap[name],
			Type:     typeMap[name],
		})
	}

	return list, nil
}

func (c *Client) GetLogs() ([]LogEntry, error) {
	conn, err := c.connect()
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	reply, err := conn.Run("/log/print")
	if err != nil {
		return nil, err
	}

	var list []LogEntry
	for _, re := range reply.Re {
		m := re.Map
		list = append(list, LogEntry{
			Time:    m["time"],
			Topics:  m["topics"],
			Message: m["message"],
		})
	}

	for i, j := 0, len(list)-1; i < j; i, j = i+1, j-1 {
		list[i], list[j] = list[j], list[i]
	}

	if len(list) > 100 {
		list = list[:100]
	}

	return list, nil
}

// DisconnectActiveConnection disconnects an active PPPoE session
func (c *Client) DisconnectActiveConnection(name string) error {
	conn, err := c.connect()
	if err != nil {
		return err
	}
	defer conn.Close()

	reply, err := conn.Run("/ppp/active/print", "?name="+name)
	if err != nil {
		return err
	}

	if len(reply.Re) == 0 {
		return fmt.Errorf("active session for %s not found", name)
	}

	id := reply.Re[0].Map[".id"]
	if id == "" {
		return fmt.Errorf("session ID not found for %s", name)
	}

	_, err = conn.Run("/ppp/active/remove", "=.id="+id)
	return err
}

// ToggleSecret enables or disables a PPPoE secret
func (c *Client) ToggleSecret(name string, disabled bool) error {
	conn, err := c.connect()
	if err != nil {
		return err
	}
	defer conn.Close()

	reply, err := conn.Run("/ppp/secret/print", "?name="+name)
	if err != nil {
		return err
	}

	if len(reply.Re) == 0 {
		return fmt.Errorf("secret for %s not found", name)
	}

	id := reply.Re[0].Map[".id"]
	if id == "" {
		return fmt.Errorf("secret ID not found for %s", name)
	}

	var cmd string
	if disabled {
		cmd = "/ppp/secret/disable"
	} else {
		cmd = "/ppp/secret/enable"
	}

	_, err = conn.Run(cmd, "=.id="+id)
	return err
}

// AddSecret adds a new PPPoE secret
func (c *Client) AddSecret(name, password, profile, service string) error {
	conn, err := c.connect()
	if err != nil {
		return err
	}
	defer conn.Close()

	if service == "" {
		service = "pppoe"
	}
	if profile == "" {
		profile = "default"
	}

	_, err = conn.Run("/ppp/secret/add",
		"=name="+name,
		"=password="+password,
		"=profile="+profile,
		"=service="+service,
	)
	return err
}

// UpdateSecretProfile updates the profile of a PPPoE secret
func (c *Client) UpdateSecretProfile(name string, profile string) error {
	conn, err := c.connect()
	if err != nil {
		return err
	}
	defer conn.Close()

	reply, err := conn.Run("/ppp/secret/print", "?name="+name)
	if err != nil {
		return err
	}

	if len(reply.Re) == 0 {
		return fmt.Errorf("secret for %s not found", name)
	}

	id := reply.Re[0].Map[".id"]
	if id == "" {
		return fmt.Errorf("secret ID not found for %s", name)
	}

	_, err = conn.Run("/ppp/secret/set", "=.id="+id, "=profile="+profile)
	return err
}

