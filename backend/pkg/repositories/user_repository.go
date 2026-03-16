package repositories

import (
	"context"

	"goportal/pkg/models"
)

// UserRepository defines persistence operations for users.
type UserRepository interface {
	FindByID(ctx context.Context, id uint) (*models.User, error)
	FindByUsername(ctx context.Context, username string) (*models.User, error)
	Create(ctx context.Context, u *models.User) error
}

