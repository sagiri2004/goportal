package impl

import (
	"context"
	"errors"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"gorm.io/gorm"
)

type relationshipRepository struct {
	db *gorm.DB
}

func NewRelationshipRepository(db *gorm.DB) repositories.RelationshipRepository {
	return &relationshipRepository{db: db}
}

func (r *relationshipRepository) FindAnyByUsers(ctx context.Context, userAID, userBID string) (*models.UserRelationship, error) {
	var relationship models.UserRelationship
	err := r.db.WithContext(ctx).
		Where(
			"(requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)",
			userAID, userBID, userBID, userAID,
		).
		First(&relationship).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("FRIEND_REQUEST_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &relationship, nil
}

func (r *relationshipRepository) FindPendingByUsers(ctx context.Context, requesterID, addresseeID string) (*models.UserRelationship, error) {
	var relationship models.UserRelationship
	err := r.db.WithContext(ctx).
		Where("requester_id = ? AND addressee_id = ? AND status = ?", requesterID, addresseeID, models.RelationshipStatusPending).
		First(&relationship).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("FRIEND_REQUEST_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &relationship, nil
}

func (r *relationshipRepository) Create(ctx context.Context, relationship *models.UserRelationship) error {
	if err := r.db.WithContext(ctx).Create(relationship).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *relationshipRepository) Update(ctx context.Context, relationship *models.UserRelationship) error {
	if err := r.db.WithContext(ctx).Save(relationship).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *relationshipRepository) ListAcceptedFriends(ctx context.Context, userID string) ([]models.User, error) {
	var users []models.User
	err := r.db.WithContext(ctx).Raw(`
		SELECT u.id, u.created_at, u.updated_at, u.deleted_at, u.username, u.password, u.is_admin
		FROM users u
		INNER JOIN user_relationships ur
			ON (
				(ur.requester_id = ? AND ur.addressee_id = u.id) OR
				(ur.addressee_id = ? AND ur.requester_id = u.id)
			)
		WHERE ur.status = ? AND ur.deleted_at = 0 AND u.deleted_at = 0
	`, userID, userID, models.RelationshipStatusAccepted).Scan(&users).Error
	if err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return users, nil
}
