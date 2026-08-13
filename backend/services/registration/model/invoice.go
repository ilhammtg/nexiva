package model

import "time"

type InvoiceStatus string

const (
	InvoiceStatusUnpaid  InvoiceStatus = "unpaid"
	InvoiceStatusPaid    InvoiceStatus = "paid"
	InvoiceStatusOverdue InvoiceStatus = "overdue"
)

type Invoice struct {
	ID                 string        `db:"id" json:"id"`
	InvoiceNumber      string        `db:"invoice_number" json:"invoice_number"`
	RegistrationID     string        `db:"registration_id" json:"registration_id"`
	Period             time.Time     `db:"period" json:"period"`
	Amount             int64         `db:"amount" json:"amount"`
	TaxAmount          int64         `db:"tax_amount" json:"tax_amount"`
	DueDate            time.Time     `db:"due_date" json:"due_date"`
	Status             InvoiceStatus `db:"status" json:"status"`
	PaidAt             *time.Time    `db:"paid_at" json:"paid_at"`
	PaymentBank        *string       `db:"payment_bank" json:"payment_bank"`
	PaymentConfirmedAt *time.Time    `db:"payment_confirmed_at" json:"payment_confirmed_at"`
	PaymentConfirmedBy *string       `db:"payment_confirmed_by" json:"payment_confirmed_by"`
	CreatedAt          time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time     `db:"updated_at" json:"updated_at"`

	// Joined fields
	CustomerNumber *string `db:"customer_number" json:"customer_number,omitempty"`
	CustomerName   *string `db:"customer_name" json:"customer_name,omitempty"`
	Phone          *string `db:"phone" json:"phone,omitempty"`
	PackageName    *string `db:"package_name" json:"package_name,omitempty"`
	PackageSpeed   *int    `db:"package_speed" json:"package_speed,omitempty"`
}

type InvoiceFilter struct {
	Status         string `json:"status"`
	RegistrationID string `json:"registration_id"`
	Query          string `json:"query"`
	Limit          int    `json:"limit"`
	Offset         int    `json:"offset"`
}

type ConfirmPaymentRequest struct {
	Bank string `json:"bank"`
}
