package repositories

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type RelationshipRepository interface {
	FindAnyByUsers(ctx context.Context, userAID, userBID string) (*models.UserRelationship, error)
	FindPendingByUsers(ctx context.Context, requesterID, addresseeID string) (*models.UserRelationship, error)
	Create(ctx context.Context, relationship *models.UserRelationship) error
	Update(ctx context.Context, relationship *models.UserRelationship) error
	ListAcceptedFriends(ctx context.Context, userID string) ([]models.User, error)
}
