package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	AppPort        string
	WSPath         string
	RabbitMQURL    string
	TopicGameRoom  string
	JWTSecret      string
	WSWriteTimeout time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		AppPort:       env("PORT", "8091"),
		WSPath:        env("WS_PATH", "/ws/game"),
		RabbitMQURL:   env("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/"),
		TopicGameRoom: env("TOPIC_GAME_ROOM_EVENTS", "game.room.events"),
		JWTSecret:     env("JWT_SECRET", "goportal-secret-key-change-me"),
	}
	writeTimeout, err := time.ParseDuration(env("WS_WRITE_TIMEOUT", "5s"))
	if err != nil {
		return Config{}, fmt.Errorf("parse WS_WRITE_TIMEOUT: %w", err)
	}
	cfg.WSWriteTimeout = writeTimeout
	return cfg, nil
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
