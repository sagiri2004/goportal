package initialize

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/sagiri2004/goportal/global"
	setting "github.com/sagiri2004/goportal/pkg/settings"

	"gopkg.in/yaml.v3"
)

func LoadConfig(configPath string) error {
	cfg := setting.Config{
		Server: setting.ServerConfig{
			Port:      8080,
			Mode:      "debug",
			JwtSecret: "goportal-secret-key-change-me",
		},
		Database: setting.DatabaseConfig{
			Engine:       "sqlite3",
			DSN:          "app.db",
			MigrationDir: "migrations",
		},
		Logger: setting.LoggerSetting{
			LogLevel: "info",
		},
		RabbitMQ: setting.RabbitMQConfig{
			URL: "amqp://guest:guest@localhost:5672/",
		},
		LiveKit: setting.LiveKitConfig{
			URL:       "ws://localhost:7880",
			APIKey:    "devkey",
			APISecret: "livekit-dev-secret-change-me-32chars",
		},
		Cron: setting.CronSetting{
			Enabled: true,
			Spec:    "0 1 * * *",
		},
	}

	filePath := configPath
	if filePath == "" {
		filePath = "configs/config.yaml"
	}

	// If configPath is a directory, read config.yaml inside it.
	if fi, err := os.Stat(filePath); err == nil && fi.IsDir() {
		filePath = filepath.Join(filePath, "config.yaml")
	}

	if data, err := os.ReadFile(filePath); err == nil {
		_ = yaml.Unmarshal(data, &cfg)
	}

	// Environment overrides
	if v := os.Getenv("APP_PORT"); v != "" {
		// keep default if parse fails
		var p int
		_, _ = fmt.Sscanf(v, "%d", &p)
		if p > 0 {
			cfg.Server.Port = p
		}
	}
	if v := os.Getenv("JWT_SECRET"); v != "" {
		cfg.Server.JwtSecret = v
	}
	if v := os.Getenv("DB_ENGINE"); v != "" {
		cfg.Database.Engine = v
	}
	if v := os.Getenv("DB_DSN"); v != "" {
		cfg.Database.DSN = v
	}
	if v := os.Getenv("MIGRATION_DIR"); v != "" {
		cfg.Database.MigrationDir = v
	}
	if v := os.Getenv("LOG_LEVEL"); v != "" {
		cfg.Logger.LogLevel = v
	}
	if v := os.Getenv("SLACK_HOOK_URL"); v != "" {
		cfg.Logger.SlackHookURL = v
		cfg.Slack.WebhookURL = v
	}
	if v := os.Getenv("SLACK_WEBHOOK_URL"); v != "" {
		cfg.Slack.WebhookURL = v
	}
	if v := os.Getenv("CRON_SPEC"); v != "" {
		cfg.Cron.Spec = v
	}
	if v := os.Getenv("RABBITMQ_URL"); v != "" {
		cfg.RabbitMQ.URL = v
	}
	if v := os.Getenv("LIVEKIT_URL"); v != "" {
		cfg.LiveKit.URL = v
	}
	if v := os.Getenv("LIVEKIT_API_KEY"); v != "" {
		cfg.LiveKit.APIKey = v
	}
	if v := os.Getenv("LIVEKIT_API_SECRET"); v != "" {
		cfg.LiveKit.APISecret = v
	}
	if v := os.Getenv("REDIS_ADDR"); v != "" {
		cfg.Redis.Addr = v
		cfg.Redis.Address = v
	}
	if v := os.Getenv("REDIS_ADDRESS"); v != "" {
		cfg.Redis.Address = v
		cfg.Redis.Addr = v
	}
	if v := os.Getenv("CLOUDINARY_CLOUD_NAME"); v != "" {
		cfg.Cloudinary.CloudName = v
	}
	if v := os.Getenv("CLOUDINARY_API_KEY"); v != "" {
		cfg.Cloudinary.APIKey = v
	}
	if v := os.Getenv("CLOUDINARY_API_SECRET"); v != "" {
		cfg.Cloudinary.APISecret = v
	}
	if v := os.Getenv("CLOUDINARY_FOLDER"); v != "" {
		cfg.Cloudinary.Folder = v
	}

	global.Config = cfg
	return nil
}
