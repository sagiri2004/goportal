package services

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type SocialService interface {
	ListFriends(ctx context.Context, userID string) ([]models.User, error)
	SendFriendRequest(ctx context.Context, requesterID, addresseeID string) (*models.UserRelationship, error)
	RespondFriendRequest(ctx context.Context, userID, requesterID, action string) (*models.UserRelationship, error)
	BlockUser(ctx context.Context, userID, targetUserID string) (*models.UserRelationship, error)
}
