package service

import (
	"context"

	"isp-platform/registration/services/registration/model"
)

// NotificationService defines the contract for sending notifications.
type NotificationService interface {
	// SendNewRegistrationAlert notifies CS admins of a new registration.
	SendNewRegistrationAlert(ctx context.Context, reg *model.Registration) error

	// SendSurveyScheduled notifies the customer and technician about the survey.
	SendSurveyScheduled(ctx context.Context, reg *model.Registration) error

	// SendPaymentConfirmed notifies the customer via WhatsApp that their payment is confirmed.
	SendPaymentConfirmed(ctx context.Context, reg *model.Registration) error

	// SendReceiptEmail sends a formal HTML payment receipt email to the customer.
	SendReceiptEmail(ctx context.Context, reg *model.Registration, receiptURL string) error

	// SendInvoiceLink notifies the customer of their invoice link via WA.
	SendInvoiceLink(ctx context.Context, reg *model.Registration) error

	// SendInvoiceEmail sends an HTML invoice email to the customer.
	SendInvoiceEmail(ctx context.Context, reg *model.Registration, invoiceURL string) error

	// SendActivationSuccess notifies the customer with their PPPoE credentials.
	SendActivationSuccess(ctx context.Context, reg *model.Registration) error

	// SendProvisioningFailed notifies CS admin and owner of a provisioning failure.
	SendProvisioningFailed(ctx context.Context, reg *model.Registration, errMsg string) error
}
