package service

import (
	"testing"
)

func TestParseCoordinatesFromGmaps(t *testing.T) {
	tests := []struct {
		name        string
		link        string
		expectedLat *float64
		expectedLng *float64
	}{
		{
			name: "@ style path coordinates",
			link: "https://www.google.com/maps/place/Monas/@-6.1753924,106.8271528,17z/data=!3m1!4b1",
			expectedLat: func() *float64 { v := -6.1753924; return &v }(),
			expectedLng: func() *float64 { v := 106.8271528; return &v }(),
		},
		{
			name: "q style query coordinates",
			link: "https://www.google.com/maps?q=-6.1753924,106.8271528&z=17",
			expectedLat: func() *float64 { v := -6.1753924; return &v }(),
			expectedLng: func() *float64 { v := 106.8271528; return &v }(),
		},
		{
			name: "empty link",
			link: "",
			expectedLat: nil,
			expectedLng: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lat, lng := parseCoordinatesFromGmaps(tt.link)
			if tt.expectedLat == nil {
				if lat != nil {
					t.Errorf("expected nil latitude, got %v", *lat)
				}
			} else {
				if lat == nil || *lat != *tt.expectedLat {
					t.Errorf("expected latitude %v, got %v", *tt.expectedLat, lat)
				}
			}

			if tt.expectedLng == nil {
				if lng != nil {
					t.Errorf("expected nil longitude, got %v", *lng)
				}
			} else {
				if lng == nil || *lng != *tt.expectedLng {
					t.Errorf("expected longitude %v, got %v", *tt.expectedLng, lng)
				}
			}
		})
	}
}
