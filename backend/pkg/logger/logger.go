package logger

import (
	"os"

	setting "goportal/pkg/settings"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func NewLogger(config setting.LoggerSetting) *zap.Logger {
	logLevel := config.LogLevel
	var level zapcore.Level
	switch logLevel {
	case "debug":
		level = zapcore.DebugLevel
	case "info":
		level = zapcore.InfoLevel
	case "warn":
		level = zapcore.WarnLevel
	case "error":
		level = zapcore.ErrorLevel
	default:
		level = zapcore.InfoLevel
	}
	encoder := getEncoderLog()
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "UnknownHostname"
	}

	atomicLevel := zap.NewAtomicLevelAt(level)
	slackHook := NewSlackHook(config.SlackHookURL, atomicLevel, hostname).GetHook()

	logger, _ := zap.NewDevelopment()
	logger = logger.WithOptions(
		zap.WrapCore(func(c zapcore.Core) zapcore.Core {
			return zapcore.NewCore(
				encoder,
				zapcore.AddSync(os.Stdout),
				atomicLevel,
			)
		}),
		zap.Hooks(slackHook),
	)
	logger = logger.With(zap.String("hostname", hostname))
	return logger
}

func getEncoderLog() zapcore.Encoder {
	encodeConfig := zap.NewProductionEncoderConfig()
	encodeConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encodeConfig.TimeKey = "time"
	encodeConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	encodeConfig.EncodeCaller = zapcore.ShortCallerEncoder
	return zapcore.NewJSONEncoder(encodeConfig)
}

