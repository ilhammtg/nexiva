package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// New creates a zap logger appropriate for the given environment.
// In "production" it uses JSON encoding; otherwise uses console encoding.
func New(env string) *zap.Logger {
	var cfg zap.Config

	if env == "production" {
		cfg = zap.NewProductionConfig()
		cfg.EncoderConfig.TimeKey = "timestamp"
		cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	} else {
		cfg = zap.NewDevelopmentConfig()
		cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	log, err := cfg.Build()
	if err != nil {
		// Fallback to no-op logger; should never happen in practice
		return zap.NewNop()
	}

	return log
}
