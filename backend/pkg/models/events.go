package models

import "encoding/json"

const (
	NotificationSourceTypeMessage = "MESSAGE"
	NotificationSourceTypeSystem  = "SYSTEM"
	NotificationSourceTypeCustom  = "CUSTOM"

	NotificationEventTypePopup     = "POPUP"
	NotificationEventTypeInApp     = "IN_APP_COUNT"
	NotificationEventTypeSystemMsg = "SYSTEM_ALERT"

	NotificationPriorityLow      = "LOW"
	NotificationPriorityNormal   = "NORMAL"
	NotificationPriorityHigh     = "HIGH"
	NotificationPriorityCritical = "CRITICAL"

	NotificationStatusPending           = "PENDING"
	NotificationStatusPublished         = "PUBLISHED"
	NotificationStatusDeliveredToServer = "DELIVERED_TO_SERVER"
	NotificationStatusDeliveredToClient = "DELIVERED_TO_CLIENT"
	NotificationStatusFailed            = "FAILED"
)

type MessageCreatedEvent struct {
	EventID     string `json:"event_id,omitempty"`
	MessageID   string `json:"message_id"`
	SenderID    string `json:"sender_id"`
	RecipientID string `json:"recipient_id"`
	ChannelID   string `json:"channel_id,omitempty"`
	Content     string `json:"content"`
	Priority    string `json:"priority"`
	CreatedAt   int64  `json:"created_at"`
}

type ChatMessageCreatedEvent struct {
	EventID     string                   `json:"event_id"`
	EventType   string                   `json:"event_type"`
	OccurredAt  string                   `json:"occurred_at"`
	ChannelID   string                   `json:"channel_id"`
	AuthorID    string                   `json:"author_id"`
	MessageID   string                   `json:"message_id"`
	Content     MessageContentEnvelope   `json:"content"`
	Attachments []MessageAttachmentEvent `json:"attachments,omitempty"`
}

type MessageAttachmentEvent struct {
	ID       string `json:"id"`
	FileURL  string `json:"file_url"`
	FileType string `json:"file_type"`
	FileSize int64  `json:"file_size"`
	FileName string `json:"file_name"`
}

type NotificationEvent struct {
	EventID       string          `json:"event_id"`
	EventType     string          `json:"event_type"`
	OccurredAt    string          `json:"occurred_at"`
	SourceService string          `json:"source_service"`
	TargetUserID  string          `json:"target_user_id"`
	Priority      string          `json:"priority"`
	Payload       json.RawMessage `json:"payload"`
	Metadata      json.RawMessage `json:"metadata,omitempty"`
}

type NotificationDeliveryEvent struct {
	EventID      string `json:"event_id"`
	UserID       string `json:"user_id"`
	ServerID     string `json:"server_id,omitempty"`
	DeliveryType string `json:"delivery_type"`
	DeliveredAt  int64  `json:"delivered_at"`
	ErrorMessage string `json:"error_message,omitempty"`
}
