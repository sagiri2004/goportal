package impl

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"gorm.io/gorm"
)

type notificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) repositories.NotificationRepository {
	return &notificationRepository{db: db}
}

func (r *notificationRepository) Create(ctx context.Context, n *models.Notification) error {
	if err := r.db.WithContext(ctx).Create(n).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *notificationRepository) UpdateDeliveryStatusByEventID(
	ctx context.Context,
	eventID, status string,
	deliveredAt *int64,
	lastError string,
) error {
	updateData := map[string]any{
		"delivery_status": status,
		"last_error":      lastError,
	}
	if status == models.NotificationStatusDeliveredToServer {
		updateData["delivered_to_server_at"] = deliveredAt
	}
	if status == models.NotificationStatusDeliveredToClient {
		updateData["delivered_to_client_at"] = deliveredAt
	}

	if err := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("event_id = ? AND deleted_at = 0", eventID).
		Updates(updateData).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}
