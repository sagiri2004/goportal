package impl

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/google/uuid"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

const notificationTopic = "notification_topic"

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

	if s.publisher == nil {
		return record, nil
	}

	raw, err := json.Marshal(outEvent)
	if err != nil {
		return nil, apperr.E("INTERNAL_ERROR", err)
	}

	msg := message.NewMessage(eventID, raw)
	msg.SetContext(ctx)
	if err := s.publisher.Publish(notificationTopic, msg); err != nil {
		_ = s.repo.UpdateDeliveryStatusByEventID(
			ctx,
			eventID,
			models.NotificationStatusFailed,
			nil,
			err.Error(),
		)
		return nil, apperr.E("INTERNAL_ERROR", err)
	}

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

	var deliveredAt *int64
	if event.DeliveredAt > 0 {
		deliveredAt = &event.DeliveredAt
	}
	return s.repo.UpdateDeliveryStatusByEventID(ctx, event.EventID, status, deliveredAt, event.ErrorMessage)
}
