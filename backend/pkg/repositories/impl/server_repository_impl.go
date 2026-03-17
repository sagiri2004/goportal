package impl

import (
	"context"
	"errors"
	"fmt"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type serverRepository struct {
	db *gorm.DB
}

func NewServerRepository(db *gorm.DB) repositories.ServerRepository {
	return &serverRepository{db: db}
}

func (r *serverRepository) CreateWithOwnerMember(ctx context.Context, server *models.Server, ownerMember *models.ServerMember) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureDefaultPermissions(tx); err != nil {
			return err
		}
		if err := tx.Create(server).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}

		defaultRole := &models.Role{
			ServerID:    server.ID,
			Name:        "@everyone",
			Position:    0,
			Permissions: models.PermissionViewChannel | models.PermissionReadMessages | models.PermissionReadMessageHistory | models.PermissionSendMessages | models.PermissionAddReactions,
		}
		if err := tx.Create(defaultRole).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		if err := replaceRolePermissions(tx, defaultRole.ID, []int64{
			models.PermissionViewChannel,
			models.PermissionReadMessages,
			models.PermissionReadMessageHistory,
			models.PermissionSendMessages,
			models.PermissionAddReactions,
		}); err != nil {
			return err
		}

		moderatorRole := &models.Role{
			ServerID: server.ID,
			Name:     "moderator",
			Position: 50,
			Permissions: models.PermissionViewChannel |
				models.PermissionReadMessages |
				models.PermissionReadMessageHistory |
				models.PermissionSendMessages |
				models.PermissionAddReactions |
				models.PermissionManageMessages |
				models.PermissionCreateInvite |
				models.PermissionApproveMembers,
		}
		if err := tx.Create(moderatorRole).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		if err := replaceRolePermissions(tx, moderatorRole.ID, []int64{
			models.PermissionViewChannel,
			models.PermissionReadMessages,
			models.PermissionReadMessageHistory,
			models.PermissionSendMessages,
			models.PermissionAddReactions,
			models.PermissionManageMessages,
			models.PermissionCreateInvite,
			models.PermissionApproveMembers,
		}); err != nil {
			return err
		}

		adminRole := &models.Role{
			ServerID:    server.ID,
			Name:        "admin",
			Position:    80,
			Permissions: models.PermissionAdministrator,
		}
		if err := tx.Create(adminRole).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		if err := replaceRolePermissions(tx, adminRole.ID, []int64{models.PermissionAdministrator}); err != nil {
			return err
		}

		ownerRole := &models.Role{
			ServerID:    server.ID,
			Name:        "owner",
			Position:    100,
			Permissions: models.PermissionAdministrator,
		}
		if err := tx.Create(ownerRole).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		if err := replaceRolePermissions(tx, ownerRole.ID, []int64{models.PermissionAdministrator}); err != nil {
			return err
		}

		server.DefaultRoleID = &defaultRole.ID
		if err := tx.Model(server).Update("default_role_id", defaultRole.ID).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}

		ownerMember.ServerID = server.ID
		if err := tx.Create(ownerMember).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		ownerMappings := []models.ServerMemberRole{
			{ServerMemberID: ownerMember.ID, RoleID: ownerRole.ID},
			{ServerMemberID: ownerMember.ID, RoleID: defaultRole.ID},
		}
		if err := tx.Create(&ownerMappings).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		return nil
	})
}

func (r *serverRepository) FindByID(ctx context.Context, id string) (*models.Server, error) {
	var server models.Server
	err := r.db.WithContext(ctx).Where("id = ? AND deleted_at = 0", id).First(&server).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("SERVER_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &server, nil
}

func (r *serverRepository) DeleteByID(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Server{}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *serverRepository) FindMember(ctx context.Context, serverID, userID string) (*models.ServerMember, error) {
	var member models.ServerMember
	err := r.db.WithContext(ctx).
		Where("server_id = ? AND user_id = ? AND deleted_at = 0", serverID, userID).
		First(&member).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("SERVER_MEMBER_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &member, nil
}

func (r *serverRepository) RemoveMember(ctx context.Context, serverID, userID string) error {
	err := r.db.WithContext(ctx).
		Where("server_id = ? AND user_id = ? AND deleted_at = 0", serverID, userID).
		Delete(&models.ServerMember{}).Error
	if err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *serverRepository) ListMembers(ctx context.Context, serverID string) ([]models.User, error) {
	var users []models.User
	err := r.db.WithContext(ctx).Raw(`
		SELECT u.id, u.created_at, u.updated_at, u.deleted_at, u.username, u.password, u.is_admin
		FROM users u
		INNER JOIN server_members sm ON sm.user_id = u.id
		WHERE sm.server_id = ? AND sm.deleted_at = 0 AND u.deleted_at = 0
		ORDER BY u.username ASC
	`, serverID).Scan(&users).Error
	if err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return users, nil
}

func (r *serverRepository) GetMemberPermissions(ctx context.Context, serverID, userID string) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(DISTINCT r.permissions), 0) AS total
		FROM server_members sm
		INNER JOIN server_member_role smr ON smr.server_member_id = sm.id AND smr.deleted_at = 0
		INNER JOIN roles r ON r.id = smr.role_id AND r.deleted_at = 0
		WHERE sm.server_id = ? AND sm.user_id = ? AND sm.deleted_at = 0
	`, serverID, userID).Scan(&total).Error
	if err != nil {
		return 0, apperr.E("DB_ERROR", err)
	}
	return total, nil
}

func (r *serverRepository) GetMemberHighestRolePosition(ctx context.Context, serverID, userID string) (int, error) {
	var highest int
	err := r.db.WithContext(ctx).Raw(`
		SELECT COALESCE(MAX(r.position), -1) AS highest
		FROM server_members sm
		INNER JOIN server_member_role smr ON smr.server_member_id = sm.id AND smr.deleted_at = 0
		INNER JOIN roles r ON r.id = smr.role_id AND r.deleted_at = 0
		WHERE sm.server_id = ? AND sm.user_id = ? AND sm.deleted_at = 0
	`, serverID, userID).Scan(&highest).Error
	if err != nil {
		return -1, apperr.E("DB_ERROR", err)
	}
	return highest, nil
}

func (r *serverRepository) HasPermission(ctx context.Context, serverID, userID string, permission int64) (bool, error) {
	total, err := r.GetMemberPermissions(ctx, serverID, userID)
	if err != nil {
		return false, err
	}
	if (total & models.PermissionAdministrator) == models.PermissionAdministrator {
		return true, nil
	}
	return (total & permission) == permission, nil
}

func (r *serverRepository) CreateRole(ctx context.Context, role *models.Role, permissionValues []int64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureDefaultPermissions(tx); err != nil {
			return err
		}
		if err := tx.Create(role).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		if err := replaceRolePermissions(tx, role.ID, permissionValues); err != nil {
			return err
		}
		return nil
	})
}

func (r *serverRepository) UpdateRole(ctx context.Context, roleID string, name *string, permissionValues []int64, position *int) (*models.Role, error) {
	var role models.Role
	if err := r.db.WithContext(ctx).Where("id = ? AND deleted_at = 0", roleID).First(&role).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("ROLE_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		updates := map[string]any{}
		if name != nil {
			updates["name"] = *name
		}
		if permissionValues != nil {
			updates["permissions"] = sumPermissionValues(permissionValues)
		}
		if position != nil {
			updates["position"] = *position
		}
		if len(updates) > 0 {
			if err := tx.Model(&models.Role{}).Where("id = ?", roleID).Updates(updates).Error; err != nil {
				return apperr.E("DB_ERROR", err)
			}
		}
		if permissionValues != nil {
			if err := replaceRolePermissions(tx, roleID, permissionValues); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return r.FindRoleByID(ctx, roleID)
}

func (r *serverRepository) FindRoleByID(ctx context.Context, roleID string) (*models.Role, error) {
	var role models.Role
	err := r.db.WithContext(ctx).Where("id = ? AND deleted_at = 0", roleID).First(&role).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("ROLE_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &role, nil
}

func (r *serverRepository) ListRolesByServerID(ctx context.Context, serverID string) ([]models.Role, error) {
	var roles []models.Role
	if err := r.db.WithContext(ctx).
		Where("server_id = ? AND deleted_at = 0", serverID).
		Order("name ASC").
		Find(&roles).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return roles, nil
}

func (r *serverRepository) ListMemberRoles(ctx context.Context, serverID, userID string) ([]models.Role, error) {
	var roles []models.Role
	if err := r.db.WithContext(ctx).Raw(`
		SELECT r.id, r.created_at, r.updated_at, r.deleted_at, r.server_id, r.name, r.position, r.permissions
		FROM server_members sm
		INNER JOIN server_member_role smr ON smr.server_member_id = sm.id AND smr.deleted_at = 0
		INNER JOIN roles r ON r.id = smr.role_id AND r.deleted_at = 0
		WHERE sm.server_id = ? AND sm.user_id = ? AND sm.deleted_at = 0
	`, serverID, userID).Scan(&roles).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return roles, nil
}

func (r *serverRepository) CreateInvite(ctx context.Context, invite *models.ServerInvite) error {
	if err := r.db.WithContext(ctx).Create(invite).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *serverRepository) FindInviteByCode(ctx context.Context, code string) (*models.ServerInvite, error) {
	var invite models.ServerInvite
	err := r.db.WithContext(ctx).Where("code = ? AND deleted_at = 0", code).First(&invite).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("INVITE_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &invite, nil
}

func (r *serverRepository) FindInviteWithServer(ctx context.Context, code string) (*repositories.InviteLookupResult, error) {
	invite, err := r.FindInviteByCode(ctx, code)
	if err != nil {
		return nil, err
	}
	server, err := r.FindByID(ctx, invite.ServerID)
	if err != nil {
		return nil, err
	}
	return &repositories.InviteLookupResult{
		Invite: *invite,
		Server: *server,
	}, nil
}

func (r *serverRepository) JoinServerByInvite(ctx context.Context, code, userID string, nowUnix int64) (*models.Server, error) {
	var outServer models.Server
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var invite models.ServerInvite
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("code = ? AND deleted_at = 0", code).
			First(&invite).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return apperr.E("INVITE_NOT_FOUND", err)
			}
			return apperr.E("DB_ERROR", err)
		}
		if invite.MaxUses > 0 && invite.Uses >= invite.MaxUses {
			return apperr.E("INVITE_EXHAUSTED", nil)
		}
		if invite.ExpiresAt != nil && *invite.ExpiresAt <= nowUnix {
			return apperr.E("INVITE_EXPIRED", nil)
		}

		var server models.Server
		if err := tx.Where("id = ? AND deleted_at = 0", invite.ServerID).First(&server).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return apperr.E("SERVER_NOT_FOUND", err)
			}
			return apperr.E("DB_ERROR", err)
		}

		joined, err := joinServerWithDefaultRole(tx, server.ID, userID)
		if err != nil {
			return err
		}
		if joined {
			if err := tx.Model(&models.ServerInvite{}).
				Where("id = ?", invite.ID).
				Update("uses", invite.Uses+1).Error; err != nil {
				return apperr.E("DB_ERROR", err)
			}
		}

		outServer = server
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &outServer, nil
}

func (r *serverRepository) JoinPublicServer(ctx context.Context, serverID, userID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var server models.Server
		if err := tx.Where("id = ? AND deleted_at = 0", serverID).First(&server).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return apperr.E("SERVER_NOT_FOUND", err)
			}
			return apperr.E("DB_ERROR", err)
		}
		if !server.IsPublic {
			return apperr.E("SERVER_NOT_PUBLIC", nil)
		}
		_, err := joinServerWithDefaultRole(tx, serverID, userID)
		return err
	})
}

func (r *serverRepository) AddMemberWithDefaultRole(ctx context.Context, serverID, userID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		_, err := joinServerWithDefaultRole(tx, serverID, userID)
		return err
	})
}

func (r *serverRepository) UpdateMemberRoles(ctx context.Context, serverID, userID string, roleIDs []string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var member models.ServerMember
		if err := tx.Where("server_id = ? AND user_id = ? AND deleted_at = 0", serverID, userID).First(&member).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return apperr.E("SERVER_MEMBER_NOT_FOUND", err)
			}
			return apperr.E("DB_ERROR", err)
		}

		if len(roleIDs) > 0 {
			var count int64
			if err := tx.Model(&models.Role{}).
				Where("server_id = ? AND id IN ? AND deleted_at = 0", serverID, roleIDs).
				Count(&count).Error; err != nil {
				return apperr.E("DB_ERROR", err)
			}
			if count != int64(len(roleIDs)) {
				return apperr.E("ROLE_NOT_FOUND", nil)
			}
		}

		if err := tx.Where("server_member_id = ?", member.ID).Delete(&models.ServerMemberRole{}).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		for _, roleID := range roleIDs {
			mapping := models.ServerMemberRole{ServerMemberID: member.ID, RoleID: roleID}
			if err := tx.Create(&mapping).Error; err != nil {
				return apperr.E("DB_ERROR", err)
			}
		}
		return nil
	})
}

func (r *serverRepository) ListMembersWithRoles(ctx context.Context, serverID string) ([]repositories.ServerMemberWithRoles, error) {
	type memberRow struct {
		MemberID string
		ID       string
		Username string
		IsAdmin  bool
	}
	var rows []memberRow
	if err := r.db.WithContext(ctx).Raw(`
		SELECT sm.id AS member_id, u.id, u.username, u.is_admin
		FROM server_members sm
		INNER JOIN users u ON u.id = sm.user_id
		WHERE sm.server_id = ? AND sm.deleted_at = 0 AND u.deleted_at = 0
		ORDER BY u.username ASC
	`, serverID).Scan(&rows).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}

	result := make([]repositories.ServerMemberWithRoles, 0, len(rows))
	for _, row := range rows {
		var roles []models.Role
		if err := r.db.WithContext(ctx).Raw(`
			SELECT r.id, r.created_at, r.updated_at, r.deleted_at, r.server_id, r.name, r.position, r.permissions
			FROM roles r
			INNER JOIN server_member_role smr ON smr.role_id = r.id
			WHERE smr.server_member_id = ? AND smr.deleted_at = 0 AND r.deleted_at = 0
			ORDER BY r.name ASC
		`, row.MemberID).Scan(&roles).Error; err != nil {
			return nil, apperr.E("DB_ERROR", err)
		}
		result = append(result, repositories.ServerMemberWithRoles{
			User: models.User{
				ID:       row.ID,
				Username: row.Username,
				IsAdmin:  row.IsAdmin,
			},
			Roles: roles,
		})
	}
	return result, nil
}

func (r *serverRepository) CreateJoinRequest(ctx context.Context, req *models.ServerJoinRequest) error {
	if err := r.db.WithContext(ctx).Create(req).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *serverRepository) ListJoinRequests(ctx context.Context, serverID, status string) ([]models.ServerJoinRequest, error) {
	var requests []models.ServerJoinRequest
	query := r.db.WithContext(ctx).Where("server_id = ? AND deleted_at = 0", serverID)
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if err := query.Order("created_at ASC").Find(&requests).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return requests, nil
}

func (r *serverRepository) FindJoinRequestByID(ctx context.Context, requestID string) (*models.ServerJoinRequest, error) {
	var req models.ServerJoinRequest
	err := r.db.WithContext(ctx).Where("id = ? AND deleted_at = 0", requestID).First(&req).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("JOIN_REQUEST_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &req, nil
}

func (r *serverRepository) UpdateJoinRequest(ctx context.Context, req *models.ServerJoinRequest) error {
	if err := r.db.WithContext(ctx).Save(req).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func ensureDefaultPermissions(tx *gorm.DB) error {
	defaultPerms := []models.Permission{
		{Name: "VIEW_CHANNEL", Value: models.PermissionViewChannel},
		{Name: "CREATE_INVITE", Value: models.PermissionCreateInvite},
		{Name: "SEND_MESSAGES", Value: models.PermissionSendMessages},
		{Name: "READ_MESSAGES", Value: models.PermissionReadMessages},
		{Name: "READ_MESSAGE_HISTORY", Value: models.PermissionReadMessageHistory},
		{Name: "MANAGE_MESSAGES", Value: models.PermissionManageMessages},
		{Name: "ATTACH_FILES", Value: models.PermissionAttachFiles},
		{Name: "EMBED_LINKS", Value: models.PermissionEmbedLinks},
		{Name: "ADD_REACTIONS", Value: models.PermissionAddReactions},
		{Name: "MANAGE_CHANNELS", Value: models.PermissionManageChannels},
		{Name: "MANAGE_ROLES", Value: models.PermissionManageRoles},
		{Name: "KICK_MEMBERS", Value: models.PermissionKickMembers},
		{Name: "BAN_MEMBERS", Value: models.PermissionBanMembers},
		{Name: "APPROVE_MEMBERS", Value: models.PermissionApproveMembers},
		{Name: "ADMINISTRATOR", Value: models.PermissionAdministrator},
		{Name: "MANAGE_SERVER", Value: models.PermissionManageServer},
	}
	for _, perm := range defaultPerms {
		if err := tx.Where("value = ?", perm.Value).
			Assign(models.Permission{Name: perm.Name}).
			FirstOrCreate(&perm).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
	}
	return nil
}

func sumPermissionValues(values []int64) int64 {
	var total int64
	for _, value := range values {
		total += value
	}
	return total
}

func replaceRolePermissions(tx *gorm.DB, roleID string, permissionValues []int64) error {
	if err := tx.Where("role_id = ?", roleID).Delete(&models.RolePermission{}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	if len(permissionValues) == 0 {
		return nil
	}

	var permissions []models.Permission
	if err := tx.Where("value IN ? AND deleted_at = 0", permissionValues).Find(&permissions).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	if len(permissions) != len(permissionValues) {
		return apperr.E("PERMISSION_INVALID", fmt.Errorf("found=%d expected=%d", len(permissions), len(permissionValues)))
	}

	for _, perm := range permissions {
		rp := models.RolePermission{
			RoleID:       roleID,
			PermissionID: perm.ID,
		}
		if err := tx.Create(&rp).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
	}
	return nil
}

func joinServerWithDefaultRole(tx *gorm.DB, serverID, userID string) (bool, error) {
	var server models.Server
	if err := tx.Where("id = ? AND deleted_at = 0", serverID).First(&server).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, apperr.E("SERVER_NOT_FOUND", err)
		}
		return false, apperr.E("DB_ERROR", err)
	}

	var member models.ServerMember
	err := tx.Where("server_id = ? AND user_id = ? AND deleted_at = 0", serverID, userID).First(&member).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return false, apperr.E("DB_ERROR", err)
		}
		member = models.ServerMember{
			ServerID: serverID,
			UserID:   userID,
		}
		if err := tx.Create(&member).Error; err != nil {
			return false, apperr.E("DB_ERROR", err)
		}
	} else {
		return false, nil
	}

	if server.DefaultRoleID == nil || *server.DefaultRoleID == "" {
		return false, apperr.E("DEFAULT_ROLE_NOT_FOUND", nil)
	}
	memberRole := models.ServerMemberRole{
		ServerMemberID: member.ID,
		RoleID:         *server.DefaultRoleID,
	}
	if err := tx.Where("server_member_id = ? AND role_id = ?", member.ID, *server.DefaultRoleID).
		FirstOrCreate(&memberRole).Error; err != nil {
		return false, apperr.E("DB_ERROR", err)
	}
	return true, nil
}
