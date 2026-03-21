package repositories

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type InviteLookupResult struct {
	Invite models.ServerInvite
	Server models.Server
}

type ServerMemberWithRoles struct {
	User  models.User
	Roles []models.Role
}

type ServerRepository interface {
	CreateWithOwnerMember(ctx context.Context, server *models.Server, ownerMember *models.ServerMember) error
	FindByID(ctx context.Context, id string) (*models.Server, error)
	UpdateServer(ctx context.Context, id string, name, iconURL, bannerURL *string) (*models.Server, error)
	ListByUserID(ctx context.Context, userID string) ([]models.Server, error)
	DeleteByID(ctx context.Context, id string) error
	FindMember(ctx context.Context, serverID, userID string) (*models.ServerMember, error)
	RemoveMember(ctx context.Context, serverID, userID string) error
	ListMembers(ctx context.Context, serverID string) ([]models.User, error)
	GetMemberPermissions(ctx context.Context, serverID, userID string) (int64, error)
	GetMemberHighestRolePosition(ctx context.Context, serverID, userID string) (int, error)
	GetMaxRolePosition(ctx context.Context, serverID string) (int, error)
	GetMaxRolePositionBelow(ctx context.Context, serverID string, maxExclusive int) (int, error)
	HasPermission(ctx context.Context, serverID, userID string, permission int64) (bool, error)
	CreateRole(ctx context.Context, role *models.Role, permissionValues []int64) error
	UpdateRole(ctx context.Context, roleID string, name, iconURL, color *string, permissionValues []int64) (*models.Role, error)
	DeleteRole(ctx context.Context, roleID string) error
	FindRoleByID(ctx context.Context, roleID string) (*models.Role, error)
	ListRolesByServerID(ctx context.Context, serverID string) ([]models.Role, error)
	ListMemberRoles(ctx context.Context, serverID, userID string) ([]models.Role, error)
	CreateInvite(ctx context.Context, invite *models.ServerInvite) error
	FindInviteByCode(ctx context.Context, code string) (*models.ServerInvite, error)
	FindInviteWithServer(ctx context.Context, code string) (*InviteLookupResult, error)
	CountActiveMembers(ctx context.Context, serverID string) (int64, error)
	JoinServerByInvite(ctx context.Context, code, userID string, nowUnix int64) (*models.Server, error)
	JoinPublicServer(ctx context.Context, serverID, userID string) error
	AddMemberWithDefaultRole(ctx context.Context, serverID, userID string) error
	UpdateMemberRoles(ctx context.Context, serverID, userID string, roleIDs []string) error
	ListMembersWithRoles(ctx context.Context, serverID string) ([]ServerMemberWithRoles, error)
	CreateJoinRequest(ctx context.Context, req *models.ServerJoinRequest) error
	ListJoinRequests(ctx context.Context, serverID, status string) ([]models.ServerJoinRequest, error)
	FindJoinRequestByID(ctx context.Context, requestID string) (*models.ServerJoinRequest, error)
	UpdateJoinRequest(ctx context.Context, req *models.ServerJoinRequest) error
}
