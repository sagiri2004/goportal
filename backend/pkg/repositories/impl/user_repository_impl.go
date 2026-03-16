package impl

import (
	"context"
	"errors"

	"goportal/pkg/apperr"
	"goportal/pkg/models"
	"goportal/pkg/repositories"

	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a GORM-based implementation of UserRepository.
func NewUserRepository(db *gorm.DB) repositories.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) FindByID(ctx context.Context, id uint) (*models.User, error) {
	var u models.User
	if err := r.db.WithContext(ctx).First(&u, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("USER_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &u, nil
}

func (r *userRepository) FindByUsername(ctx context.Context, username string) (*models.User, error) {
	var u models.User
	if err := r.db.WithContext(ctx).Where("username = ?", username).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("USER_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &u, nil
}

func (r *userRepository) Create(ctx context.Context, u *models.User) error {
	if err := r.db.WithContext(ctx).Create(u).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

