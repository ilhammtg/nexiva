package driver

import (
	"fmt"
	"net"
	"strconv"
	"strings"
)

// NewOLTDriver instantiates the concrete driver based on profile and host credentials.
func NewOLTDriver(profile string, ip string, username string, password string) (OLTDriver, error) {
	host := ip
	port := 0

	// Check if IP contains a port specifier (e.g. 192.168.1.1:22 or [2001:db8::1]:80)
	if strings.Contains(ip, ":") {
		h, pStr, err := net.SplitHostPort(ip)
		if err == nil {
			host = h
			if p, err := strconv.Atoi(pStr); err == nil {
				port = p
			}
		}
	}

	profileNorm := strings.ToLower(strings.TrimSpace(profile))
	switch profileNorm {
	case "zte_c300", "zte":
		if port <= 0 {
			port = 22 // Default SSH port for ZTE
		}
		return NewZTEDriver(host, port, username, password, "c300"), nil
	case "zte_c600":
		if port <= 0 {
			port = 22
		}
		return NewZTEDriver(host, port, username, password, "c600"), nil
	case "vsol_gpon", "vsol":
		return NewVSOLDriver(host, username, password), nil
	case "hioso_gpon", "hioso":
		return NewHiosoDriver(host, username, password), nil
	default:
		return nil, fmt.Errorf("unsupported OLT profile driver: %s", profile)
	}
}
