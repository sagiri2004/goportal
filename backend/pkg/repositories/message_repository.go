package repositories

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type MessageRepository interface {
	Create(ctx context.Context, m *models.Message, attachments []*models.MessageAttachment) error
	FindByID(ctx context.Context, messageID string) (*models.Message, error)
	ListByChannel(ctx context.Context, channelID string, limit, offset int) ([]models.Message, error)
	Update(ctx context.Context, m *models.Message) error
	SoftDelete(ctx context.Context, messageID string) error
	UpsertUserChannelRead(ctx context.Context, read *models.UserChannelRead) error
	MarkChannelRead(ctx context.Context, userID, channelID string, readAt int64) error
	IncrementUnreadCounts(ctx context.Context, channelID string, excludeUserIDs []string) error
	ListUserChannelReads(ctx context.Context, userID string, channelIDs []string) ([]models.UserChannelRead, error)
	SaveMentions(ctx context.Context, mentions []models.MessageMention) error

	ListAttachmentsByMessageIDs(ctx context.Context, messageIDs []string) ([]models.MessageAttachment, error)
	ListAttachmentsByMessageID(ctx context.Context, messageID string) ([]models.MessageAttachment, error)
	ListAttachmentsByServerID(ctx context.Context, serverID string) ([]models.MessageAttachment, error)
	FindAttachmentsByIDs(ctx context.Context, attachmentIDs []string) ([]models.MessageAttachment, error)
	CreateAttachment(ctx context.Context, attachment *models.MessageAttachment) error
	AttachToMessage(ctx context.Context, messageID string, attachmentIDs []string) error
	SoftDeleteAttachmentsByMessageID(ctx context.Context, messageID string) error
	SoftDeleteAttachmentsByIDs(ctx context.Context, attachmentIDs []string) error

	FindReaction(ctx context.Context, messageID, userID, emoji string) (*models.Reaction, error)
	CreateReaction(ctx context.Context, reaction *models.Reaction) error
	DeleteReaction(ctx context.Context, reactionID string) error
	ListReactionsByMessageIDs(ctx context.Context, messageIDs []string) ([]models.Reaction, error)
}
