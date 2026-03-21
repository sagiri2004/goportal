package services

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

// UserService defines business logic for users.
type UserService interface {
	Register(ctx context.Context, username, password string, isAdmin bool) (*models.User, error)
	Authenticate(ctx context.Context, username, password string) (*models.User, error)
	GetByID(ctx context.Context, id string) (*models.User, error)
	UpdateProfile(ctx context.Context, id string, username, avatarURL *string) (*models.User, error)
}
