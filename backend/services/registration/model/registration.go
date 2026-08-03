package model

import "time"

// Status represents the registration state machine.
type Status string

const (
	StatusPendingReview         Status = "pending_review"
	StatusSurveyScheduled       Status = "survey_scheduled"
	StatusSurveyDone            Status = "survey_done"
	StatusSurveyFailed          Status = "survey_failed"
	StatusSurveyPending         Status = "survey_pending"
	StatusRejected               Status = "rejected"
	StatusWaitingPayment        Status = "waiting_payment"
	StatusPaymentConfirmed      Status = "payment_confirmed"
	StatusInstallationScheduled Status = "installation_scheduled"
	StatusProvisioning          Status = "provisioning"
	StatusProvisioningFailed    Status = "provisioning_failed"
	StatusActive                Status = "active"
)

var validTransitions = map[Status][]Status{
	StatusPendingReview:         {StatusSurveyScheduled, StatusRejected},
	StatusSurveyScheduled:       {StatusSurveyDone, StatusSurveyFailed, StatusInstallationScheduled, StatusSurveyPending},
	StatusSurveyPending:         {StatusSurveyDone, StatusSurveyFailed, StatusInstallationScheduled, StatusSurveyScheduled},
	StatusSurveyDone:            {StatusInstallationScheduled},
	StatusInstallationScheduled: {StatusWaitingPayment},
	StatusWaitingPayment:        {StatusPaymentConfirmed},
	StatusPaymentConfirmed:      {StatusProvisioning},
	StatusProvisioning:          {StatusActive, StatusProvisioningFailed},
	StatusProvisioningFailed:    {StatusProvisioning}, // allow retry
}

// CanTransitionTo checks if transitioning to next is valid from the current status.
func (s Status) CanTransitionTo(next Status) bool {
	allowed, ok := validTransitions[s]
	if !ok {
		return false
	}
	for _, a := range allowed {
		if a == next {
			return true
		}
	}
	return false
}

// Registration represents a row in the registrations table.
type Registration struct {
	ID         string    `db:"id"`
	RegNumber      string    `db:"reg_number"`
	CustomerNumber *string   `db:"customer_number"`
	CustomerID     *string   `db:"customer_id"`
	FullName   string    `db:"full_name"`
	NIK        *string   `db:"nik"`
	Phone      string    `db:"phone"`
	Email      *string   `db:"email"`

	// Address
	Province      string   `db:"province"`
	City          string   `db:"city"`
	District      string   `db:"district"`
	Village       string   `db:"village"`
	RT            *string  `db:"rt"`
	RW            *string  `db:"rw"`
	AddressDetail string   `db:"address_detail"`
	MapsLat       *float64 `db:"maps_lat"`
	MapsLng       *float64 `db:"maps_lng"`

	// Package
	PackageID string `db:"package_id"`

	// Status & assignment
	Status       Status  `db:"status"`
	CSUserID     *string `db:"cs_user_id"`
	TechnicianID *string `db:"technician_id"`

	// Schedule
	SurveyScheduledAt       *time.Time `db:"survey_scheduled_at"`
	SurveyDoneAt            *time.Time `db:"survey_done_at"`
	InstallationScheduledAt *time.Time `db:"installation_scheduled_at"`
	ActivatedAt             *time.Time `db:"activated_at"`

	// Payment
	InstallationFee      *int64     `db:"installation_fee"`
	PaymentAmount        *int64     `db:"payment_amount"`
	PaymentDate          *time.Time `db:"payment_date"`
	PaymentBank          *string    `db:"payment_bank"`
	PaymentConfirmedBy   *string    `db:"payment_confirmed_by"`
	PaymentConfirmedAt   *time.Time `db:"payment_confirmed_at"`

	// Survey result
	SurveyNotes        *string `db:"survey_notes"`
	SurveyIsFeasible   *bool   `db:"survey_is_feasible"`
	SurveyCableLengthM *int    `db:"survey_cable_length_m"`

	// Provisioning
	PPPoEUsername   *string `db:"pppoe_username"`
	PPPoEPassword   *string `db:"pppoe_password"` // never return to API
	ONTSerialNumber *string `db:"ont_serial_number"`
	ONTIndex        *int    `db:"ont_index"`
	OLTPortConfigID *string `db:"olt_port_config_id"`

	// Documents
	KTPFilePath  *string `db:"ktp_file_path"`
	ONTPhotoPath *string `db:"ont_photo_path"`

	// Notes
	RejectionReason *string `db:"rejection_reason"`
	InternalNotes   *string `db:"internal_notes"`
	ODPInfo         *string `db:"odp_info"`
	GoogleMapsLink  *string `db:"google_maps_link"`

	CreatedAt time.Time  `db:"created_at"`
	UpdatedAt time.Time  `db:"updated_at"`
	DeletedAt *time.Time `db:"deleted_at"`
}

// Package represents a row in the packages table.
type Package struct {
	ID                 string    `db:"id"`
	Name               string    `db:"name"`
	Description        *string   `db:"description"`
	DeviceRecommendation *string `db:"device_recommendation"`
	PriceMonthly       int64     `db:"price_monthly"`
	PriceInstallation  int64     `db:"price_installation"`
	SpeedDownMbps      int       `db:"speed_down_mbps"`
	SpeedUpMbps        int       `db:"speed_up_mbps"`
	MikrotikProfile    string    `db:"mikrotik_profile"`
	OLTLineProfileID   int       `db:"olt_line_profile_id"`
	OLTSrvProfileID    int       `db:"olt_srv_profile_id"`
	VlanID             int       `db:"vlan_id"`
	IsActive           bool      `db:"is_active"`
	SortOrder          int       `db:"sort_order"`
	Terms              *string   `db:"terms"`
	CreatedAt          time.Time `db:"created_at"`
	UpdatedAt          time.Time `db:"updated_at"`
}

// RegistrationLog represents an audit log entry for a status change.
type RegistrationLog struct {
	ID             string    `db:"id"`
	RegistrationID string    `db:"registration_id"`
	StatusFrom     *string   `db:"status_from"`
	StatusTo       string    `db:"status_to"`
	ChangedBy      *string   `db:"changed_by"`
	ChangedByRole  *string   `db:"changed_by_role"`
	Reason         *string   `db:"reason"`
	Metadata       *string   `db:"metadata"`
	CreatedAt      time.Time `db:"created_at"`
}

// OLTPortConfig represents a row in the olt_port_configs table.
type OLTPortConfig struct {
	ID              string    `json:"id" db:"id"`
	Name            string    `json:"name" db:"name"`
	AreaName        string    `json:"area_name" db:"area_name"`
	OLTHost         string    `json:"olt_host" db:"olt_host"`
	OLTPortSSH      int       `json:"olt_port_ssh" db:"olt_port_ssh"`
	GponSlot        int       `json:"gpon_slot" db:"gpon_slot"`
	GponPort        int       `json:"gpon_port" db:"gpon_port"`
	MaxONT          int       `json:"max_ont" db:"max_ont"`
	CurrentONTCount int       `json:"current_ont_count" db:"current_ont_count"`
	IsActive        bool      `json:"is_active" db:"is_active"`
	Notes           *string   `json:"notes" db:"notes"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// AppConfig represents a row in the app_configs table.
type AppConfig struct {
	Key         string    `db:"key"`
	Value       string    `db:"value"`
	Description *string   `db:"description"`
	UpdatedBy   *string   `db:"updated_by"`
	UpdatedAt   time.Time `db:"updated_at"`
}
