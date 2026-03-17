package services

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type ServerService interface {
	CreateServer(ctx context.Context, ownerID, name string) (*models.Server, error)
	ListMembers(ctx context.Context, actorID, serverID string) ([]models.User, error)
	DeleteServer(ctx context.Context, actorID, serverID string) error
	KickMember(ctx context.Context, actorID, serverID, memberUserID string) error
	LeaveServer(ctx context.Context, actorID, serverID string) error
}
