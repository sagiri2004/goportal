package impl

import (
	"context"
	"errors"

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
