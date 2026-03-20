package serializers

import "github.com/sagiri2004/goportal/pkg/models"

// RegisterRequest represents the payload for registering a new user.
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginRequest represents the payload for logging in.
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type UpdateProfileRequest struct {
	Username string `json:"username" binding:"required,min=3"`
}

type FriendRequestCreateRequest struct {
	UserID string `json:"user_id" binding:"required"`
}

type FriendRequestRespondRequest struct {
	RequesterID string `json:"requester_id" binding:"required"`
	Action      string `json:"action" binding:"required"`
}

type FriendBlockRequest struct {
	UserID string `json:"user_id" binding:"required"`
}

// UserResponse is the public representation of a user.
type UserResponse struct {
	ID        string  `json:"id"`
	Username  string  `json:"username"`
	IsAdmin   bool    `json:"is_admin"`
	Status    string  `json:"status"`
	AvatarURL *string `json:"avatar_url"`
}

func NewUserResponse(u *models.User) UserResponse {
	status := u.Status
	if status == "" {
		status = "offline"
	}

	return UserResponse{
		ID:        u.ID,
		Username:  u.Username,
		IsAdmin:   u.IsAdmin,
		Status:    status,
		AvatarURL: u.AvatarURL,
	}
}

type FriendRelationshipResponse struct {
	ID          string `json:"id"`
	RequesterID string `json:"requester_id"`
	AddresseeID string `json:"addressee_id"`
	Status      string `json:"status"`
}

func NewFriendRelationshipResponse(relationship *models.UserRelationship) FriendRelationshipResponse {
	return FriendRelationshipResponse{
		ID:          relationship.ID,
		RequesterID: relationship.RequesterID,
		AddresseeID: relationship.AddresseeID,
		Status:      relationship.Status,
	}
}
