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

type ServerEnvelope struct {
	UserID       string          `json:"user_id"`
	Notification json.RawMessage `json:"notification"`
}
