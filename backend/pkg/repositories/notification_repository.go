package repositories

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type NotificationRepository interface {
	Create(ctx context.Context, n *models.Notification) error
	UpdateDeliveryStatusByEventID(
		ctx context.Context,
		eventID, status string,
		deliveredAt *int64,
		lastError string,
	) error
}
