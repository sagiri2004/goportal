package notification

import (
	"encoding/json"
	"fmt"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/services"
)

type Handler struct {
	notificationSvc services.NotificationService
}

func NewHandler(notificationSvc services.NotificationService) *Handler {
	return &Handler{notificationSvc: notificationSvc}
}

func (h *Handler) HandleNewMessage(msg *message.Message) error {
	var event models.ChatMessageCreatedEvent
	if err := json.Unmarshal(msg.Payload, &event); err != nil {
		return fmt.Errorf("unmarshal message created event: %w", err)
	}

	payload := map[string]any{
		"message_id":  event.MessageID,
		"author_id":   event.AuthorID,
		"channel_id":  event.ChannelID,
		"content":     event.Content,
		"attachments": event.Attachments,
	}
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal notification payload: %w", err)
	}

	_, err = h.notificationSvc.Dispatch(
		msg.Context(),
		event.AuthorID,
		models.NotificationSourceTypeMessage,
		models.NotificationEventTypePopup,
		models.NotificationPriorityNormal,
		"message-service",
		rawPayload,
		nil,
	)
	return err
}

func (h *Handler) HandleDeliveryReceipt(msg *message.Message) error {
	var event models.NotificationDeliveryEvent
	if err := json.Unmarshal(msg.Payload, &event); err != nil {
		return fmt.Errorf("unmarshal delivery event: %w", err)
	}
	return h.notificationSvc.HandleDeliveryEvent(msg.Context(), event)
}
