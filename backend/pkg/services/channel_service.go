package services

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type ChannelService interface {
	CreateChannel(ctx context.Context, actorID, serverID, name, channelType string, parentID *string, position *int) (*models.Channel, error)
	ListByServer(ctx context.Context, actorID, serverID string) ([]models.Channel, error)
	GetChannel(ctx context.Context, actorID, channelID string) (*models.Channel, error)
	UpdatePosition(ctx context.Context, actorID, channelID string, position int) (*models.Channel, error)
	SetPrivacy(ctx context.Context, actorID, channelID string, isPrivate bool) (*models.Channel, error)
	AddMember(ctx context.Context, actorID, channelID, targetUserID string) error
	RemoveMember(ctx context.Context, actorID, channelID, targetUserID string) error
	ListMembers(ctx context.Context, actorID, channelID string) ([]models.ChannelMember, error)
	UpsertOverwrite(ctx context.Context, actorID, channelID, subjectType, subjectID string, allowBits, denyBits int64) error
	DeleteOverwrite(ctx context.Context, actorID, channelID, subjectType, subjectID string) error
	ListOverwrites(ctx context.Context, actorID, channelID string) ([]models.ChannelPermissionOverwrite, error)
	MarkRead(ctx context.Context, actorID, channelID string) error
	GetNotificationSetting(ctx context.Context, actorID, channelID string) (*models.ChannelNotificationSetting, error)
	UpdateNotificationSetting(ctx context.Context, actorID, channelID, level string, mutedUntil *int64) (*models.ChannelNotificationSetting, error)
}
