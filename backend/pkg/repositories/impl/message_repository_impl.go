package impl

import (
	"context"
	"errors"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"gorm.io/gorm"
)

type messageRepository struct {
	db *gorm.DB
}

func NewMessageRepository(db *gorm.DB) repositories.MessageRepository {
	return &messageRepository{db: db}
}

func (r *messageRepository) Create(ctx context.Context, m *models.Message, attachments []*models.MessageAttachment) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(m).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		if len(attachments) == 0 {
			return nil
		}
		for i := range attachments {
			attachments[i].MessageID = &m.ID
			if err := tx.Save(attachments[i]).Error; err != nil {
				return apperr.E("DB_ERROR", err)
			}
		}
		return nil
	})
}

func (r *messageRepository) FindByID(ctx context.Context, messageID string) (*models.Message, error) {
	var msg models.Message
	if err := r.db.WithContext(ctx).Where("id = ? AND deleted_at = 0", messageID).First(&msg).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("MESSAGE_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &msg, nil
}

func (r *messageRepository) ListByChannel(ctx context.Context, channelID string, limit, offset int) ([]models.Message, error) {
	var messages []models.Message
	if err := r.db.WithContext(ctx).
		Where("channel_id = ? AND deleted_at = 0", channelID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return messages, nil
}

func (r *messageRepository) Update(ctx context.Context, m *models.Message) error {
	if err := r.db.WithContext(ctx).Save(m).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *messageRepository) SoftDelete(ctx context.Context, messageID string) error {
	if err := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("id = ? AND deleted_at = 0", messageID).
		Update("deleted_at", gorm.Expr("UNIX_TIMESTAMP()")).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *messageRepository) ListAttachmentsByMessageIDs(ctx context.Context, messageIDs []string) ([]models.MessageAttachment, error) {
	var attachments []models.MessageAttachment
	if len(messageIDs) == 0 {
		return attachments, nil
	}
	if err := r.db.WithContext(ctx).
		Where("message_id IN ? AND deleted_at = 0", messageIDs).
		Find(&attachments).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return attachments, nil
}

func (r *messageRepository) ListAttachmentsByMessageID(ctx context.Context, messageID string) ([]models.MessageAttachment, error) {
	return r.ListAttachmentsByMessageIDs(ctx, []string{messageID})
}

func (r *messageRepository) ListAttachmentsByServerID(ctx context.Context, serverID string) ([]models.MessageAttachment, error) {
	var attachments []models.MessageAttachment
	if serverID == "" {
		return attachments, nil
	}
	if err := r.db.WithContext(ctx).Raw(`
		SELECT ma.id, ma.created_at, ma.updated_at, ma.deleted_at, ma.message_id, ma.file_url, ma.file_type, ma.file_size, ma.file_name
		FROM message_attachments ma
		INNER JOIN messages m ON m.id = ma.message_id
		INNER JOIN channels c ON c.id = m.channel_id
		WHERE c.server_id = ? AND ma.deleted_at = 0
	`, serverID).Scan(&attachments).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return attachments, nil
}

func (r *messageRepository) FindAttachmentsByIDs(ctx context.Context, attachmentIDs []string) ([]models.MessageAttachment, error) {
	var attachments []models.MessageAttachment
	if len(attachmentIDs) == 0 {
		return attachments, nil
	}
	if err := r.db.WithContext(ctx).
		Where("id IN ? AND deleted_at = 0", attachmentIDs).
		Find(&attachments).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return attachments, nil
}

func (r *messageRepository) CreateAttachment(ctx context.Context, attachment *models.MessageAttachment) error {
	if err := r.db.WithContext(ctx).Create(attachment).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *messageRepository) AttachToMessage(ctx context.Context, messageID string, attachmentIDs []string) error {
	if len(attachmentIDs) == 0 {
		return nil
	}
	if err := r.db.WithContext(ctx).
		Model(&models.MessageAttachment{}).
		Where("id IN ? AND deleted_at = 0", attachmentIDs).
		Update("message_id", messageID).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *messageRepository) SoftDeleteAttachmentsByMessageID(ctx context.Context, messageID string) error {
	if err := r.db.WithContext(ctx).
		Model(&models.MessageAttachment{}).
		Where("message_id = ? AND deleted_at = 0", messageID).
		Update("deleted_at", gorm.Expr("UNIX_TIMESTAMP()")).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *messageRepository) SoftDeleteAttachmentsByIDs(ctx context.Context, attachmentIDs []string) error {
	if len(attachmentIDs) == 0 {
		return nil
	}
	if err := r.db.WithContext(ctx).
		Model(&models.MessageAttachment{}).
		Where("id IN ? AND deleted_at = 0", attachmentIDs).
		Update("deleted_at", gorm.Expr("UNIX_TIMESTAMP()")).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *messageRepository) FindReaction(ctx context.Context, messageID, userID, emoji string) (*models.Reaction, error) {
	var reaction models.Reaction
	if err := r.db.WithContext(ctx).
		Where("message_id = ? AND user_id = ? AND emoji = ? AND deleted_at = 0", messageID, userID, emoji).
		First(&reaction).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("REACTION_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &reaction, nil
}

func (r *messageRepository) CreateReaction(ctx context.Context, reaction *models.Reaction) error {
	if err := r.db.WithContext(ctx).Create(reaction).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *messageRepository) DeleteReaction(ctx context.Context, reactionID string) error {
	if err := r.db.WithContext(ctx).Where("id = ? AND deleted_at = 0", reactionID).Delete(&models.Reaction{}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *messageRepository) ListReactionsByMessageIDs(ctx context.Context, messageIDs []string) ([]models.Reaction, error) {
	var reactions []models.Reaction
	if len(messageIDs) == 0 {
		return reactions, nil
	}
	if err := r.db.WithContext(ctx).
		Where("message_id IN ? AND deleted_at = 0", messageIDs).
		Find(&reactions).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return reactions, nil
}
