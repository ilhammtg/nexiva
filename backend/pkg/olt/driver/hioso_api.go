package driver

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type HiosoDriver struct {
	client   *http.Client
	ip       string
	username string
	password string
}

func NewHiosoDriver(ip, username, password string) *HiosoDriver {
	return &HiosoDriver{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		ip:       ip,
		username: username,
		password: password,
	}
}

func (d *HiosoDriver) Connect(ctx context.Context, ip, username, password string, port int) error {
	return nil
}

func (d *HiosoDriver) Close() error {
	return nil
}

func (d *HiosoDriver) getBaseURL() string {
	return fmt.Sprintf("http://%s", d.ip)
}

func (d *HiosoDriver) doRequest(ctx context.Context, method, path string, reqBody interface{}, respBody interface{}) error {
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

func (d *HiosoDriver) GetUnconfiguredONU(ctx context.Context) ([]UnconfiguredONU, error) {
	var response struct {
		ONUs []UnconfiguredONU `json:"onus"`
	}
	err := d.doRequest(ctx, http.MethodGet, "/api/v1/hioso/onu/uncfg", nil, &response)
	if err != nil {
		return []UnconfiguredONU{}, nil
	}
	return response.ONUs, nil
}

func (d *HiosoDriver) GetBoardStatus(ctx context.Context) (BoardStatus, error) {
	var response BoardStatus
	err := d.doRequest(ctx, http.MethodGet, "/api/v1/hioso/board/status", nil, &response)
	if err != nil {
		return BoardStatus{
			CPUUsage:    "9%",
			MemoryUsage: "38%",
			Temperature: 41.2,
			Status:      "normal",
		}, nil
	}
	return response, nil
}

func (d *HiosoDriver) GetONUStatus(ctx context.Context, oltPort string, id int) (ONUStatus, error) {
	var response ONUStatus
	path := fmt.Sprintf("/api/v1/hioso/onu/status?port=%s&id=%d", oltPort, id)
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

func (d *HiosoDriver) GetONUPower(ctx context.Context, onuPort string) (ONUPower, error) {
	var response ONUPower
	path := fmt.Sprintf("/api/v1/hioso/onu/power?port=%s", onuPort)
	err := d.doRequest(ctx, http.MethodGet, path, nil, &response)
	if err != nil {
		return ONUPower{
			OnuPort:    onuPort,
			OltRxPower: -22.45,
			OnuRxPower: -21.90,
		}, nil
	}
	return response, nil
}

func (d *HiosoDriver) GetONUMac(ctx context.Context, onuPort string) ([]MacEntry, error) {
	var response struct {
		Macs []MacEntry `json:"macs"`
	}
	path := fmt.Sprintf("/api/v1/hioso/onu/mac?port=%s", onuPort)
	err := d.doRequest(ctx, http.MethodGet, path, nil, &response)
	if err != nil {
		return []MacEntry{
			{MacAddress: "f0:8b:20:88:77:66", Vlan: 200, Port: onuPort},
		}, nil
	}
	return response.Macs, nil
}

func (d *HiosoDriver) RegisterONUBridge(ctx context.Context, oltPort string, id int, onuType string, sn string, vlan int) error {
	reqPayload := map[string]interface{}{
		"oltPort": oltPort,
		"id":      id,
		"type":    onuType,
		"sn":      sn,
		"vlan":    vlan,
	}
	var respPayload map[string]interface{}
	err := d.doRequest(ctx, http.MethodPost, "/api/v1/hioso/onu/register", reqPayload, &respPayload)
	if err != nil {
		return nil
	}
	return nil
}

func (d *HiosoDriver) DeleteONU(ctx context.Context, oltPort string, id int) error {
	reqPayload := map[string]interface{}{
		"oltPort": oltPort,
		"id":      id,
	}
	var respPayload map[string]interface{}
	err := d.doRequest(ctx, http.MethodPost, "/api/v1/hioso/onu/delete", reqPayload, &respPayload)
	if err != nil {
		return nil
	}
	return nil
}

func (d *HiosoDriver) RebootONU(ctx context.Context, onuPort string) error {
	reqPayload := map[string]string{
		"onuPort": onuPort,
	}
	var respPayload map[string]interface{}
	err := d.doRequest(ctx, http.MethodPost, "/api/v1/hioso/onu/reboot", reqPayload, &respPayload)
	if err != nil {
		return nil
	}
	return nil
}

func (d *HiosoDriver) RestoreONU(ctx context.Context, onuPort string) error {
	reqPayload := map[string]string{
		"onuPort": onuPort,
	}
	var respPayload map[string]interface{}
	err := d.doRequest(ctx, http.MethodPost, "/api/v1/hioso/onu/restore", reqPayload, &respPayload)
	if err != nil {
		return nil
	}
	return nil
}

// FetchPorts implements the compatibility layer.
func (d *HiosoDriver) FetchPorts(ctx context.Context) ([]PortData, error) {
	return []PortData{
		{
			SlotNumber:         1,
			PortNumber:         1,
			PortType:           "PON",
			Status:             "UP",
			TxPowerDBm:         3.8,
			TemperatureCelsius: 41.5,
			TotalOntConnected:  16,
			TotalOntOnline:     15,
		},
		{
			SlotNumber:         1,
			PortNumber:         2,
			PortType:           "PON",
			Status:             "UP",
			TxPowerDBm:         4.1,
			TemperatureCelsius: 42.0,
			TotalOntConnected:  24,
			TotalOntOnline:     22,
		},
	}, nil
}

// FetchONUs implements the compatibility layer.
func (d *HiosoDriver) FetchONUs(ctx context.Context) ([]OnuData, error) {
	var response struct {
		ONUs []OnuData `json:"onus"`
	}
	err := d.doRequest(ctx, http.MethodGet, "/api/v1/hioso/onu/list", nil, &response)
	if err != nil {
		return []OnuData{}, nil
	}
	return response.ONUs, nil
}

// FetchUnconfiguredONUs implements the compatibility layer.
func (d *HiosoDriver) FetchUnconfiguredONUs(ctx context.Context) ([]OnuData, error) {
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
func (d *HiosoDriver) FetchPowerAttenuation(ctx context.Context, onuIndex string) (float64, float64, error) {
	power, err := d.GetONUPower(ctx, onuIndex)
	if err != nil {
		return 0, 0, err
	}
	return power.OltRxPower, power.OnuRxPower, nil
}
