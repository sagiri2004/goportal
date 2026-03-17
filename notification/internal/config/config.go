package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	AppPort              string
	ServerID             string
	WSPath               string
	WSPingInterval       time.Duration
	WSPongTimeout        time.Duration
	WSWriteTimeout       time.Duration
	RedisAddr            string
	RedisPassword        string
	RedisDB              int
	BrokerDriver         string
	RabbitMQURL          string
	QueueName            string
	ExchangeName         string
	TopicNotifications   string
	TopicDeliveryReceipt string
	TopicDLQ             string
}

func Load() (Config, error) {
	db, err := intFromEnv("REDIS_DB", 0)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		AppPort:              strFromEnv("PORT", "8085"),
		ServerID:             strFromEnv("SERVER_ID", "notif-node-a"),
		WSPath:               strFromEnv("WS_PATH", "/ws"),
		RedisAddr:            strFromEnv("REDIS_ADDR", "redis:6379"),
		RedisPassword:        strFromEnv("REDIS_PASSWORD", ""),
		RedisDB:              db,
		BrokerDriver:         strFromEnv("BROKER_DRIVER", "rabbitmq"),
		RabbitMQURL:          strFromEnv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/"),
		QueueName:            strFromEnv("RABBITMQ_QUEUE_NOTIFICATIONS", "notification.dispatch.request.events"),
		ExchangeName:         strFromEnv("RABBITMQ_EXCHANGE", "notification.dispatch.request"),
		TopicNotifications:   strFromEnv("TOPIC_NOTIFICATIONS", "notification.dispatch.request"),
		TopicDeliveryReceipt: strFromEnv("TOPIC_DELIVERY_RECEIPT", "notification.dispatch.receipt"),
		TopicDLQ:             strFromEnv("TOPIC_DLQ", "notification.dispatch.dlq"),
	}

	cfg.WSPingInterval, err = durationFromEnv("WS_PING_INTERVAL", 25*time.Second)
	if err != nil {
		return Config{}, err
	}
	cfg.WSPongTimeout, err = durationFromEnv("WS_PONG_TIMEOUT", 10*time.Second)
	if err != nil {
		return Config{}, err
	}
	cfg.WSWriteTimeout, err = durationFromEnv("WS_WRITE_TIMEOUT", 5*time.Second)
	if err != nil {
		return Config{}, err
	}

	if cfg.ServerID == "" {
		return Config{}, fmt.Errorf("SERVER_ID is required")
	}
	return cfg, nil
}

func strFromEnv(k, fallback string) string {
	v := os.Getenv(k)
	if v == "" {
		return fallback
	}
	return v
}

func intFromEnv(k string, fallback int) (int, error) {
	v := os.Getenv(k)
	if v == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("parse %s: %w", k, err)
	}
	return n, nil
}

func durationFromEnv(k string, fallback time.Duration) (time.Duration, error) {
	v := os.Getenv(k)
	if v == "" {
		return fallback, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("parse %s: %w", k, err)
	}
	return d, nil
}
