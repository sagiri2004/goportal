package services

import (
	"context"
	"encoding/json"

	"github.com/sagiri2004/goportal/pkg/models"
)

type NotificationService interface {
	Dispatch(
		ctx context.Context,
		userID, sourceType, eventType, priority, sourceService string,
		payload json.RawMessage,
		metadata json.RawMessage,
	) (*models.Notification, error)
	HandleDeliveryEvent(ctx context.Context, event models.NotificationDeliveryEvent) error
}
