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

// UserResponse is the public representation of a user.
type UserResponse struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
}

func NewUserResponse(u *models.User) UserResponse {
	return UserResponse{
		ID:       u.ID,
		Username: u.Username,
		IsAdmin:  u.IsAdmin,
	}
}
