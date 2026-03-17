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

	ListAttachmentsByMessageIDs(ctx context.Context, messageIDs []string) ([]models.MessageAttachment, error)
	FindAttachmentsByIDs(ctx context.Context, attachmentIDs []string) ([]models.MessageAttachment, error)
	CreateAttachment(ctx context.Context, attachment *models.MessageAttachment) error
	AttachToMessage(ctx context.Context, messageID string, attachmentIDs []string) error

	FindReaction(ctx context.Context, messageID, userID, emoji string) (*models.Reaction, error)
	CreateReaction(ctx context.Context, reaction *models.Reaction) error
	DeleteReaction(ctx context.Context, reactionID string) error
	ListReactionsByMessageIDs(ctx context.Context, messageIDs []string) ([]models.Reaction, error)
}
