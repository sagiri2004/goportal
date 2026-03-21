package impl

import (
	"context"
	"errors"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"gorm.io/gorm"
)

type recordingRepository struct {
	db *gorm.DB
}

func NewRecordingRepository(db *gorm.DB) repositories.RecordingRepository {
	return &recordingRepository{db: db}
}

func (r *recordingRepository) Create(ctx context.Context, recording *models.Recording) error {
	if err := r.db.WithContext(ctx).Create(recording).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *recordingRepository) Update(ctx context.Context, recording *models.Recording) error {
	if err := r.db.WithContext(ctx).Save(recording).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *recordingRepository) FindByEgressID(ctx context.Context, egressID string) (*models.Recording, error) {
	var recording models.Recording
	err := r.db.WithContext(ctx).
		Where("egress_id = ? AND deleted_at = 0", egressID).
		First(&recording).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("RECORDING_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &recording, nil
}

func (r *recordingRepository) FindActiveByChannelAndType(ctx context.Context, channelID, recordingType string) (*models.Recording, error) {
	var recording models.Recording
	err := r.db.WithContext(ctx).
		Where("channel_id = ? AND type = ? AND status = ? AND deleted_at = 0", channelID, recordingType, models.RecordingStatusActive).
		Order("started_at DESC").
		First(&recording).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("RECORDING_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &recording, nil
}

func (r *recordingRepository) ListByChannel(ctx context.Context, channelID string, limit, offset int) ([]models.Recording, error) {
	var recordings []models.Recording
	if err := r.db.WithContext(ctx).
		Where("channel_id = ? AND deleted_at = 0", channelID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&recordings).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return recordings, nil
}
