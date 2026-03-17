package domain

import "encoding/json"

type InboundNotification struct {
	EventID        string          `json:"event_id,omitempty"`
	UserID         string          `json:"user_id"`
	MessagePayload json.RawMessage `json:"message_payload"`
	Priority       string          `json:"priority"`
}

type OutboundNotification struct {
	Type      string          `json:"type"`
	UserID    string          `json:"user_id"`
	Payload   json.RawMessage `json:"payload"`
	Priority  string          `json:"priority"`
	Timestamp string          `json:"timestamp"`
	EventID   string          `json:"event_id,omitempty"`
}

type DeliveryType string

const (
	DeliveryTypeToServer DeliveryType = "DELIVERED_TO_SERVER"
	DeliveryTypeToClient DeliveryType = "DELIVERED_TO_CLIENT"
	DeliveryTypeFailed   DeliveryType = "FAILED"
)

type DeliveryReceiptEvent struct {
	EventID      string       `json:"event_id"`
	UserID       string       `json:"user_id"`
	ServerID     string       `json:"server_id,omitempty"`
	DeliveryType DeliveryType `json:"delivery_type"`
	DeliveredAt  int64        `json:"delivered_at"`
	ErrorMessage string       `json:"error_message,omitempty"`
}

type ServerEnvelope struct {
	UserID       string          `json:"user_id"`
	Notification json.RawMessage `json:"notification"`
}
