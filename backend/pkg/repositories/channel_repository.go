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
	SetPrivacy(ctx context.Context, channelID string, isPrivate bool) (*models.Channel, error)
	IsMember(ctx context.Context, channelID, userID string) (bool, error)
	AddMember(ctx context.Context, channelID, userID string) error
	RemoveMember(ctx context.Context, channelID, userID string) error
	ListMembers(ctx context.Context, channelID string) ([]models.ChannelMember, error)
	UpsertOverwrite(ctx context.Context, overwrite *models.ChannelPermissionOverwrite) error
	DeleteOverwrite(ctx context.Context, channelID, subjectType, subjectID string) error
	ListOverwrites(ctx context.Context, channelID string) ([]models.ChannelPermissionOverwrite, error)
}
