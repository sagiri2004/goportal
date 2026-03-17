package services

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type CreateInviteInput struct {
	MaxUses   int
	ExpiresAt *int64
}

type ServerMemberWithRoles struct {
	User  models.User
	Roles []models.Role
}

type CreateJoinRequestInput struct {
	Note string
}

type ReviewJoinRequestInput struct {
	RequestID string
	Approve   bool
	Note      string
}

type ServerService interface {
	CreateServer(ctx context.Context, ownerID, name string, isPublic bool) (*models.Server, error)
	ListUserServers(ctx context.Context, userID string) ([]models.Server, error)
	ListMembers(ctx context.Context, actorID, serverID string) ([]models.User, error)
	ListMembersWithRoles(ctx context.Context, actorID, serverID string) ([]ServerMemberWithRoles, error)
	DeleteServer(ctx context.Context, actorID, serverID string) error
	KickMember(ctx context.Context, actorID, serverID, memberUserID string) error
	LeaveServer(ctx context.Context, actorID, serverID string) error
	CreateRole(ctx context.Context, actorID, serverID, name string, permissionValues []int64, position int) (*models.Role, error)
	UpdateRole(ctx context.Context, actorID, roleID string, name *string, permissionValues []int64, position *int) (*models.Role, error)
	CreateInvite(ctx context.Context, actorID, serverID string, input CreateInviteInput) (*models.ServerInvite, error)
	GetInvite(ctx context.Context, code string) (*models.ServerInvite, *models.Server, error)
	JoinByInvite(ctx context.Context, actorID, code string) (*models.Server, error)
	JoinPublicServer(ctx context.Context, actorID, serverID string) error
	CreateJoinRequest(ctx context.Context, actorID, serverID string, input CreateJoinRequestInput) (*models.ServerJoinRequest, error)
	ListJoinRequests(ctx context.Context, actorID, serverID, status string) ([]models.ServerJoinRequest, error)
	ReviewJoinRequest(ctx context.Context, actorID, serverID string, input ReviewJoinRequestInput) (*models.ServerJoinRequest, error)
	AddMember(ctx context.Context, actorID, serverID, targetUserID string) error
	UpdateMemberRoles(ctx context.Context, actorID, serverID, targetUserID string, roleIDs []string) error
}
