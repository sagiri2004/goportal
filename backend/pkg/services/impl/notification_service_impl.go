package impl

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/google/uuid"
	"github.com/sagiri2004/goportal/global"
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

	delivered := false
	if global.RealtimeHub != nil {
		delivered = global.RealtimeHub.SendToUser(
			userID,
			eventType,
			eventID,
			payload,
			metadata,
		)
	}
	if delivered {
		now := time.Now().Unix()
		_ = s.repo.UpdateDeliveryStatusByEventID(ctx, eventID, models.NotificationStatusPublished, &now, "")
		_ = s.repo.UpdateDeliveryStatusByEventID(ctx, eventID, models.NotificationStatusDeliveredToClient, &now, "")
		return record, nil
	}

	if s.publisher != nil {
		raw, err := json.Marshal(outEvent)
		if err != nil {
			return nil, apperr.E("INTERNAL_ERROR", err)
		}
		msg := message.NewMessage(eventID, raw)
		msg.SetContext(ctx)
		if err := s.publisher.Publish(notificationTopic, msg); err == nil {
			_ = s.repo.UpdateDeliveryStatusByEventID(ctx, eventID, models.NotificationStatusPublished, nil, "")
			return record, nil
		}
	}
	log.Printf("[backend-notification] no active ws target event_id=%s user_id=%s", eventID, userID)
	_ = s.repo.UpdateDeliveryStatusByEventID(ctx, eventID, models.NotificationStatusFailed, nil, "user offline")
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
