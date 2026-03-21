package serializers

import "github.com/sagiri2004/goportal/pkg/models"

type CreateRoleRequest struct {
	Name        string   `json:"name" binding:"required,min=1,max=100"`
	IconURL     *string  `json:"icon_url,omitempty"`
	Color       string   `json:"color" binding:"required"`
	Permissions []string `json:"permissions" binding:"required"`
}

type UpdateRoleRequest struct {
	Name        *string  `json:"name,omitempty"`
	IconURL     *string  `json:"icon_url,omitempty"`
	Color       *string  `json:"color,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
}

type RoleResponse struct {
	ID          string   `json:"id"`
	ServerID    string   `json:"server_id"`
	Name        string   `json:"name"`
	IconURL     *string  `json:"icon_url,omitempty"`
	Color       string   `json:"color"`
	Position    int      `json:"position"`
	IsEveryone  bool     `json:"is_everyone"`
	Permissions []string `json:"permissions"`
}

func NewRoleResponse(role *models.Role, isEveryone bool) RoleResponse {
	return RoleResponse{
		ID:          role.ID,
		ServerID:    role.ServerID,
		Name:        role.Name,
		IconURL:     role.IconURL,
		Color:       role.Color,
		Position:    role.Position,
		IsEveryone:  isEveryone,
		Permissions: models.PermissionNamesFromBitset(role.Permissions),
	}
}

type CreateInviteRequest struct {
	MaxUses   int    `json:"max_uses"`
	ExpiresAt *int64 `json:"expires_at,omitempty"`
}

type InviteResponse struct {
	ID        string `json:"id"`
	ServerID  string `json:"server_id"`
	InviterID string `json:"inviter_id"`
	Code      string `json:"code"`
	MaxUses   int    `json:"max_uses"`
	Uses      int    `json:"uses"`
	ExpiresAt *int64 `json:"expires_at,omitempty"`
}

func NewInviteResponse(invite *models.ServerInvite) InviteResponse {
	return InviteResponse{
		ID:        invite.ID,
		ServerID:  invite.ServerID,
		InviterID: invite.InviterID,
		Code:      invite.Code,
		MaxUses:   invite.MaxUses,
		Uses:      invite.Uses,
		ExpiresAt: invite.ExpiresAt,
	}
}

type MemberRoleAssignmentRequest struct {
	RoleIDs []string `json:"role_ids" binding:"required"`
}

type AddServerMemberRequest struct {
	UserID string `json:"user_id" binding:"required"`
}

type CreateJoinRequest struct {
	Note string `json:"note,omitempty"`
}

type ReviewJoinRequestRequest struct {
	Approve bool   `json:"approve"`
	Note    string `json:"note,omitempty"`
}

type JoinRequestResponse struct {
	ID           string  `json:"id"`
	ServerID     string  `json:"server_id"`
	UserID       string  `json:"user_id"`
	Status       string  `json:"status"`
	ReviewedBy   *string `json:"reviewed_by,omitempty"`
	ReviewedAt   *int64  `json:"reviewed_at,omitempty"`
	DecisionNote string  `json:"decision_note,omitempty"`
}

func NewJoinRequestResponse(req *models.ServerJoinRequest) JoinRequestResponse {
	return JoinRequestResponse{
		ID:           req.ID,
		ServerID:     req.ServerID,
		UserID:       req.UserID,
		Status:       req.Status,
		ReviewedBy:   req.ReviewedBy,
		ReviewedAt:   req.ReviewedAt,
		DecisionNote: req.DecisionNote,
	}
}

type MemberWithRolesResponse struct {
	User  UserResponse   `json:"user"`
	Roles []RoleResponse `json:"roles"`
}
