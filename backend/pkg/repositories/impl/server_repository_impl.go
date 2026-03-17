package impl

import (
	"context"
	"errors"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"gorm.io/gorm"
)

type serverRepository struct {
	db *gorm.DB
}

func NewServerRepository(db *gorm.DB) repositories.ServerRepository {
	return &serverRepository{db: db}
}

func (r *serverRepository) CreateWithOwnerMember(ctx context.Context, server *models.Server, ownerMember *models.ServerMember) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(server).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		ownerMember.ServerID = server.ID
		if err := tx.Create(ownerMember).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		return nil
	})
}

func (r *serverRepository) FindByID(ctx context.Context, id string) (*models.Server, error) {
	var server models.Server
	err := r.db.WithContext(ctx).Where("id = ? AND deleted_at = 0", id).First(&server).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("SERVER_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &server, nil
}

func (r *serverRepository) DeleteByID(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Server{}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *serverRepository) FindMember(ctx context.Context, serverID, userID string) (*models.ServerMember, error) {
	var member models.ServerMember
	err := r.db.WithContext(ctx).
		Where("server_id = ? AND user_id = ? AND deleted_at = 0", serverID, userID).
		First(&member).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("SERVER_MEMBER_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &member, nil
}

func (r *serverRepository) RemoveMember(ctx context.Context, serverID, userID string) error {
	err := r.db.WithContext(ctx).
		Where("server_id = ? AND user_id = ? AND deleted_at = 0", serverID, userID).
		Delete(&models.ServerMember{}).Error
	if err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *serverRepository) ListMembers(ctx context.Context, serverID string) ([]models.User, error) {
	var users []models.User
	err := r.db.WithContext(ctx).Raw(`
		SELECT u.id, u.created_at, u.updated_at, u.deleted_at, u.username, u.password, u.is_admin
		FROM users u
		INNER JOIN server_members sm ON sm.user_id = u.id
		WHERE sm.server_id = ? AND sm.deleted_at = 0 AND u.deleted_at = 0
		ORDER BY u.username ASC
	`, serverID).Scan(&users).Error
	if err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return users, nil
}
