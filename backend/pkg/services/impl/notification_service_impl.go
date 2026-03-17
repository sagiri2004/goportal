package impl

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/google/uuid"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

const notificationTopic = "notification.dispatch.request"

type notificationService struct {
	repo      repositories.NotificationRepository
	publisher message.Publisher
}

func debugLogNotificationSvc(hypothesisID, location, message string, data map[string]any) {
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

func NewNotificationService(
	repo repositories.NotificationRepository,
	publisher message.Publisher,
) services.NotificationService {
	return &notificationService{
		repo:      repo,
		publisher: publisher,
	}
}

func (s *notificationService) Dispatch(
	ctx context.Context,
	userID, sourceType, eventType, priority, sourceService string,
	payload json.RawMessage,
	metadata json.RawMessage,
) (*models.Notification, error) {
	userID = strings.TrimSpace(userID)
	sourceType = strings.TrimSpace(sourceType)
	eventType = strings.TrimSpace(eventType)
	sourceService = strings.TrimSpace(sourceService)
	if userID == "" || sourceType == "" || eventType == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if len(payload) == 0 {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if priority == "" {
		priority = models.NotificationPriorityNormal
	}
	if sourceService == "" {
		sourceService = "backend"
	}

	eventID := uuid.NewString()
	occurredAt := time.Now().UTC().Format(time.RFC3339)

	outEvent := models.NotificationEvent{
		EventID:       eventID,
		EventType:     eventType,
		OccurredAt:    occurredAt,
		SourceService: sourceService,
		TargetUserID:  userID,
		Priority:      priority,
		Payload:       payload,
		Metadata:      metadata,
	}
	debugLogNotificationSvc("H1", "backend/pkg/services/impl/notification_service_impl.go:93", "dispatch_out_event_shape", map[string]any{
		"event_id":       outEvent.EventID,
		"event_type":     outEvent.EventType,
		"target_user_id": outEvent.TargetUserID,
		"priority":       outEvent.Priority,
		"payload_len":    len(outEvent.Payload),
		"metadata_len":   len(outEvent.Metadata),
	})

	record := &models.Notification{
		EventID:        eventID,
		UserID:         userID,
		SourceType:     sourceType,
		EventType:      eventType,
		Priority:       priority,
		Payload:        payload,
		Metadata:       metadata,
		DeliveryStatus: models.NotificationStatusPending,
	}
	if err := s.repo.Create(ctx, record); err != nil {
		return nil, err
	}

	if s.publisher == nil {
		return record, nil
	}

	raw, err := json.Marshal(outEvent)
	if err != nil {
		return nil, apperr.E("INTERNAL_ERROR", err)
	}
	debugLogNotificationSvc("H1", "backend/pkg/services/impl/notification_service_impl.go:121", "dispatch_marshaled_event_preview", map[string]any{
		"raw_len":  len(raw),
		"raw_head": fmt.Sprintf("%.220s", string(raw)),
	})

	msg := message.NewMessage(eventID, raw)
	msg.SetContext(ctx)
	if err := s.publisher.Publish(notificationTopic, msg); err != nil {
		log.Printf("[backend-notification] publish failed event_id=%s topic=%s user_id=%s err=%v", eventID, notificationTopic, userID, err)
		_ = s.repo.UpdateDeliveryStatusByEventID(
			ctx,
			eventID,
			models.NotificationStatusFailed,
			nil,
			err.Error(),
		)
		return nil, apperr.E("INTERNAL_ERROR", err)
	}
	log.Printf("[backend-notification] published event_id=%s topic=%s user_id=%s", eventID, notificationTopic, userID)

	if err := s.repo.UpdateDeliveryStatusByEventID(
		ctx,
		eventID,
		models.NotificationStatusPublished,
		nil,
		"",
	); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *notificationService) HandleDeliveryEvent(ctx context.Context, event models.NotificationDeliveryEvent) error {
	event.EventID = strings.TrimSpace(event.EventID)
	if event.EventID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}

	status := models.NotificationStatusFailed
	switch strings.ToUpper(strings.TrimSpace(event.DeliveryType)) {
	case "DELIVERED_TO_SERVER":
		status = models.NotificationStatusDeliveredToServer
	case "DELIVERED_TO_CLIENT":
		status = models.NotificationStatusDeliveredToClient
	case "FAILED":
		status = models.NotificationStatusFailed
	default:
		return apperr.E("INVALID_ACTION", nil)
	}
	log.Printf("[backend-notification] delivery receipt event_id=%s user_id=%s type=%s at=%d err=%s", event.EventID, event.UserID, event.DeliveryType, event.DeliveredAt, event.ErrorMessage)

	var deliveredAt *int64
	if event.DeliveredAt > 0 {
		deliveredAt = &event.DeliveredAt
	}
	if err := s.repo.UpdateDeliveryStatusByEventID(ctx, event.EventID, status, deliveredAt, event.ErrorMessage); err != nil {
		log.Printf("[backend-notification] delivery status update failed event_id=%s type=%s err=%v", event.EventID, event.DeliveryType, err)
		return err
	}
	log.Printf("[backend-notification] delivery status updated event_id=%s status=%s", event.EventID, status)
	return nil
}
