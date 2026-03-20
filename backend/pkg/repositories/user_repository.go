package repositories

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

// UserRepository defines persistence operations for users.
type UserRepository interface {
	FindByID(ctx context.Context, id string) (*models.User, error)
	FindByIDs(ctx context.Context, ids []string) ([]models.User, error)
	FindByUsername(ctx context.Context, username string) (*models.User, error)
	Create(ctx context.Context, u *models.User) error
	Update(ctx context.Context, u *models.User) error
}
