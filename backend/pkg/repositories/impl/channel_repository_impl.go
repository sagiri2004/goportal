package impl

import (
	"context"
	"errors"
	"strings"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"gorm.io/gorm"
)

type channelRepository struct {
	db *gorm.DB
}

func NewChannelRepository(db *gorm.DB) repositories.ChannelRepository {
	return &channelRepository{db: db}
}

func (r *channelRepository) Create(ctx context.Context, channel *models.Channel) error {
	if err := r.db.WithContext(ctx).Create(channel).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *channelRepository) FindByID(ctx context.Context, id string) (*models.Channel, error) {
	var channel models.Channel
	err := r.db.WithContext(ctx).Where("id = ? AND deleted_at = 0", id).First(&channel).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("CHANNEL_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &channel, nil
}

func (r *channelRepository) ListByServerID(ctx context.Context, serverID string) ([]models.Channel, error) {
	var channels []models.Channel
	if err := r.db.WithContext(ctx).
		Where("server_id = ? AND deleted_at = 0", serverID).
		Order("position ASC, created_at ASC").
		Find(&channels).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return channels, nil
}

func (r *channelRepository) GetMaxPositionByParent(ctx context.Context, serverID string, parentID *string) (int, error) {
	var maxPos int
	query := r.db.WithContext(ctx).Model(&models.Channel{}).Where("server_id = ? AND deleted_at = 0", serverID)
	if parentID == nil || *parentID == "" {
		query = query.Where("parent_id IS NULL")
	} else {
		query = query.Where("parent_id = ?", *parentID)
	}

	if err := query.Select("COALESCE(MAX(position), -1)").Scan(&maxPos).Error; err != nil {
		return 0, apperr.E("DB_ERROR", err)
	}
	return maxPos, nil
}

func (r *channelRepository) Update(ctx context.Context, channel *models.Channel) error {
	if err := r.db.WithContext(ctx).Save(channel).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *channelRepository) SetPrivacy(ctx context.Context, channelID string, isPrivate bool) (*models.Channel, error) {
	channel, err := r.FindByID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	channel.IsPrivate = isPrivate
	if err := r.Update(ctx, channel); err != nil {
		return nil, err
	}
	return channel, nil
}

func (r *channelRepository) IsMember(ctx context.Context, channelID, userID string) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.ChannelMember{}).
		Where("channel_id = ? AND user_id = ? AND deleted_at = 0", channelID, userID).
		Count(&count).Error; err != nil {
		return false, apperr.E("DB_ERROR", err)
	}
	return count > 0, nil
}

func (r *channelRepository) AddMember(ctx context.Context, channelID, userID string) error {
	member := &models.ChannelMember{
		ChannelID: channelID,
		UserID:    userID,
	}
	if err := r.db.WithContext(ctx).
		Where("channel_id = ? AND user_id = ?", channelID, userID).
		Assign(map[string]any{"deleted_at": 0}).
		FirstOrCreate(member).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *channelRepository) RemoveMember(ctx context.Context, channelID, userID string) error {
	if err := r.db.WithContext(ctx).
		Where("channel_id = ? AND user_id = ? AND deleted_at = 0", channelID, userID).
		Delete(&models.ChannelMember{}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *channelRepository) ListMembers(ctx context.Context, channelID string) ([]models.ChannelMember, error) {
	var members []models.ChannelMember
	if err := r.db.WithContext(ctx).
		Where("channel_id = ? AND deleted_at = 0", channelID).
		Order("created_at ASC").
		Find(&members).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return members, nil
}

func (r *channelRepository) UpsertOverwrite(ctx context.Context, overwrite *models.ChannelPermissionOverwrite) error {
	overwrite.SubjectType = strings.ToUpper(strings.TrimSpace(overwrite.SubjectType))
	if err := r.db.WithContext(ctx).
		Where("channel_id = ? AND subject_type = ? AND subject_id = ?", overwrite.ChannelID, overwrite.SubjectType, overwrite.SubjectID).
		Assign(map[string]any{
			"allow_bits": overwrite.AllowBits,
			"deny_bits":  overwrite.DenyBits,
			"deleted_at": 0,
		}).
		FirstOrCreate(overwrite).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *channelRepository) DeleteOverwrite(ctx context.Context, channelID, subjectType, subjectID string) error {
	if err := r.db.WithContext(ctx).
		Where("channel_id = ? AND subject_type = ? AND subject_id = ? AND deleted_at = 0", channelID, strings.ToUpper(strings.TrimSpace(subjectType)), subjectID).
		Delete(&models.ChannelPermissionOverwrite{}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *channelRepository) ListOverwrites(ctx context.Context, channelID string) ([]models.ChannelPermissionOverwrite, error) {
	var overwrites []models.ChannelPermissionOverwrite
	if err := r.db.WithContext(ctx).
		Where("channel_id = ? AND deleted_at = 0", channelID).
		Order("subject_type ASC, subject_id ASC").
		Find(&overwrites).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return overwrites, nil
}
