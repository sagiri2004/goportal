package repositories

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type ChannelRepository interface {
	Create(ctx context.Context, channel *models.Channel) error
	FindByID(ctx context.Context, id string) (*models.Channel, error)
	GetMaxPositionByParent(ctx context.Context, serverID string, parentID *string) (int, error)
	Update(ctx context.Context, channel *models.Channel) error
}
