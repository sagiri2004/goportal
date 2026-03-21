package impl

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"regexp"
	"strings"
	"time"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

type serverService struct {
	userRepo    repositories.UserRepository
	serverRepo  repositories.ServerRepository
	messageRepo repositories.MessageRepository
	storage     services.StorageService
}

var roleColorPattern = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

func NewServerService(
	userRepo repositories.UserRepository,
	serverRepo repositories.ServerRepository,
	messageRepo repositories.MessageRepository,
	storage services.StorageService,
) services.ServerService {
	return &serverService{
		userRepo:    userRepo,
		serverRepo:  serverRepo,
		messageRepo: messageRepo,
		storage:     storage,
	}
}

func (s *serverService) CreateServer(ctx context.Context, ownerID, name string, isPublic bool) (*models.Server, error) {
	ownerID = strings.TrimSpace(ownerID)
	name = strings.TrimSpace(name)
	if ownerID == "" || name == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	if _, err := s.userRepo.FindByID(ctx, ownerID); err != nil {
		return nil, err
	}

	server := &models.Server{
		Name:     name,
		OwnerID:  ownerID,
		IsPublic: isPublic,
	}
	ownerMember := &models.ServerMember{
		UserID: ownerID,
	}

	if err := s.serverRepo.CreateWithOwnerMember(ctx, server, ownerMember); err != nil {
		return nil, err
	}
	return server, nil
}

func (s *serverService) UpdateServer(ctx context.Context, actorID, serverID string, name, iconURL, bannerURL *string) (*models.Server, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	server, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}
	if server.OwnerID != actorID {
		return nil, apperr.E("SERVER_OWNER_REQUIRED", nil)
	}

	var normalizedName *string
	if name != nil {
		trimmed := strings.TrimSpace(*name)
		if trimmed == "" {
			return nil, apperr.E("MISSING_FIELDS", nil)
		}
		normalizedName = &trimmed
	}

	normalizedIconURL := normalizeOptionalMediaURL(iconURL)
	normalizedBannerURL := normalizeOptionalMediaURL(bannerURL)

	updated, err := s.serverRepo.UpdateServer(ctx, serverID, normalizedName, normalizedIconURL, normalizedBannerURL)
	if err != nil {
		return nil, err
	}

	if shouldDeleteMedia(server.IconURL, updated.IconURL) {
		_ = s.storage.DeleteByURL(ctx, *server.IconURL)
	}
	if shouldDeleteMedia(server.BannerURL, updated.BannerURL) {
		_ = s.storage.DeleteByURL(ctx, *server.BannerURL)
	}

	return updated, nil
}

func (s *serverService) ListUserServers(ctx context.Context, userID string) ([]models.Server, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	return s.serverRepo.ListByUserID(ctx, userID)
}

func (s *serverService) GetServerByID(ctx context.Context, actorID, serverID string) (*models.Server, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	server, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	if _, err := s.serverRepo.FindMember(ctx, serverID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}

	return server, nil
}

func (s *serverService) ListMembers(ctx context.Context, actorID, serverID string) ([]models.User, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	if _, err := s.serverRepo.FindByID(ctx, serverID); err != nil {
		return nil, err
	}
	if _, err := s.serverRepo.FindMember(ctx, serverID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}

	return s.serverRepo.ListMembers(ctx, serverID)
}

func (s *serverService) ListMembersWithRoles(ctx context.Context, actorID, serverID string) ([]services.ServerMemberWithRoles, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if _, err := s.serverRepo.FindByID(ctx, serverID); err != nil {
		return nil, err
	}
	if _, err := s.serverRepo.FindMember(ctx, serverID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}
	rows, err := s.serverRepo.ListMembersWithRoles(ctx, serverID)
	if err != nil {
		return nil, err
	}
	out := make([]services.ServerMemberWithRoles, 0, len(rows))
	for _, row := range rows {
		out = append(out, services.ServerMemberWithRoles{
			User:  row.User,
			Roles: row.Roles,
		})
	}
	return out, nil
}

func (s *serverService) DeleteServer(ctx context.Context, actorID, serverID string) error {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}

	server, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}
	if server.OwnerID != actorID {
		return apperr.E("SERVER_OWNER_REQUIRED", nil)
	}

	roles, err := s.serverRepo.ListRolesByServerID(ctx, serverID)
	if err != nil {
		return err
	}
	attachments, err := s.messageRepo.ListAttachmentsByServerID(ctx, serverID)
	if err != nil {
		return err
	}

	attachmentIDs := make([]string, 0, len(attachments))
	for i := range attachments {
		attachmentIDs = append(attachmentIDs, attachments[i].ID)
	}

	if err := s.serverRepo.DeleteByID(ctx, serverID); err != nil {
		return err
	}

	if len(attachmentIDs) > 0 {
		_ = s.messageRepo.SoftDeleteAttachmentsByIDs(ctx, attachmentIDs)
	}

	if server.IconURL != nil && *server.IconURL != "" {
		_ = s.storage.DeleteByURL(ctx, *server.IconURL)
	}
	if server.BannerURL != nil && *server.BannerURL != "" {
		_ = s.storage.DeleteByURL(ctx, *server.BannerURL)
	}
	for i := range roles {
		if roles[i].IconURL != nil && *roles[i].IconURL != "" {
			_ = s.storage.DeleteByURL(ctx, *roles[i].IconURL)
		}
	}
	for i := range attachments {
		_ = s.storage.DeleteByURL(ctx, attachments[i].FileURL)
	}

	return nil
}

func (s *serverService) KickMember(ctx context.Context, actorID, serverID, memberUserID string) error {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	memberUserID = strings.TrimSpace(memberUserID)
	if actorID == "" || serverID == "" || memberUserID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}

	server, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}
	if server.OwnerID != actorID {
		return apperr.E("SERVER_OWNER_REQUIRED", nil)
	}
	if server.OwnerID == memberUserID {
		return apperr.E("CANNOT_KICK_OWNER", nil)
	}

	if _, err := s.serverRepo.FindMember(ctx, serverID, memberUserID); err != nil {
		return err
	}
	return s.serverRepo.RemoveMember(ctx, serverID, memberUserID)
}

func (s *serverService) LeaveServer(ctx context.Context, actorID, serverID string) error {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}

	server, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}
	if server.OwnerID == actorID {
		return apperr.E("CANNOT_LEAVE_OWNED_SERVER", nil)
	}

	if _, err := s.serverRepo.FindMember(ctx, serverID, actorID); err != nil {
		return err
	}
	return s.serverRepo.RemoveMember(ctx, serverID, actorID)
}

func (s *serverService) CreateRole(ctx context.Context, actorID, serverID, name string, iconURL *string, color string, permissionNames []string) (*models.Role, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	name = strings.TrimSpace(name)
	color = strings.TrimSpace(color)
	if actorID == "" || serverID == "" || name == "" || color == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if !roleColorPattern.MatchString(color) {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if _, err := s.serverRepo.FindByID(ctx, serverID); err != nil {
		return nil, err
	}
	ok, err := s.serverRepo.HasPermission(ctx, serverID, actorID, models.PermissionManageRoles)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	actorMaxPos, err := s.serverRepo.GetMemberHighestRolePosition(ctx, serverID, actorID)
	if err != nil {
		return nil, err
	}
	if actorMaxPos <= 0 {
		return nil, apperr.E("ROLE_ASSIGN_FORBIDDEN", nil)
	}

	permissionValues, err := normalizePermissionNames(permissionNames)
	if err != nil {
		return nil, err
	}

	actorPerms, err := s.serverRepo.GetMemberPermissions(ctx, serverID, actorID)
	if err != nil {
		return nil, err
	}
	if (actorPerms & models.PermissionAdministrator) != models.PermissionAdministrator {
		if hasPermissionEscalation(sumPermissions(permissionValues), actorPerms) {
			return nil, apperr.E("ROLE_ASSIGN_FORBIDDEN", nil)
		}
	}
	role := &models.Role{
		ServerID:    serverID,
		Name:        name,
		IconURL:     normalizeOptionalMediaURL(iconURL),
		Color:       color,
		Position:    0,
		Permissions: sumPermissions(permissionValues),
	}
	maxPos, err := s.serverRepo.GetMaxRolePositionBelow(ctx, serverID, actorMaxPos)
	if err != nil {
		return nil, err
	}
	role.Position = maxPos + 1
	if role.Position >= actorMaxPos {
		role.Position = actorMaxPos - 1
	}

	if err := s.serverRepo.CreateRole(ctx, role, permissionValues); err != nil {
		return nil, err
	}
	return role, nil
}

func (s *serverService) UpdateRole(ctx context.Context, actorID, serverID, roleID string, name, iconURL, color *string, permissionNames []string) (*models.Role, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	roleID = strings.TrimSpace(roleID)
	if actorID == "" || roleID == "" || serverID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	role, err := s.serverRepo.FindRoleByID(ctx, roleID)
	if err != nil {
		return nil, err
	}
	if role.ServerID != serverID {
		return nil, apperr.E("ROLE_NOT_FOUND", nil)
	}
	ok, err := s.serverRepo.HasPermission(ctx, role.ServerID, actorID, models.PermissionManageRoles)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	actorMaxPos, err := s.serverRepo.GetMemberHighestRolePosition(ctx, role.ServerID, actorID)
	if err != nil {
		return nil, err
	}
	if actorMaxPos <= role.Position {
		return nil, apperr.E("ROLE_ASSIGN_FORBIDDEN", nil)
	}

	var normalizedName *string
	if name != nil {
		trimmed := strings.TrimSpace(*name)
		if trimmed == "" {
			return nil, apperr.E("MISSING_FIELDS", nil)
		}
		normalizedName = &trimmed
	}

	var normalizedColor *string
	if color != nil {
		trimmed := strings.TrimSpace(*color)
		if !roleColorPattern.MatchString(trimmed) {
			return nil, apperr.E("MISSING_FIELDS", nil)
		}
		normalizedColor = &trimmed
	}
	normalizedIconURL := normalizeOptionalMediaURL(iconURL)

	var permissionValues []int64
	if permissionNames != nil {
		permissionValues, err = normalizePermissionNames(permissionNames)
		if err != nil {
			return nil, err
		}
		actorPerms, err := s.serverRepo.GetMemberPermissions(ctx, role.ServerID, actorID)
		if err != nil {
			return nil, err
		}
		if (actorPerms & models.PermissionAdministrator) != models.PermissionAdministrator {
			if hasPermissionEscalation(sumPermissions(permissionValues), actorPerms) {
				return nil, apperr.E("ROLE_ASSIGN_FORBIDDEN", nil)
			}
		}
	}
	updated, err := s.serverRepo.UpdateRole(ctx, roleID, normalizedName, normalizedIconURL, normalizedColor, permissionValues)
	if err != nil {
		return nil, err
	}
	if shouldDeleteMedia(role.IconURL, updated.IconURL) {
		_ = s.storage.DeleteByURL(ctx, *role.IconURL)
	}
	return updated, nil
}

func (s *serverService) DeleteRole(ctx context.Context, actorID, serverID, roleID string) error {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	roleID = strings.TrimSpace(roleID)
	if actorID == "" || serverID == "" || roleID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}

	server, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	role, err := s.serverRepo.FindRoleByID(ctx, roleID)
	if err != nil {
		return err
	}
	if role.ServerID != serverID {
		return apperr.E("ROLE_NOT_FOUND", nil)
	}
	if server.DefaultRoleID != nil && *server.DefaultRoleID == roleID {
		return apperr.E("DEFAULT_ROLE_DELETE_FORBIDDEN", nil)
	}

	ok, err := s.serverRepo.HasPermission(ctx, serverID, actorID, models.PermissionManageRoles)
	if err != nil {
		return err
	}
	if !ok {
		return apperr.E("INSUFFICIENT_PERMISSION", nil)
	}

	actorMaxPos, err := s.serverRepo.GetMemberHighestRolePosition(ctx, serverID, actorID)
	if err != nil {
		return err
	}
	if actorMaxPos <= role.Position {
		return apperr.E("ROLE_ASSIGN_FORBIDDEN", nil)
	}

	if err := s.serverRepo.DeleteRole(ctx, roleID); err != nil {
		return err
	}
	if role.IconURL != nil && *role.IconURL != "" {
		_ = s.storage.DeleteByURL(ctx, *role.IconURL)
	}
	return nil
}

func (s *serverService) ListRoles(ctx context.Context, actorID, serverID string) ([]models.Role, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	if _, err := s.serverRepo.FindByID(ctx, serverID); err != nil {
		return nil, err
	}
	if _, err := s.serverRepo.FindMember(ctx, serverID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}

	return s.serverRepo.ListRolesByServerID(ctx, serverID)
}

func (s *serverService) CreateInvite(ctx context.Context, actorID, serverID string, input services.CreateInviteInput) (*models.ServerInvite, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if _, err := s.serverRepo.FindByID(ctx, serverID); err != nil {
		return nil, err
	}

	canCreate, err := s.serverRepo.HasPermission(ctx, serverID, actorID, models.PermissionCreateInvite)
	if err != nil {
		return nil, err
	}
	if !canCreate {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}

	code, err := generateInviteCode()
	if err != nil {
		return nil, apperr.E("INTERNAL_ERROR", err)
	}
	invite := &models.ServerInvite{
		ServerID:  serverID,
		InviterID: actorID,
		Code:      code,
		MaxUses:   input.MaxUses,
		ExpiresAt: input.ExpiresAt,
	}
	if err := s.serverRepo.CreateInvite(ctx, invite); err != nil {
		return nil, err
	}
	return invite, nil
}

func (s *serverService) GetInvite(ctx context.Context, code string) (*models.ServerInvite, *models.Server, int64, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return nil, nil, 0, apperr.E("MISSING_FIELDS", nil)
	}
	result, err := s.serverRepo.FindInviteWithServer(ctx, code)
	if err != nil {
		return nil, nil, 0, err
	}
	memberCount, err := s.serverRepo.CountActiveMembers(ctx, result.Server.ID)
	if err != nil {
		return nil, nil, 0, err
	}
	return &result.Invite, &result.Server, memberCount, nil
}

func (s *serverService) JoinByInvite(ctx context.Context, actorID, code string) (*models.Server, error) {
	actorID = strings.TrimSpace(actorID)
	code = strings.TrimSpace(code)
	if actorID == "" || code == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	return s.serverRepo.JoinServerByInvite(ctx, code, actorID, time.Now().Unix())
}

func (s *serverService) JoinPublicServer(ctx context.Context, actorID, serverID string) error {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	return s.serverRepo.JoinPublicServer(ctx, serverID, actorID)
}

func (s *serverService) CreateJoinRequest(ctx context.Context, actorID, serverID string, input services.CreateJoinRequestInput) (*models.ServerJoinRequest, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if _, err := s.serverRepo.FindByID(ctx, serverID); err != nil {
		return nil, err
	}
	if _, err := s.serverRepo.FindMember(ctx, serverID, actorID); err == nil {
		return nil, apperr.E("SERVER_MEMBER_EXISTS", nil)
	} else if ae, ok := apperr.From(err); ok && ae.Code != "SERVER_MEMBER_NOT_FOUND" {
		return nil, err
	}
	req := &models.ServerJoinRequest{
		ServerID:     serverID,
		UserID:       actorID,
		Status:       models.ServerMemberStatusPending,
		DecisionNote: strings.TrimSpace(input.Note),
	}
	if err := s.serverRepo.CreateJoinRequest(ctx, req); err != nil {
		return nil, err
	}
	return req, nil
}

func (s *serverService) ListJoinRequests(ctx context.Context, actorID, serverID, status string) ([]models.ServerJoinRequest, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	status = strings.TrimSpace(status)
	if actorID == "" || serverID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	canReview, err := s.serverRepo.HasPermission(ctx, serverID, actorID, models.PermissionApproveMembers)
	if err != nil {
		return nil, err
	}
	if !canReview {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	return s.serverRepo.ListJoinRequests(ctx, serverID, status)
}

func (s *serverService) ReviewJoinRequest(ctx context.Context, actorID, serverID string, input services.ReviewJoinRequestInput) (*models.ServerJoinRequest, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	input.RequestID = strings.TrimSpace(input.RequestID)
	if actorID == "" || serverID == "" || input.RequestID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	canReview, err := s.serverRepo.HasPermission(ctx, serverID, actorID, models.PermissionApproveMembers)
	if err != nil {
		return nil, err
	}
	if !canReview {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	req, err := s.serverRepo.FindJoinRequestByID(ctx, input.RequestID)
	if err != nil {
		return nil, err
	}
	if req.ServerID != serverID {
		return nil, apperr.E("JOIN_REQUEST_NOT_FOUND", nil)
	}
	if req.Status != models.ServerMemberStatusPending {
		return nil, apperr.E("JOIN_REQUEST_ALREADY_REVIEWED", nil)
	}
	note := strings.TrimSpace(input.Note)
	now := time.Now().Unix()
	req.ReviewedBy = &actorID
	req.ReviewedAt = &now
	req.DecisionNote = note
	if input.Approve {
		req.Status = models.ServerMemberStatusActive
		if err := s.serverRepo.AddMemberWithDefaultRole(ctx, serverID, req.UserID); err != nil {
			return nil, err
		}
	} else {
		req.Status = models.ServerMemberStatusRejected
	}
	if err := s.serverRepo.UpdateJoinRequest(ctx, req); err != nil {
		return nil, err
	}
	return req, nil
}

func (s *serverService) AddMember(ctx context.Context, actorID, serverID, targetUserID string) error {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	targetUserID = strings.TrimSpace(targetUserID)
	if actorID == "" || serverID == "" || targetUserID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	ok, err := s.serverRepo.HasPermission(ctx, serverID, actorID, models.PermissionManageRoles)
	if err != nil {
		return err
	}
	if !ok {
		return apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	return s.serverRepo.AddMemberWithDefaultRole(ctx, serverID, targetUserID)
}

func (s *serverService) UpdateMemberRoles(ctx context.Context, actorID, serverID, targetUserID string, roleIDs []string) error {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	targetUserID = strings.TrimSpace(targetUserID)
	if actorID == "" || serverID == "" || targetUserID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	ok, err := s.serverRepo.HasPermission(ctx, serverID, actorID, models.PermissionManageServer)
	if err != nil {
		return err
	}
	if !ok {
		return apperr.E("ROLE_ASSIGN_FORBIDDEN", nil)
	}
	actorMaxPos, err := s.serverRepo.GetMemberHighestRolePosition(ctx, serverID, actorID)
	if err != nil {
		return err
	}
	if actorMaxPos < 0 {
		return apperr.E("ROLE_ASSIGN_FORBIDDEN", nil)
	}
	targetMaxPos, err := s.serverRepo.GetMemberHighestRolePosition(ctx, serverID, targetUserID)
	if err != nil {
		return err
	}
	if targetMaxPos >= actorMaxPos {
		return apperr.E("ROLE_ASSIGN_FORBIDDEN", nil)
	}
	if len(roleIDs) > 0 {
		roles, err := s.serverRepo.ListRolesByServerID(ctx, serverID)
		if err != nil {
			return err
		}
		roleByID := make(map[string]models.Role, len(roles))
		for _, role := range roles {
			roleByID[role.ID] = role
		}
		for _, roleID := range roleIDs {
			role, ok := roleByID[roleID]
			if !ok {
				return apperr.E("ROLE_NOT_FOUND", nil)
			}
			if role.Position >= actorMaxPos {
				return apperr.E("ROLE_ASSIGN_FORBIDDEN", nil)
			}
		}
	}
	return s.serverRepo.UpdateMemberRoles(ctx, serverID, targetUserID, roleIDs)
}

func sumPermissions(values []int64) int64 {
	var total int64
	for _, value := range values {
		total += value
	}
	return total
}

func normalizePermissionValues(values []int64) []int64 {
	seen := make(map[int64]struct{}, len(values))
	result := make([]int64, 0, len(values))
	for _, value := range values {
		if value <= 0 {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func normalizePermissionNames(names []string) ([]int64, error) {
	seen := make(map[int64]struct{}, len(names))
	values := make([]int64, 0, len(names))
	for _, raw := range names {
		name := strings.ToUpper(strings.TrimSpace(raw))
		if name == "" {
			continue
		}
		value, ok := models.PermissionValueByName(name)
		if !ok {
			return nil, apperr.E("PERMISSION_INVALID", nil)
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		values = append(values, value)
	}
	return values, nil
}

func generateInviteCode() (string, error) {
	buf := make([]byte, 6)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return strings.ToUpper(hex.EncodeToString(buf)), nil
}

func hasPermissionEscalation(requested, actorPerms int64) bool {
	return requested&^actorPerms != 0
}

func normalizeOptionalMediaURL(input *string) *string {
	if input == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*input)
	return &trimmed
}

func shouldDeleteMedia(previous, current *string) bool {
	if previous == nil || *previous == "" {
		return false
	}
	if current == nil {
		return true
	}
	return *previous != *current
}
