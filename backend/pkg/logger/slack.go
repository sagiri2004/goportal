package logger

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type slackMessage struct {
	Text string `json:"text"`
}

// SendSlack posts a plain text message to a Slack incoming webhook.
func SendSlack(webhookURL, message string) error {
	if webhookURL == "" || message == "" {
		return nil
	}
	body, err := json.Marshal(slackMessage{Text: message})
	if err != nil {
		return err
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Post(webhookURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

type SlackHook struct {
	webhookURL string
	level      zap.AtomicLevel
	hostname   string
}

func NewSlackHook(webhookURL string, level zap.AtomicLevel, hostname string) *SlackHook {
	return &SlackHook{
		webhookURL: webhookURL,
		level:      level,
		hostname:   hostname,
	}
}

func (h *SlackHook) GetHook() func(entry zapcore.Entry) error {
	return func(entry zapcore.Entry) error {
		// only forward warn/error logs to Slack
		if entry.Level < zapcore.WarnLevel {
			return nil
		}
		msg := "[" + entry.Level.String() + "] " + h.hostname + " - " + entry.Message
		return SendSlack(h.webhookURL, msg)
	}
}

