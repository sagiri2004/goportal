package impl

import (
	"context"
	"errors"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"

	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a GORM-based implementation of UserRepository.
func NewUserRepository(db *gorm.DB) repositories.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	var u models.User
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&u).Error; err != nil {
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

func (r *userRepository) Update(ctx context.Context, u *models.User) error {
	if err := r.db.WithContext(ctx).Save(u).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}
