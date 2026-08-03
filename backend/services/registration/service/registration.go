package service

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"

	"isp-platform/registration/internal/config"
	svcerr "isp-platform/registration/internal/errors"
	"isp-platform/registration/internal/utils"
	"isp-platform/registration/internal/ws"
	"isp-platform/registration/pkg/crypto"
	"isp-platform/registration/pkg/mikrotik"
	"isp-platform/registration/services/notification/service"
	provModel "isp-platform/registration/services/provisioning/model"
	provSvc "isp-platform/registration/services/provisioning/service"
	"isp-platform/registration/services/registration/model"
	"isp-platform/registration/services/registration/repository"
)

type registrationService struct {
	repo     repository.RegistrationRepository
	provSvc  provSvc.ProvisioningService
	notifSvc service.NotificationService
	cfg      *config.Config
	logger   *zap.Logger
	wsHub    *ws.Hub
	db       interface{ QueryRowContext(context.Context, string, ...interface{}) interface{ Scan(...interface{}) error } }
}

// NewRegistrationService constructs a RegistrationService.
// The db parameter is used only for reg_number generation and accepts *sqlx.DB.
func NewRegistrationService(
	repo repository.RegistrationRepository,
	provSvc provSvc.ProvisioningService,
	notifSvc service.NotificationService,
	cfg *config.Config,
	log *zap.Logger,
	wsHub *ws.Hub,
) RegistrationService {
	return &registrationService{
		repo:     repo,
		provSvc:  provSvc,
		notifSvc: notifSvc,
		cfg:      cfg,
		logger:   log,
		wsHub:    wsHub,
	}
}

func (s *registrationService) Submit(ctx context.Context, input SubmitInput) (*model.Registration, error) {
	// Validate NIK uniqueness if provided
	if input.NIK != "" {
		existingReg, err := s.repo.GetByNIK(ctx, input.NIK)
		if err == nil && existingReg != nil {
			return nil, fmt.Errorf("%w: NIK %s sudah terdaftar di sistem kami", svcerr.ErrValidation, input.NIK)
		}
	}

	// Validate locked regions if config exists
	configs, err := s.repo.ListConfigs(ctx)
	if err == nil {
		lockedRegions := ""
		for _, cfg := range configs {
			if cfg.Key == "locked_regions" {
				lockedRegions = cfg.Value
				break
			}
		}
		if lockedRegions != "" {
			allowedCities := strings.Split(lockedRegions, ",")
			cityAllowed := false
			inputCityLower := strings.ToLower(strings.TrimSpace(input.City))
			for _, ac := range allowedCities {
				acTrimmed := strings.ToLower(strings.TrimSpace(ac))
				if acTrimmed == "" {
					continue
				}
				if strings.Contains(inputCityLower, acTrimmed) || strings.Contains(acTrimmed, inputCityLower) {
					cityAllowed = true
					break
				}
			}
			if !cityAllowed {
				return nil, fmt.Errorf("%w: pendaftaran hanya dibuka untuk wilayah %s", svcerr.ErrValidation, lockedRegions)
			}
		}
	}

	// Generate registration number
	regNumber, err := s.generateRegNumber(ctx)
	if err != nil {
		return nil, err
	}

	var customerID *string
	var nik *string
	if input.NIK != "" {
		nik = &input.NIK
	}
	var email *string
	if input.Email != "" {
		email = &input.Email
	}
	var rt, rw *string
	if input.RT != "" {
		rt = &input.RT
	}
	if input.RW != "" {
		rw = &input.RW
	}
	var ktpPath *string
	if input.KTPFilePath != "" {
		ktpPath = &input.KTPFilePath
	}

	var mapsLat, mapsLng *float64
	if input.GoogleMapsLink != "" {
		if latParsed, lngParsed := parseCoordinatesFromGmaps(input.GoogleMapsLink); latParsed != nil && lngParsed != nil {
			mapsLat = latParsed
			mapsLng = lngParsed
		}
	}
	if mapsLat == nil || mapsLng == nil {
		mapsLat = input.MapsLat
		mapsLng = input.MapsLng
	}

	var gmapsLink *string
	if input.GoogleMapsLink != "" {
		gmapsLink = &input.GoogleMapsLink
	}

	reg := &model.Registration{
		RegNumber:      regNumber,
		CustomerID:     customerID,
		FullName:       input.FullName,
		NIK:            nik,
		Phone:          input.Phone,
		Email:          email,
		Province:       input.Province,
		City:           input.City,
		District:       input.District,
		Village:        input.Village,
		RT:             rt,
		RW:             rw,
		AddressDetail:  input.AddressDetail,
		MapsLat:        mapsLat,
		MapsLng:        mapsLng,
		PackageID:      input.PackageID,
		KTPFilePath:    ktpPath,
		GoogleMapsLink: gmapsLink,
	}
	if input.ONTSerialNumber != "" {
		reg.ONTSerialNumber = &input.ONTSerialNumber
	}
	if input.OLTPortConfigID != "" {
		reg.OLTPortConfigID = &input.OLTPortConfigID
	}

	created, err := s.repo.Create(ctx, reg)
	if err != nil {
		return nil, fmt.Errorf("registrationSvc.Submit: %w", err)
	}

	s.logger.Info("new registration submitted",
		zap.String("reg_number", created.RegNumber),
		zap.String("phone", created.Phone),
	)

	// Broadcast real-time update to dashboard
	s.broadcast("registration_created", created)

	// Notify CS asynchronously
	go s.notifSvc.SendNewRegistrationAlert(context.Background(), created)

	return created, nil
}

func (s *registrationService) CheckStatus(ctx context.Context, phone, regNumber string) (*model.Registration, []model.RegistrationLog, error) {
	if phone != "" {
		phoneClean := strings.TrimSpace(phone)
		re := regexp.MustCompile(`^(08|628|\+628)[0-9]{8,12}$`)
		if !re.MatchString(phoneClean) {
			return nil, nil, fmt.Errorf("%w: format nomor WhatsApp tidak valid", svcerr.ErrValidation)
		}
	}

	var reg *model.Registration
	var err error

	if regNumber != "" {
		reg, err = s.repo.GetByRegNumber(ctx, regNumber)
		if err == nil && reg != nil && phone != "" {
			var inputSb, regSb strings.Builder
			for _, char := range phone {
				if char >= '0' && char <= '9' {
					inputSb.WriteRune(char)
				}
			}
			for _, char := range reg.Phone {
				if char >= '0' && char <= '9' {
					regSb.WriteRune(char)
				}
			}
			inputClean := inputSb.String()
			regClean := regSb.String()

			suffixMatch := false
			if len(inputClean) >= 9 && len(regClean) >= 9 {
				inputSuffix := inputClean[len(inputClean)-9:]
				regSuffix := regClean[len(regClean)-9:]
				suffixMatch = inputSuffix == regSuffix
			} else {
				suffixMatch = inputClean == regClean
			}

			if !suffixMatch {
				return nil, nil, fmt.Errorf("%w: nomor WhatsApp tidak sesuai dengan nomor registrasi", svcerr.ErrValidation)
			}
		}
	} else if phone != "" {
		reg, err = s.repo.GetByPhone(ctx, phone)
	} else {
		return nil, nil, fmt.Errorf("%w: phone atau reg_number diperlukan", svcerr.ErrValidation)
	}

	if err != nil {
		return nil, nil, err
	}

	logs, err := s.repo.GetLogs(ctx, reg.ID)
	if err != nil {
		return nil, nil, err
	}

	return reg, logs, nil
}

func (s *registrationService) ListPackages(ctx context.Context) ([]model.Package, error) {
	return s.repo.ListPackages(ctx, true)
}

func (s *registrationService) ListAllPackages(ctx context.Context) ([]model.Package, error) {
	return s.repo.ListPackages(ctx, false)
}

func (s *registrationService) AdminList(ctx context.Context, filter repository.ListFilter) ([]model.Registration, int, error) {
	return s.repo.List(ctx, filter)
}

func (s *registrationService) GetDetail(ctx context.Context, id string) (*model.Registration, []model.RegistrationLog, error) {
	reg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	logs, err := s.repo.GetLogs(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	return reg, logs, nil
}

func (s *registrationService) Approve(ctx context.Context, id, approverID, approverRole string, input ApproveInput) error {
	reg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if !reg.Status.CanTransitionTo(model.StatusSurveyScheduled) {
		return fmt.Errorf("%w: status %s tidak bisa diubah ke survey_scheduled", svcerr.ErrInvalidTransition, reg.Status)
	}

	// Set technician and survey schedule
	fields := map[string]interface{}{
		"technician_id":       input.TechnicianID,
		"survey_scheduled_at": input.SurveyScheduledAt,
		"cs_user_id":          approverID,
	}
	if err := s.repo.UpdateFields(ctx, id, fields); err != nil {
		return err
	}

	err = s.repo.UpdateStatus(ctx, id, model.StatusSurveyScheduled, approverID, approverRole, input.Notes)
	if err == nil {
		s.broadcastUpdate(ctx, id)
	}
	return err
}

func (s *registrationService) Reject(ctx context.Context, id, rejectorID, role, reason string) error {
	reg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if !reg.Status.CanTransitionTo(model.StatusRejected) {
		return fmt.Errorf("%w: status %s tidak bisa diubah ke rejected", svcerr.ErrInvalidTransition, reg.Status)
	}

	if err := s.repo.UpdateFields(ctx, id, map[string]interface{}{"rejection_reason": reason}); err != nil {
		return err
	}

	err = s.repo.UpdateStatus(ctx, id, model.StatusRejected, rejectorID, role, reason)
	if err == nil {
		s.broadcastUpdate(ctx, id)
	}
	return err
}

func (s *registrationService) ConfirmPayment(ctx context.Context, id, confirmedByID, role string, input ConfirmPaymentInput) error {
	reg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if !reg.Status.CanTransitionTo(model.StatusPaymentConfirmed) {
		return fmt.Errorf("%w: status %s tidak bisa diubah ke payment_confirmed", svcerr.ErrInvalidTransition, reg.Status)
	}

	now := time.Now()
	fields := map[string]interface{}{
		"payment_amount":       input.PaymentAmount,
		"payment_date":         input.PaymentDate,
		"payment_bank":         input.PaymentBank,
		"payment_confirmed_by": confirmedByID,
		"payment_confirmed_at": now,
	}
	if err := s.repo.UpdateFields(ctx, id, fields); err != nil {
		return err
	}

	if err := s.repo.UpdateStatus(ctx, id, model.StatusPaymentConfirmed, confirmedByID, role, input.Notes); err != nil {
		return err
	}

	// Trigger payment confirmation WhatsApp notification asynchronously
	updatedReg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		s.logger.Error("failed to get registration for payment confirmation notification",
			zap.String("registration_id", id),
			zap.Error(err),
		)
	} else {
		s.broadcast("registration_updated", updatedReg)
		receiptURL := fmt.Sprintf("%s/receipt/%s", s.cfg.AppBaseURL, id)
		go func() {
			bgCtx := context.Background()
			// 1. WhatsApp: payment confirmed message (existing)
			if err := s.notifSvc.SendPaymentConfirmed(bgCtx, updatedReg); err != nil {
				s.logger.Error("failed to send payment confirmed WA notification",
					zap.String("registration_id", id),
					zap.Error(err),
				)
			}
			// 2. Email: formal HTML receipt with download link
			if err := s.notifSvc.SendReceiptEmail(bgCtx, updatedReg, receiptURL); err != nil {
				s.logger.Error("failed to send receipt email",
					zap.String("registration_id", id),
					zap.Error(err),
				)
			}
		}()
	}

	// Trigger provisioning automatically ONLY IF OLT Port is already assigned (e.g. if set by admin earlier)

	if reg.OLTPortConfigID != nil && *reg.OLTPortConfigID != "" {
		go func() {
			err := s.TriggerProvisioning(context.Background(), id, confirmedByID, role, ActivateInput{})
			if err != nil {
				s.logger.Error("failed to auto trigger provisioning after payment confirmation",
					zap.String("registration_id", id),
					zap.Error(err),
				)
			}
		}()
	}

	return nil
}

func (s *registrationService) ScheduleInstallation(ctx context.Context, id, scheduledByID, role string, input ScheduleInstallationInput) error {
	reg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if !reg.Status.CanTransitionTo(model.StatusInstallationScheduled) {
		return fmt.Errorf("%w: status %s tidak bisa diubah ke installation_scheduled", svcerr.ErrInvalidTransition, reg.Status)
	}

	fields := map[string]interface{}{
		"technician_id":            input.TechnicianID,
		"installation_scheduled_at": input.InstallationScheduledAt,
		"installation_fee":         input.InstallationFee,
	}
	if input.PPPoEUsername != "" {
		fields["pppoe_username"] = input.PPPoEUsername
	}
	if err := s.repo.UpdateFields(ctx, id, fields); err != nil {
		return err
	}

	err = s.repo.UpdateStatus(ctx, id, model.StatusInstallationScheduled, scheduledByID, role, input.Notes)
	if err == nil {
		s.broadcastUpdate(ctx, id)
	}
	return err
}

func (s *registrationService) UpdateInternalNotes(ctx context.Context, id, notes string) error {
	err := s.repo.UpdateFields(ctx, id, map[string]interface{}{"internal_notes": notes})
	if err == nil {
		s.broadcastUpdate(ctx, id)
	}
	return err
}

func (s *registrationService) UpdateRegistration(ctx context.Context, id string, fields map[string]interface{}) error {
	// Parse maps_lat and maps_lng to float64 if they are sent as string
	for k, v := range fields {
		if k == "maps_lat" || k == "maps_lng" {
			if strVal, ok := v.(string); ok {
				if floatVal, err := strconv.ParseFloat(strVal, 64); err == nil {
					fields[k] = floatVal
				}
			}
		}
	}
	err := s.repo.UpdateFields(ctx, id, fields)
	if err == nil {
		s.broadcastUpdate(ctx, id)
	}
	return err
}

func (s *registrationService) Delete(ctx context.Context, id string) error {
	err := s.repo.Delete(ctx, id)
	if err == nil {
		s.broadcast("registration_deleted", id)
	}
	return err
}

func (s *registrationService) TechnicianSchedule(ctx context.Context, technicianID, date, taskType string) ([]model.Registration, error) {
	filter := repository.ListFilter{
		Pagination: utils.PaginationParams{PerPage: 100, Offset: 0},
	}

	// Simplified: returns all assigned registrations for this technician
	// In production, filter by date and task type
	regs, _, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, err
	}

	// Filter in-memory by technician or available tickets
	var result []model.Registration
	for _, r := range regs {
		if taskType == "available" {
			// Tiket yang belum diambil (belum ada teknisi dan statusnya pending_review)
			if r.TechnicianID == nil && r.Status == model.StatusPendingReview {
				result = append(result, r)
			}
		} else {
			// Tiket yang sudah diambil oleh teknisi ini
			if r.TechnicianID != nil && *r.TechnicianID == technicianID {
				result = append(result, r)
			}
		}
	}
	return result, nil
}

func (s *registrationService) ClaimTicket(ctx context.Context, id, technicianID, role string) error {
	reg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if reg.TechnicianID != nil {
		return fmt.Errorf("%w: tiket ini sudah diambil oleh teknisi lain", svcerr.ErrValidation)
	}
	if reg.Status != model.StatusPendingReview {
		return fmt.Errorf("%w: tiket hanya bisa diambil saat status pending_review", svcerr.ErrInvalidTransition)
	}

	// Update technician_id
	fields := map[string]interface{}{
		"technician_id": technicianID,
	}
	if err := s.repo.UpdateFields(ctx, id, fields); err != nil {
		return err
	}

	err = s.repo.UpdateStatus(ctx, id, model.StatusSurveyScheduled, technicianID, role, "Teknisi mengambil tiket pemasangan")
	if err == nil {
		s.broadcastUpdate(ctx, id)
	}
	return err
}

func (s *registrationService) UpdateSurveyResult(ctx context.Context, id, technicianID, role string, input SurveyResultInput) error {
	reg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if reg.Status != model.StatusSurveyScheduled && reg.Status != model.StatusSurveyPending {
		return fmt.Errorf("%w: status %s tidak valid untuk update hasil survei", svcerr.ErrInvalidTransition, reg.Status)
	}

	now := time.Now()
	fields := map[string]interface{}{
		"survey_notes":          input.Notes,
		"survey_cable_length_m": input.CableLengthM,
	}

	var nextStatus model.Status
	var isFeasible *bool

	statusStr := input.Status
	if statusStr == "" {
		if input.IsFeasible != nil {
			if *input.IsFeasible {
				statusStr = "feasible"
			} else {
				statusStr = "failed"
			}
		} else {
			statusStr = "pending"
		}
	}

	switch statusStr {
	case "feasible":
		val := true
		isFeasible = &val
		fields["survey_is_feasible"] = isFeasible
		fields["survey_done_at"] = now
		nextStatus = model.StatusInstallationScheduled
		fields["installation_scheduled_at"] = now
	case "failed":
		val := false
		isFeasible = &val
		fields["survey_is_feasible"] = isFeasible
		fields["survey_done_at"] = now
		nextStatus = model.StatusSurveyFailed
	case "pending":
		fields["survey_is_feasible"] = nil
		fields["survey_done_at"] = now
		nextStatus = model.StatusSurveyPending
	default:
		return fmt.Errorf("%w: status survei %s tidak valid", svcerr.ErrValidation, statusStr)
	}

	if err := s.repo.UpdateFields(ctx, id, fields); err != nil {
		return err
	}

	reason := input.Notes
	if reason == "" {
		switch statusStr {
		case "feasible":
			reason = "Survei layak, dilanjutkan ke instalasi"
		case "failed":
			reason = "Survei tidak layak"
		case "pending":
			reason = "Survei ditunda (pending)"
		}
	}

	err = s.repo.UpdateStatus(ctx, id, nextStatus, technicianID, role, reason)
	if err == nil {
		s.broadcastUpdate(ctx, id)
	}
	return err
}

func (s *registrationService) TriggerProvisioning(ctx context.Context, id, technicianID, role string, input ActivateInput) error {
	reg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if !reg.Status.CanTransitionTo(model.StatusProvisioning) {
		return fmt.Errorf("%w: status %s tidak bisa diubah ke provisioning", svcerr.ErrInvalidTransition, reg.Status)
	}

	var custNum string
	if reg.CustomerNumber != nil {
		custNum = *reg.CustomerNumber
	}

	if custNum == "" {
		generated, err := s.generateCustomerNumber(ctx, reg)
		if err != nil {
			return err
		}
		custNum = generated
	}

	fields := map[string]interface{}{}
	if input.ONTSerialNumber != "" {
		fields["ont_serial_number"] = input.ONTSerialNumber
	}
	if input.OLTPortConfigID != "" {
		fields["olt_port_config_id"] = input.OLTPortConfigID
	}
	if input.MapsLat != nil {
		fields["maps_lat"] = input.MapsLat
	}
	if input.MapsLng != nil {
		fields["maps_lng"] = input.MapsLng
	}
	if input.ODPInfo != "" {
		fields["odp_info"] = input.ODPInfo
	}
	if input.GoogleMapsLink != "" {
		fields["google_maps_link"] = input.GoogleMapsLink
	}

	fields["customer_number"] = custNum
	if input.PPPoEUsername != "" {
		fields["pppoe_username"] = input.PPPoEUsername
	} else {
		// generate fallback username
		configs, _ := s.repo.ListConfigs(ctx)
		domain := "ptnat.net"
		prefix := ""
		for _, cfg := range configs {
			if cfg.Key == "pppoe_domain_suffix" {
				domain = cfg.Value
			}
			if cfg.Key == "pppoe_username_prefix" {
				prefix = cfg.Value
			}
		}

		username := custNum
		if prefix != "" {
			if !strings.HasPrefix(custNum, prefix) {
				username = prefix + custNum
			}
		}
		fields["pppoe_username"] = username + "@" + domain
	}
	if input.PPPoEPassword != "" {
		fields["pppoe_password"] = input.PPPoEPassword
	} else {
		fields["pppoe_password"] = time.Now().Format("02012006")
	}

	if len(fields) > 0 {
		if err := s.repo.UpdateFields(ctx, id, fields); err != nil {
			return err
		}
	}

	// Set who triggered the provisioning
	var notes string
	if role == "cs_admin" || role == "owner" {
		notes = "CS/Owner memulai aktivasi jaringan"
	} else {
		notes = "Teknisi memulai aktivasi"
	}

	if err := s.repo.UpdateStatus(ctx, id, model.StatusProvisioning, technicianID, role, notes); err != nil {
		return err
	}
	s.broadcastUpdate(ctx, id)

	// Dispatch provisioning job asynchronously
	go func() {
		if err := s.provSvc.Dispatch(context.Background(), id); err != nil {
			s.logger.Error("failed to dispatch provisioning job",
				zap.String("registration_id", id),
				zap.Error(err),
			)
		}
	}()

	return nil
}

func (s *registrationService) CompleteInstallation(ctx context.Context, id, technicianID, role string, input ActivateInput) error {
	reg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if !reg.Status.CanTransitionTo(model.StatusWaitingPayment) {
		return fmt.Errorf("%w: status %s tidak bisa diubah ke waiting_payment", svcerr.ErrInvalidTransition, reg.Status)
	}

	var mapsLat, mapsLng *float64
	if input.GoogleMapsLink != "" {
		if latParsed, lngParsed := parseCoordinatesFromGmaps(input.GoogleMapsLink); latParsed != nil && lngParsed != nil {
			mapsLat = latParsed
			mapsLng = lngParsed
		}
	}
	if mapsLat == nil || mapsLng == nil {
		mapsLat = input.MapsLat
		mapsLng = input.MapsLng
	}

	fields := map[string]interface{}{
		"ont_serial_number": input.ONTSerialNumber,
	}
	if mapsLat != nil {
		fields["maps_lat"] = mapsLat
	}
	if mapsLng != nil {
		fields["maps_lng"] = mapsLng
	}
	if input.ODPInfo != "" {
		fields["odp_info"] = input.ODPInfo
	}
	if input.GoogleMapsLink != "" {
		fields["google_maps_link"] = input.GoogleMapsLink
	}
	if input.ONTPhotoPath != "" {
		fields["ont_photo_path"] = input.ONTPhotoPath
	}

	if err := s.repo.UpdateFields(ctx, id, fields); err != nil {
		return err
	}

	if err := s.repo.UpdateStatus(ctx, id, model.StatusWaitingPayment, technicianID, role, "Teknisi menyelesaikan pemasangan kabel & perangkat ONT"); err != nil {
		return err
	}

	// Trigger invoice WhatsApp & Email notifications asynchronously
	updatedReg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		s.logger.Error("failed to get registration for invoice notification",
			zap.String("registration_id", id),
			zap.Error(err),
		)
	} else {
		s.broadcast("registration_updated", updatedReg)
		invoiceURL := fmt.Sprintf("%s/invoice/%s", s.cfg.AppBaseURL, id)
		go func() {
			bgCtx := context.Background()
			// 1. WhatsApp: Invoice link message
			if err := s.notifSvc.SendInvoiceLink(bgCtx, updatedReg); err != nil {
				s.logger.Error("failed to send invoice WA notification",
					zap.String("registration_id", id),
					zap.Error(err),
				)
			}
			// 2. Email: HTML Invoice document
			if err := s.notifSvc.SendInvoiceEmail(bgCtx, updatedReg, invoiceURL); err != nil {
				s.logger.Error("failed to send invoice email",
					zap.String("registration_id", id),
					zap.Error(err),
				)
			}
		}()
	}

	return nil
}

func (s *registrationService) Dashboard(ctx context.Context, period string) (map[string]int, error) {
	return s.repo.CountByStatus(ctx, period)
}

func (s *registrationService) CreatePackage(ctx context.Context, p *model.Package) (*model.Package, error) {
	return s.repo.CreatePackage(ctx, p)
}

func (s *registrationService) UpdatePackage(ctx context.Context, p *model.Package) error {
	return s.repo.UpdatePackage(ctx, p)
}

func (s *registrationService) TogglePackage(ctx context.Context, id string) (bool, error) {
	return s.repo.TogglePackage(ctx, id)
}

func (s *registrationService) ListOLTPorts(ctx context.Context) ([]model.OLTPortConfig, error) {
	return s.repo.ListOLTPorts(ctx)
}

func (s *registrationService) CreateOLTPort(ctx context.Context, p *model.OLTPortConfig) (*model.OLTPortConfig, error) {
	return s.repo.CreateOLTPort(ctx, p)
}

func (s *registrationService) UpdateOLTPort(ctx context.Context, p *model.OLTPortConfig) error {
	return s.repo.UpdateOLTPort(ctx, p)
}

func (s *registrationService) DeleteOLTPort(ctx context.Context, id string) error {
	return s.repo.DeleteOLTPort(ctx, id)
}

func (s *registrationService) ListConfigs(ctx context.Context) ([]model.AppConfig, error) {
	return s.repo.ListConfigs(ctx)
}

func (s *registrationService) UpdateConfig(ctx context.Context, key, value, updatedBy string) error {
	return s.repo.UpdateConfig(ctx, key, value, updatedBy)
}

func (s *registrationService) ListActivityLogs(ctx context.Context, filter repository.ListFilter) ([]model.RegistrationLog, int, error) {
	return s.repo.ListActivityLogs(ctx, filter)
}

// --- private helpers ---

func (s *registrationService) generateRegNumber(ctx context.Context) (string, error) {
	configs, err := s.repo.ListConfigs(ctx)
	prefix := "REG"
	if err == nil {
		for _, cfg := range configs {
			if cfg.Key == "reg_number_prefix" {
				prefix = cfg.Value
			}
		}
	}

	today := time.Now().Format("20060102")
	prefixWithDate := prefix + today

	lastRegNum, err := s.repo.GetLastRegistrationNumber(ctx, prefixWithDate)
	if err != nil || lastRegNum == "" {
		return prefixWithDate + "0001", nil
	}

	seqStr := strings.TrimPrefix(lastRegNum, prefixWithDate)
	seqNum, err := strconv.Atoi(seqStr)
	if err != nil {
		return prefixWithDate + "0001", nil
	}

	padWidth := len(seqStr)
	if padWidth < 4 {
		padWidth = 4
	}

	formatStr := fmt.Sprintf("%%0%dd", padWidth)
	nextSeq := fmt.Sprintf(formatStr, seqNum+1)

	return prefixWithDate + nextSeq, nil
}

func (s *registrationService) generatePPPoEUsername(regNumber string) string {
	configs, _ := s.repo.ListConfigs(context.Background())
	domain := "ptnat.net"
	prefix := ""
	for _, cfg := range configs {
		if cfg.Key == "pppoe_domain_suffix" {
			domain = cfg.Value
		}
		if cfg.Key == "pppoe_username_prefix" {
			prefix = cfg.Value
		}
	}

	seq := regNumber
	if len(regNumber) == 17 && strings.HasPrefix(regNumber, "REG-") {
		// YYMMDD (e.g. 260713) + SEQ (e.g. 0001)
		seq = regNumber[6:12] + regNumber[13:]
	} else {
		// Fallback: strip "REG-" and "-"
		seq = strings.ReplaceAll(regNumber, "REG-", "")
		seq = strings.ReplaceAll(seq, "-", "")
	}

	return prefix + seq + "@" + domain
}

func (s *registrationService) ListMikrotikConfigs(ctx context.Context) ([]model.MikrotikConfig, error) {
	return s.repo.ListMikrotikConfigs(ctx)
}

func (s *registrationService) GetMikrotikConfig(ctx context.Context, id string) (*model.MikrotikConfig, error) {
	return s.repo.GetMikrotikConfigByID(ctx, id)
}

func (s *registrationService) CreateMikrotikConfig(ctx context.Context, m *model.MikrotikConfig, plainPassword string) (*model.MikrotikConfig, error) {
	encPassword, err := crypto.Encrypt(plainPassword, s.cfg.AppSecretKey)
	if err != nil {
		return nil, fmt.Errorf("regSvc.CreateMikrotikConfig: encrypt password: %w", err)
	}
	m.PasswordEnc = encPassword
	return s.repo.CreateMikrotikConfig(ctx, m)
}

func (s *registrationService) UpdateMikrotikConfig(ctx context.Context, id string, m *model.MikrotikConfig, plainPassword string) error {
	existing, err := s.repo.GetMikrotikConfigByID(ctx, id)
	if err != nil {
		return err
	}

	m.ID = id
	if plainPassword != "" {
		encPassword, err := crypto.Encrypt(plainPassword, s.cfg.AppSecretKey)
		if err != nil {
			return fmt.Errorf("regSvc.UpdateMikrotikConfig: encrypt password: %w", err)
		}
		m.PasswordEnc = encPassword
	} else {
		m.PasswordEnc = existing.PasswordEnc
	}

	return s.repo.UpdateMikrotikConfig(ctx, m)
}

func (s *registrationService) DeleteMikrotikConfig(ctx context.Context, id string) error {
	return s.repo.DeleteMikrotikConfig(ctx, id)
}

func (s *registrationService) ToggleMikrotikConfig(ctx context.Context, id string) (bool, error) {
	return s.repo.ToggleMikrotikConfig(ctx, id)
}

func (s *registrationService) TestMikrotikConnection(ctx context.Context, id string) (bool, error) {
	m, err := s.repo.GetMikrotikConfigByID(ctx, id)
	if err != nil {
		return false, err
	}

	// In dev mode, let's mock the Mikrotik ping test.
	// In production, we'd decrypt password and make TCP/API call.
	_, err = crypto.Decrypt(m.PasswordEnc, s.cfg.AppSecretKey)
	if err != nil {
		return false, fmt.Errorf("failed to decrypt password: %w", err)
	}

	// Toggle online status
	isOnline := true
	if err := s.repo.UpdateMikrotikStatus(ctx, id, isOnline); err != nil {
		return false, err
	}

	return isOnline, nil
}

func parseCoordinatesFromGmaps(link string) (*float64, *float64) {
	if link == "" {
		return nil, nil
	}

	resolvedLink := link
	if strings.Contains(link, "maps.app.goo.gl") || strings.Contains(link, "goo.gl/maps") || (strings.Contains(link, "google.com") && !strings.Contains(link, "@") && !strings.Contains(link, "q=")) {
		client := &http.Client{
			Timeout: 4 * time.Second,
		}
		resp, err := client.Get(link)
		if err == nil {
			resolvedLink = resp.Request.URL.String()
			resp.Body.Close()
		}
	}

	// Match coordinate pattern like @-6.21412,106.84543 or q=-6.21412,106.84543
	re := regexp.MustCompile(`(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)`)
	matches := re.FindStringSubmatch(resolvedLink)
	if len(matches) == 3 {
		lat, err1 := strconv.ParseFloat(matches[1], 64)
		lng, err2 := strconv.ParseFloat(matches[2], 64)
		if err1 == nil && err2 == nil {
			return &lat, &lng
		}
	}
	return nil, nil
}

func (s *registrationService) GetProvisioningLogs(ctx context.Context, registrationID string) ([]provModel.ProvisioningLog, error) {
	return s.provSvc.GetLogs(ctx, registrationID)
}

func (s *registrationService) getMikrotikClient(ctx context.Context, id string) (*mikrotik.Client, error) {
	m, err := s.repo.GetMikrotikConfigByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get Mikrotik config: %w", err)
	}
	plainPassword, err := crypto.Decrypt(m.PasswordEnc, s.cfg.AppSecretKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt password: %w", err)
	}
	return mikrotik.NewClient(m.Host, m.Port, m.Username, plainPassword), nil
}

func (s *registrationService) GetMikrotikResources(ctx context.Context, id string) (*mikrotik.ResourceInfo, error) {
	client, err := s.getMikrotikClient(ctx, id)
	if err != nil {
		return nil, err
	}
	return client.GetResources()
}

func (s *registrationService) GetMikrotikActiveConnections(ctx context.Context, id string) ([]mikrotik.ActiveConnection, error) {
	client, err := s.getMikrotikClient(ctx, id)
	if err != nil {
		return nil, err
	}
	return client.GetActiveConnections()
}

func (s *registrationService) GetMikrotikPPPSecrets(ctx context.Context, id string) ([]mikrotik.PPPSecret, error) {
	client, err := s.getMikrotikClient(ctx, id)
	if err != nil {
		return nil, err
	}
	return client.GetPPPSecrets()
}

func (s *registrationService) GetMikrotikTraffic(ctx context.Context, id string) ([]mikrotik.InterfaceTraffic, error) {
	client, err := s.getMikrotikClient(ctx, id)
	if err != nil {
		return nil, err
	}
	return client.GetTraffic()
}

func (s *registrationService) GetMikrotikLogs(ctx context.Context, id string) ([]mikrotik.LogEntry, error) {
	client, err := s.getMikrotikClient(ctx, id)
	if err != nil {
		return nil, err
	}
	return client.GetLogs()
}

func (s *registrationService) DisconnectMikrotikActiveConnection(ctx context.Context, id string, name string) error {
	client, err := s.getMikrotikClient(ctx, id)
	if err != nil {
		return err
	}
	return client.DisconnectActiveConnection(name)
}

func (s *registrationService) ToggleMikrotikSecret(ctx context.Context, id string, name string, disabled bool) error {
	client, err := s.getMikrotikClient(ctx, id)
	if err != nil {
		return err
	}
	return client.ToggleSecret(name, disabled)
}

func (s *registrationService) AddMikrotikSecret(ctx context.Context, id string, name, password, profile, service string) error {
	client, err := s.getMikrotikClient(ctx, id)
	if err != nil {
		return err
	}
	return client.AddSecret(name, password, profile, service)
}

func cleanAreaCode(area string) string {
	var sb strings.Builder
	for _, r := range area {
		if r >= '0' && r <= '9' {
			sb.WriteRune(r)
		}
	}
	digits := sb.String()
	if digits == "" {
		return "000"
	}
	if len(digits) > 3 {
		return digits[:3]
	}
	for len(digits) < 3 {
		digits = "0" + digits
	}
	return digits
}

func parseSerial(custNum string, format []string, separator string, areaCode string, targetYear2, targetYear4, targetMonth string, enforceMatch bool) (int, bool) {
	var parts []string
	if separator != "" && separator != "none" {
		parts = strings.Split(custNum, separator)
		if len(parts) != len(format) {
			return 0, false
		}
		// Validate that the other components match the target values (if we are doing matching for reset/grouping)
		serialIdx := -1
		for i, comp := range format {
			if comp == "SERIAL" {
				serialIdx = i
				continue
			}
			if !enforceMatch {
				continue
			}
			val := parts[i]
			switch comp {
			case "YEAR":
				if val != targetYear2 {
					return 0, false
				}
			case "YEAR4":
				if val != targetYear4 {
					return 0, false
				}
			case "MONTH":
				if val != targetMonth {
					return 0, false
				}
			case "AREA":
				if val != areaCode {
					return 0, false
				}
			case "SUFFIX":
				if val != "01" {
					return 0, false
				}
			}
		}
		if serialIdx != -1 {
			seq, err := strconv.Atoi(parts[serialIdx])
			if err == nil {
				return seq, true
			}
		}
	} else {
		// No separator. We have to parse by length.
		fixedLen := 0
		for _, comp := range format {
			switch comp {
			case "YEAR":
				fixedLen += 2
			case "YEAR4":
				fixedLen += 4
			case "MONTH":
				fixedLen += 2
			case "AREA":
				fixedLen += 3
			case "SUFFIX":
				fixedLen += 2
			}
		}
		if len(custNum) <= fixedLen {
			return 0, false
		}
		currentIdx := 0
		serialStr := ""
		for _, comp := range format {
			if comp == "SERIAL" {
				serialLen := len(custNum) - fixedLen
				if currentIdx+serialLen > len(custNum) {
					return 0, false
				}
				serialStr = custNum[currentIdx : currentIdx+serialLen]
				currentIdx += serialLen
			} else {
				var compLen int
				var expectedVal string
				switch comp {
				case "YEAR":
					compLen = 2
					expectedVal = targetYear2
				case "YEAR4":
					compLen = 4
					expectedVal = targetYear4
				case "MONTH":
					compLen = 2
					expectedVal = targetMonth
				case "AREA":
					compLen = 3
					expectedVal = areaCode
				case "SUFFIX":
					compLen = 2
					expectedVal = "01"
				}
				if currentIdx+compLen > len(custNum) {
					return 0, false
				}
				if enforceMatch {
					val := custNum[currentIdx : currentIdx+compLen]
					if val != expectedVal {
						return 0, false
					}
				}
				currentIdx += compLen
			}
		}
		if serialStr != "" {
			seq, err := strconv.Atoi(serialStr)
			if err == nil {
				return seq, true
			}
		}
	}
	return 0, false
}

func (s *registrationService) generateCustomerNumber(ctx context.Context, reg *model.Registration) (string, error) {
	configs, err := s.repo.ListConfigs(ctx)
	if err != nil {
		return "", err
	}

	// Default config values
	formatCfg := "YEAR,SERIAL"
	startCfg := "1"
	resetCfg := "NEVER"
	separatorCfg := "none"

	for _, cfg := range configs {
		switch cfg.Key {
		case "cust_number_format":
			formatCfg = cfg.Value
		case "cust_number_start":
			startCfg = cfg.Value
		case "cust_number_reset":
			resetCfg = cfg.Value
		case "cust_number_separator":
			separatorCfg = cfg.Value
		}
	}

	startNum, err := strconv.Atoi(startCfg)
	if err != nil {
		startNum = 1
	}

	format := strings.Split(formatCfg, ",")
	for i := range format {
		format[i] = strings.TrimSpace(format[i])
	}

	now := time.Now()
	targetYear2 := now.Format("06")
	targetYear4 := now.Format("2006")
	targetMonth := now.Format("01")

	areaCode := "000"
	if reg.OLTPortConfigID != nil && *reg.OLTPortConfigID != "" {
		oltPort, err := s.repo.GetOLTPortByID(ctx, *reg.OLTPortConfigID)
		if err == nil && oltPort != nil {
			areaCode = cleanAreaCode(oltPort.AreaName)
		}
	} else if reg.City != "" {
		areaCode = cleanAreaCode(reg.City)
	}

	custNums, err := s.repo.GetAllCustomerNumbers(ctx)
	if err != nil {
		return "", err
	}

	maxSerial := startNum - 1
	enforceMatch := resetCfg == "YEARLY" || resetCfg == "MONTHLY"

	for _, cn := range custNums {
		seq, ok := parseSerial(cn, format, separatorCfg, areaCode, targetYear2, targetYear4, targetMonth, enforceMatch)
		if ok {
			if seq > maxSerial {
				maxSerial = seq
			}
		}
	}

	nextSerial := maxSerial + 1

	var parts []string
	for _, comp := range format {
		switch comp {
		case "YEAR":
			parts = append(parts, targetYear2)
		case "YEAR4":
			parts = append(parts, targetYear4)
		case "MONTH":
			parts = append(parts, targetMonth)
		case "AREA":
			parts = append(parts, areaCode)
		case "SERIAL":
			padWidth := len(startCfg)
			if padWidth < 4 {
				padWidth = 4
			}
			formatStr := fmt.Sprintf("%%0%dd", padWidth)
			parts = append(parts, fmt.Sprintf(formatStr, nextSerial))
		case "SUFFIX":
			parts = append(parts, "01")
		}
	}

	sep := ""
	if separatorCfg != "none" {
		sep = separatorCfg
	}

	return strings.Join(parts, sep), nil
}

func (s *registrationService) GetNextCustomerNumber(ctx context.Context) (string, error) {
	return s.generateCustomerNumber(ctx, &model.Registration{})
}

func (s *registrationService) GetNextCustomerNumberForRegistration(ctx context.Context, registrationID string) (string, error) {
	reg, err := s.repo.GetByID(ctx, registrationID)
	if err != nil {
		return "", err
	}
	return s.generateCustomerNumber(ctx, reg)
}

func (s *registrationService) GetPackageByID(ctx context.Context, id string) (*model.Package, error) {
	return s.repo.GetPackageByID(ctx, id)
}

func (s *registrationService) broadcast(event string, data interface{}) {
	if s.wsHub != nil {
		s.wsHub.Broadcast(event, data)
	}
}

func (s *registrationService) broadcastUpdate(ctx context.Context, id string) {
	reg, err := s.repo.GetByID(ctx, id)
	if err == nil {
		s.broadcast("registration_updated", reg)
	}
}

func (s *registrationService) ResendNotification(ctx context.Context, id string, notifType string) (*ResendNotifResult, error) {
	reg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("ResendNotification: get registration: %w", err)
	}

	result := &ResendNotifResult{
		WASent:    false,
		EmailSent: false,
	}

	invoiceURL := fmt.Sprintf("%s/invoice/%s", s.cfg.AppBaseURL, id)
	receiptURL := fmt.Sprintf("%s/receipt/%s", s.cfg.AppBaseURL, id)

	if notifType == "" || notifType == "auto" {
		switch reg.Status {
		case "waiting_payment":
			notifType = "invoice"
		case "payment_confirmed", "active", "provisioned":
			notifType = "receipt"
		case "survey_scheduled":
			notifType = "survey"
		default:
			notifType = "invoice"
		}
	}

	switch notifType {
	case "invoice":
		if err := s.notifSvc.SendInvoiceLink(ctx, reg); err != nil {
			result.WAError = err.Error()
			s.logger.Error("resend WA invoice failed", zap.String("id", id), zap.Error(err))
		} else {
			result.WASent = true
		}

		if reg.Email == nil || *reg.Email == "" {
			result.EmailError = "Alamat email pelanggan belum diisi"
		} else if err := s.notifSvc.SendInvoiceEmail(ctx, reg, invoiceURL); err != nil {
			result.EmailError = err.Error()
			s.logger.Error("resend Email invoice failed", zap.String("id", id), zap.Error(err))
		} else {
			result.EmailSent = true
		}

	case "receipt":
		if err := s.notifSvc.SendPaymentConfirmed(ctx, reg); err != nil {
			result.WAError = err.Error()
			s.logger.Error("resend WA receipt failed", zap.String("id", id), zap.Error(err))
		} else {
			result.WASent = true
		}

		if reg.Email == nil || *reg.Email == "" {
			result.EmailError = "Alamat email pelanggan belum diisi"
		} else if err := s.notifSvc.SendReceiptEmail(ctx, reg, receiptURL); err != nil {
			result.EmailError = err.Error()
			s.logger.Error("resend Email receipt failed", zap.String("id", id), zap.Error(err))
		} else {
			result.EmailSent = true
		}

		if reg.PPPoEUsername != nil && *reg.PPPoEUsername != "" {
			_ = s.notifSvc.SendActivationSuccess(ctx, reg)
		}

	case "survey":
		if err := s.notifSvc.SendSurveyScheduled(ctx, reg); err != nil {
			result.WAError = err.Error()
		} else {
			result.WASent = true
		}
		result.EmailError = "Notifikasi survei dikirim via WhatsApp"
	}

	if result.WASent && result.EmailSent {
		result.Message = "Notifikasi WhatsApp & Email berhasil dikirim ulang!"
	} else if result.WASent {
		result.Message = "Notifikasi WhatsApp terkirim. (Email: " + result.EmailError + ")"
	} else if result.EmailSent {
		result.Message = "Notifikasi Email terkirim. (WA: " + result.WAError + ")"
	} else {
		result.Message = "Gagal mengirim notifikasi. (WA: " + result.WAError + ", Email: " + result.EmailError + ")"
	}

	return result, nil
}

func (s *registrationService) ListODPs(ctx context.Context) ([]model.ODP, error) {
	return s.repo.ListODPs(ctx)
}

func (s *registrationService) CreateODP(ctx context.Context, req *model.CreateODPRequest) (*model.ODP, error) {
	return s.repo.CreateODP(ctx, req)
}

func (s *registrationService) UpdateODP(ctx context.Context, id string, req *model.CreateODPRequest) (*model.ODP, error) {
	return s.repo.UpdateODP(ctx, id, req)
}

func (s *registrationService) DeleteODP(ctx context.Context, id string) error {
	return s.repo.DeleteODP(ctx, id)
}
