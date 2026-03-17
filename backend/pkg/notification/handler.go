package notification

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

type Handler struct {
	notificationSvc services.NotificationService
	channelRepo     repositories.ChannelRepository
	serverRepo      repositories.ServerRepository
}

func debugLogNotificationHandler(hypothesisID, location, message string, data map[string]any) {
	// #region agent log
	entry := map[string]any{
		"sessionId":    "6670b5",
		"runId":        "pre-fix",
		"hypothesisId": hypothesisID,
		"location":     location,
		"message":      message,
		"data":         data,
		"timestamp":    time.Now().UnixMilli(),
	}
	if b, err := json.Marshal(entry); err == nil {
		if f, err := os.OpenFile("/home/sagiri/Code/goportal/.cursor/debug-6670b5.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644); err == nil {
			_, _ = f.Write(append(b, '\n'))
			_ = f.Close()
		}
	}
	// #endregion
}

func NewHandler(
	notificationSvc services.NotificationService,
	channelRepo repositories.ChannelRepository,
	serverRepo repositories.ServerRepository,
) *Handler {
	return &Handler{
		notificationSvc: notificationSvc,
		channelRepo:     channelRepo,
		serverRepo:      serverRepo,
	}
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
	debugLogNotificationHandler("H5", "backend/pkg/notification/handler.go:66", "handle_new_message_dispatch_target", map[string]any{
		"event_id":    event.EventID,
		"message_id":  event.MessageID,
		"channel_id":  event.ChannelID,
		"author_id":   event.AuthorID,
		"payload_len": len(rawPayload),
	})

	channel, err := h.channelRepo.FindByID(msg.Context(), event.ChannelID)
	if err != nil {
		return fmt.Errorf("find channel by id: %w", err)
	}
	members, err := h.serverRepo.ListMembers(msg.Context(), channel.ServerID)
	if err != nil {
		return fmt.Errorf("list server members: %w", err)
	}
	debugLogNotificationHandler("H5", "backend/pkg/notification/handler.go:91", "resolved_channel_members", map[string]any{
		"event_id":     event.EventID,
		"channel_id":   event.ChannelID,
		"server_id":    channel.ServerID,
		"member_count": len(members),
		"author_id":    event.AuthorID,
	})

	for _, member := range members {
		_, err = h.notificationSvc.Dispatch(
			msg.Context(),
			member.ID,
			models.NotificationSourceTypeMessage,
			models.NotificationEventTypePopup,
			models.NotificationPriorityNormal,
			"message-service",
			rawPayload,
			nil,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) HandleDeliveryReceipt(msg *message.Message) error {
	var event models.NotificationDeliveryEvent
	if err := json.Unmarshal(msg.Payload, &event); err != nil {
		return fmt.Errorf("unmarshal delivery event: %w", err)
	}
	log.Printf("[backend-notification] consume receipt event_id=%s user_id=%s type=%s", event.EventID, event.UserID, event.DeliveryType)
	return h.notificationSvc.HandleDeliveryEvent(msg.Context(), event)
}
