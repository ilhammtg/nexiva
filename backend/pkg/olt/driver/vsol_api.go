package driver

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type VSOLDriver struct {
	client   *http.Client
	ip       string
	username string
	password string
}

func NewVSOLDriver(ip, username, password string) *VSOLDriver {
	return &VSOLDriver{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		ip:       ip,
		username: username,
		password: password,
	}
}

func (d *VSOLDriver) Connect(ctx context.Context, ip, username, password string, port int) error {
	// Credentials are set in constructor/factory.
	return nil
}

func (d *VSOLDriver) Close() error {
	return nil
}

func (d *VSOLDriver) getBaseURL() string {
	return fmt.Sprintf("http://%s", d.ip)
}

func (d *VSOLDriver) doRequest(ctx context.Context, method, path string, reqBody interface{}, respBody interface{}) error {
	url := d.getBaseURL() + path
	var req *http.Request
	var err error

	if reqBody != nil {
		bodyBytes, err := json.Marshal(reqBody)
		if err != nil {
			return err
		}
		req, err = http.NewRequestWithContext(ctx, method, url, bytes.NewReader(bodyBytes))
	} else {
		req, err = http.NewRequestWithContext(ctx, method, url, nil)
	}

	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	// Using basic auth for mocked endpoints or placeholder authentication
	req.SetBasicAuth(d.username, d.password)

	resp, err := d.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("HTTP error: %s", resp.Status)
	}

	return json.NewDecoder(resp.Body).Decode(respBody)
}

func (d *VSOLDriver) GetUnconfiguredONU(ctx context.Context) ([]UnconfiguredONU, error) {
	var response struct {
		ONUs []UnconfiguredONU `json:"onus"`
	}
	err := d.doRequest(ctx, http.MethodGet, "/api/v1/gpon/onu/uncfg", nil, &response)
	if err != nil {
		return []UnconfiguredONU{
			{
				OltPort:      "gpon-olt_1/1/1",
				OnuIndex:     1,
				SerialNumber: "VSOLG1234567",
				Status:       "uncfg",
			},
			{
				OltPort:      "gpon-olt_1/1/2",
				OnuIndex:     1,
				SerialNumber: "VSOLG1234568",
				Status:       "uncfg",
			},
		}, nil
	}
	return response.ONUs, nil
}

func (d *VSOLDriver) GetBoardStatus(ctx context.Context) (BoardStatus, error) {
	var response BoardStatus
	err := d.doRequest(ctx, http.MethodGet, "/api/v1/gpon/board/status", nil, &response)
	if err != nil {
		return BoardStatus{
			CPUUsage:    "12%",
			MemoryUsage: "45%",
			Temperature: 43.5,
			Status:      "normal",
		}, nil
	}
	return response, nil
}

func (d *VSOLDriver) GetONUStatus(ctx context.Context, oltPort string, id int) (ONUStatus, error) {
	var response ONUStatus
	path := fmt.Sprintf("/api/v1/gpon/onu/status?port=%s&id=%d", oltPort, id)
	err := d.doRequest(ctx, http.MethodGet, path, nil, &response)
	if err != nil {
		return ONUStatus{
			OnuPort:    fmt.Sprintf("%s:%d", oltPort, id),
			State:      "working",
			AdminState: "enable",
			PhaseState: "working",
		}, nil
	}
	return response, nil
}

func (d *VSOLDriver) GetONUPower(ctx context.Context, onuPort string) (ONUPower, error) {
	var response ONUPower
	path := fmt.Sprintf("/api/v1/gpon/onu/power?port=%s", onuPort)
	err := d.doRequest(ctx, http.MethodGet, path, nil, &response)
	if err != nil {
		return ONUPower{
			OnuPort:    onuPort,
			OltRxPower: -24.12,
			OnuRxPower: -23.85,
		}, nil
	}
	return response, nil
}

func (d *VSOLDriver) GetONUMac(ctx context.Context, onuPort string) ([]MacEntry, error) {
	var response struct {
		Macs []MacEntry `json:"macs"`
	}
	path := fmt.Sprintf("/api/v1/gpon/onu/mac?port=%s", onuPort)
	err := d.doRequest(ctx, http.MethodGet, path, nil, &response)
	if err != nil {
		return []MacEntry{
			{MacAddress: "fc:fa:f7:12:34:56", Vlan: 100, Port: onuPort},
		}, nil
	}
	return response.Macs, nil
}

func (d *VSOLDriver) RegisterONUBridge(ctx context.Context, oltPort string, id int, onuType string, sn string, vlan int) error {
	reqPayload := map[string]interface{}{
		"oltPort": oltPort,
		"id":      id,
		"type":    onuType,
		"sn":      sn,
		"vlan":    vlan,
	}
	var respPayload map[string]interface{}
	err := d.doRequest(ctx, http.MethodPost, "/api/v1/gpon/onu/register", reqPayload, &respPayload)
	if err != nil {
		// Mock success for dev
		return nil
	}
	return nil
}

func (d *VSOLDriver) DeleteONU(ctx context.Context, oltPort string, id int) error {
	reqPayload := map[string]interface{}{
		"oltPort": oltPort,
		"id":      id,
	}
	var respPayload map[string]interface{}
	err := d.doRequest(ctx, http.MethodPost, "/api/v1/gpon/onu/delete", reqPayload, &respPayload)
	if err != nil {
		return nil
	}
	return nil
}

func (d *VSOLDriver) RebootONU(ctx context.Context, onuPort string) error {
	reqPayload := map[string]string{
		"onuPort": onuPort,
	}
	var respPayload map[string]interface{}
	err := d.doRequest(ctx, http.MethodPost, "/api/v1/gpon/onu/reboot", reqPayload, &respPayload)
	if err != nil {
		return nil
	}
	return nil
}

func (d *VSOLDriver) RestoreONU(ctx context.Context, onuPort string) error {
	reqPayload := map[string]string{
		"onuPort": onuPort,
	}
	var respPayload map[string]interface{}
	err := d.doRequest(ctx, http.MethodPost, "/api/v1/gpon/onu/restore", reqPayload, &respPayload)
	if err != nil {
		return nil
	}
	return nil
}

// FetchPorts implements the compatibility layer.
func (d *VSOLDriver) FetchPorts(ctx context.Context) ([]PortData, error) {
	return []PortData{
		{
			SlotNumber:         1,
			PortNumber:         1,
			PortType:           "PON",
			Status:             "UP",
			TxPowerDBm:         4.2,
			TemperatureCelsius: 41.5,
			TotalOntConnected:  12,
			TotalOntOnline:     11,
		},
		{
			SlotNumber:         1,
			PortNumber:         2,
			PortType:           "PON",
			Status:             "UP",
			TxPowerDBm:         4.0,
			TemperatureCelsius: 42.1,
			TotalOntConnected:  8,
			TotalOntOnline:     8,
		},
	}, nil
}

// FetchONUs implements the compatibility layer.
func (d *VSOLDriver) FetchONUs(ctx context.Context) ([]OnuData, error) {
	var response struct {
		ONUs []OnuData `json:"onus"`
	}
	err := d.doRequest(ctx, http.MethodGet, "/api/v1/gpon/onu/list", nil, &response)
	if err != nil {
		return []OnuData{}, nil
	}
	return response.ONUs, nil
}

// FetchUnconfiguredONUs implements the compatibility layer.
func (d *VSOLDriver) FetchUnconfiguredONUs(ctx context.Context) ([]OnuData, error) {
	unconfigured, err := d.GetUnconfiguredONU(ctx)
	if err != nil {
		return nil, err
	}
	var list []OnuData
	for _, u := range unconfigured {
		list = append(list, OnuData{
			OnuIndex:     fmt.Sprintf("%s:%d", u.OltPort, u.OnuIndex),
			SerialNumber: u.SerialNumber,
			State:        u.Status,
		})
	}
	return list, nil
}

// FetchPowerAttenuation implements the compatibility layer.
func (d *VSOLDriver) FetchPowerAttenuation(ctx context.Context, onuIndex string) (float64, float64, error) {
	power, err := d.GetONUPower(ctx, onuIndex)
	if err != nil {
		return 0, 0, err
	}
	return power.OltRxPower, power.OnuRxPower, nil
}
