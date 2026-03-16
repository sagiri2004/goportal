package services

import (
	"context"

	"goportal/pkg/models"
)

// UserService defines business logic for users.
type UserService interface {
	Register(ctx context.Context, username, password string, isAdmin bool) (*models.User, error)
	Authenticate(ctx context.Context, username, password string) (*models.User, error)
	GetByID(ctx context.Context, id uint) (*models.User, error)
}

