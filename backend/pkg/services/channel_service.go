package services

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type ChannelService interface {
	CreateChannel(ctx context.Context, actorID, serverID, name, channelType string, parentID *string, position *int) (*models.Channel, error)
	GetChannel(ctx context.Context, actorID, channelID string) (*models.Channel, error)
	UpdatePosition(ctx context.Context, actorID, channelID string, position int) (*models.Channel, error)
}
