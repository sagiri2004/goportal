package repositories

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type ServerRepository interface {
	CreateWithOwnerMember(ctx context.Context, server *models.Server, ownerMember *models.ServerMember) error
	FindByID(ctx context.Context, id string) (*models.Server, error)
	DeleteByID(ctx context.Context, id string) error
	FindMember(ctx context.Context, serverID, userID string) (*models.ServerMember, error)
	RemoveMember(ctx context.Context, serverID, userID string) error
	ListMembers(ctx context.Context, serverID string) ([]models.User, error)
}
