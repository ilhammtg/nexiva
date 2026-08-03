package driver

import (
	"context"
	"testing"
)

func TestNewOLTDriver(t *testing.T) {
	tests := []struct {
		name        string
		profile     string
		ip          string
		username    string
		password    string
		expectError bool
		expectType  string
	}{
		{
			name:        "ZTE C300 with default port",
			profile:     "zte_c300",
			ip:          "192.168.1.1",
			username:    "admin",
			password:    "pass",
			expectError: false,
			expectType:  "zte",
		},
		{
			name:        "ZTE C600 with custom port",
			profile:     "zte_c600",
			ip:          "10.0.0.5:2222",
			username:    "admin",
			password:    "pass",
			expectError: false,
			expectType:  "zte",
		},
		{
			name:        "VSOL GPON",
			profile:     "vsol_gpon",
			ip:          "192.168.2.1",
			username:    "admin",
			password:    "pass",
			expectError: false,
			expectType:  "vsol",
		},
		{
			name:        "HIOSO GPON",
			profile:     "hioso_gpon",
			ip:          "192.168.3.1",
			username:    "admin",
			password:    "pass",
			expectError: false,
			expectType:  "hioso",
		},
		{
			name:        "Unsupported profile",
			profile:     "unknown_profile",
			ip:          "192.168.4.1",
			username:    "admin",
			password:    "pass",
			expectError: true,
			expectType:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			drv, err := NewOLTDriver(tt.profile, tt.ip, tt.username, tt.password)
			if (err != nil) != tt.expectError {
				t.Fatalf("expected error: %v, got: %v", tt.expectError, err)
			}
			if err != nil {
				return
			}
			defer drv.Close()

			switch tt.expectType {
			case "zte":
				z, ok := drv.(*ZTEDriver)
				if !ok {
					t.Fatalf("expected *ZTEDriver, got %T", drv)
				}
				if tt.profile == "zte_c600" {
					if z.model != "c600" {
						t.Errorf("expected model c600, got %s", z.model)
					}
					if z.port != 2222 {
						t.Errorf("expected port 2222, got %d", z.port)
					}
				} else {
					if z.model != "c300" {
						t.Errorf("expected model c300, got %s", z.model)
					}
					if z.port != 22 {
						t.Errorf("expected port 22, got %d", z.port)
					}
				}
			case "vsol":
				_, ok := drv.(*VSOLDriver)
				if !ok {
					t.Fatalf("expected *VSOLDriver, got %T", drv)
				}
			case "hioso":
				_, ok := drv.(*HiosoDriver)
				if !ok {
					t.Fatalf("expected *HiosoDriver, got %T", drv)
				}
			}
		})
	}
}

func TestZTEDriverPortFormatting(t *testing.T) {
	c300 := NewZTEDriver("192.168.1.1", 22, "admin", "admin", "c300")
	c600 := NewZTEDriver("192.168.1.1", 22, "admin", "admin", "c600")

	// Test OLT port format
	c300Olt := c300.formatOltPort(1, 2, 3)
	if c300Olt != "gpon-olt_1/2/3" {
		t.Errorf("expected gpon-olt_1/2/3, got %s", c300Olt)
	}

	c600Olt := c600.formatOltPort(1, 2, 3)
	if c600Olt != "gpon_olt-1/2/3" {
		t.Errorf("expected gpon_olt-1/2/3, got %s", c600Olt)
	}

	// Test ONU port format
	c300Onu := c300.formatOnuPort(1, 2, 3, 4)
	if c300Onu != "gpon-onu_1/2/3:4" {
		t.Errorf("expected gpon-onu_1/2/3:4, got %s", c300Onu)
	}

	c600Onu := c600.formatOnuPort(1, 2, 3, 4)
	if c600Onu != "gpon_onu-1/2/3:4" {
		t.Errorf("expected gpon_onu-1/2/3:4, got %s", c600Onu)
	}
}

func TestMockDriverFallbacks(t *testing.T) {
	ctx := context.Background()

	t.Run("VSOL Mock Fallback", func(t *testing.T) {
		drv := NewVSOLDriver("192.168.1.1", "admin", "admin")
		onus, err := drv.GetUnconfiguredONU(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(onus) != 2 {
			t.Errorf("expected 2 unconfigured ONUs, got %d", len(onus))
		}
		if onus[0].SerialNumber != "VSOLG1234567" {
			t.Errorf("expected VSOLG1234567, got %s", onus[0].SerialNumber)
		}
	})

	t.Run("HIOSO Mock Fallback", func(t *testing.T) {
		drv := NewHiosoDriver("192.168.1.1", "admin", "admin")
		status, err := drv.GetBoardStatus(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if status.CPUUsage != "9%" {
			t.Errorf("expected 9%%, got %s", status.CPUUsage)
		}
	})
}
