package impl

import (
	"context"
	"strings"
	"time"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

type channelService struct {
	serverRepo  repositories.ServerRepository
	channelRepo repositories.ChannelRepository
	messageRepo repositories.MessageRepository
}

func NewChannelService(
	serverRepo repositories.ServerRepository,
	channelRepo repositories.ChannelRepository,
	messageRepo repositories.MessageRepository,
) services.ChannelService {
	return &channelService{
		serverRepo:  serverRepo,
		channelRepo: channelRepo,
		messageRepo: messageRepo,
	}
}

func (s *channelService) CreateChannel(ctx context.Context, actorID, serverID, name, channelType string, parentID *string, position *int) (*models.Channel, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	name = strings.TrimSpace(name)
	channelType = strings.ToUpper(strings.TrimSpace(channelType))
	if actorID == "" || serverID == "" || name == "" || channelType == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if !isValidChannelType(channelType) {
		return nil, apperr.E("CHANNEL_TYPE_INVALID", nil)
	}

	if _, err := s.serverRepo.FindByID(ctx, serverID); err != nil {
		return nil, err
	}
	canManage, err := s.serverRepo.HasPermission(ctx, serverID, actorID, models.PermissionManageChannels)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}

	var normalizedParentID *string
	if parentID != nil {
		trimmed := strings.TrimSpace(*parentID)
		if trimmed != "" {
			normalizedParentID = &trimmed
		}
	}

	if channelType == models.ChannelTypeCategory {
		normalizedParentID = nil
	}

	if normalizedParentID != nil {
		parentChannel, err := s.channelRepo.FindByID(ctx, *normalizedParentID)
		if err != nil {
			return nil, err
		}
		if parentChannel.ServerID != serverID || parentChannel.Type != models.ChannelTypeCategory {
			return nil, apperr.E("CHANNEL_PARENT_INVALID", nil)
		}
	}

	nextPosition := 0
	if position != nil {
		if *position < 0 {
			return nil, apperr.E("INVALID_POSITION", nil)
		}
		nextPosition = *position
	} else {
		maxPos, err := s.channelRepo.GetMaxPositionByParent(ctx, serverID, normalizedParentID)
		if err != nil {
			return nil, err
		}
		nextPosition = maxPos + 1
	}

	channel := &models.Channel{
		ServerID: serverID,
		ParentID: normalizedParentID,
		Type:     channelType,
		Name:     name,
		Position: nextPosition,
	}
	if err := s.channelRepo.Create(ctx, channel); err != nil {
		return nil, err
	}
	return channel, nil
}

func (s *channelService) ListByServer(ctx context.Context, actorID, serverID string) ([]models.Channel, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	if _, err := s.serverRepo.FindMember(ctx, serverID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}
	canView, err := s.serverRepo.HasPermission(ctx, serverID, actorID, models.PermissionViewChannel)
	if err != nil {
		return nil, err
	}
	if !canView {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}

	rows, err := s.channelRepo.ListByServerID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	filtered := make([]models.Channel, 0, len(rows))
	for _, ch := range rows {
		if !ch.IsPrivate {
			filtered = append(filtered, ch)
			continue
		}
		isMember, err := s.channelRepo.IsMember(ctx, ch.ID, actorID)
		if err != nil {
			return nil, err
		}
		if isMember {
			filtered = append(filtered, ch)
		}
	}
	return filtered, nil
}

func (s *channelService) GetChannel(ctx context.Context, actorID, channelID string) (*models.Channel, error) {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	if actorID == "" || channelID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	canView, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionViewChannel)
	if err != nil {
		return nil, err
	}
	if !canView {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	if channel.IsPrivate {
		isMember, err := s.channelRepo.IsMember(ctx, channel.ID, actorID)
		if err != nil {
			return nil, err
		}
		if !isMember {
			return nil, apperr.E("CHANNEL_ACCESS_DENIED", nil)
		}
	}
	return channel, nil
}

func (s *channelService) UpdatePosition(ctx context.Context, actorID, channelID string, position int) (*models.Channel, error) {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	if actorID == "" || channelID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if position < 0 {
		return nil, apperr.E("INVALID_POSITION", nil)
	}

	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	canManage, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionManageChannels)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}

	channel.Position = position
	if err := s.channelRepo.Update(ctx, channel); err != nil {
		return nil, err
	}
	return channel, nil
}

func isValidChannelType(channelType string) bool {
	switch channelType {
	case models.ChannelTypeText, models.ChannelTypeVoice, models.ChannelTypeCategory:
		return true
	default:
		return false
	}
}

func (s *channelService) SetPrivacy(ctx context.Context, actorID, channelID string, isPrivate bool) (*models.Channel, error) {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	if actorID == "" || channelID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	canManage, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionManageChannels)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	return s.channelRepo.SetPrivacy(ctx, channelID, isPrivate)
}

func (s *channelService) AddMember(ctx context.Context, actorID, channelID, targetUserID string) error {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	targetUserID = strings.TrimSpace(targetUserID)
	if actorID == "" || channelID == "" || targetUserID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return err
	}
	canManage, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionManageChannels)
	if err != nil {
		return err
	}
	if !canManage {
		return apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	if _, err := s.serverRepo.FindMember(ctx, channel.ServerID, targetUserID); err != nil {
		return apperr.E("NOT_SERVER_MEMBER", err)
	}
	return s.channelRepo.AddMember(ctx, channelID, targetUserID)
}

func (s *channelService) RemoveMember(ctx context.Context, actorID, channelID, targetUserID string) error {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	targetUserID = strings.TrimSpace(targetUserID)
	if actorID == "" || channelID == "" || targetUserID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return err
	}
	canManage, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionManageChannels)
	if err != nil {
		return err
	}
	if !canManage {
		return apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	return s.channelRepo.RemoveMember(ctx, channelID, targetUserID)
}

func (s *channelService) ListMembers(ctx context.Context, actorID, channelID string) ([]models.ChannelMember, error) {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	if actorID == "" || channelID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	canView, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionViewChannel)
	if err != nil {
		return nil, err
	}
	if !canView {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	return s.channelRepo.ListMembers(ctx, channelID)
}

func (s *channelService) UpsertOverwrite(ctx context.Context, actorID, channelID, subjectType, subjectID string, allowBits, denyBits int64) error {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	subjectType = strings.TrimSpace(subjectType)
	subjectID = strings.TrimSpace(subjectID)
	if actorID == "" || channelID == "" || subjectType == "" || subjectID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	subjectType = strings.ToUpper(subjectType)
	if subjectType != models.ChannelOverwriteSubjectRole && subjectType != models.ChannelOverwriteSubjectUser {
		return apperr.E("INVALID_ACTION", nil)
	}
	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return err
	}
	canManage, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionManageChannels)
	if err != nil {
		return err
	}
	if !canManage {
		return apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	return s.channelRepo.UpsertOverwrite(ctx, &models.ChannelPermissionOverwrite{
		ChannelID:   channelID,
		SubjectType: subjectType,
		SubjectID:   subjectID,
		AllowBits:   allowBits,
		DenyBits:    denyBits,
	})
}

func (s *channelService) DeleteOverwrite(ctx context.Context, actorID, channelID, subjectType, subjectID string) error {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	subjectType = strings.TrimSpace(subjectType)
	subjectID = strings.TrimSpace(subjectID)
	if actorID == "" || channelID == "" || subjectType == "" || subjectID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	subjectType = strings.ToUpper(subjectType)
	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return err
	}
	canManage, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionManageChannels)
	if err != nil {
		return err
	}
	if !canManage {
		return apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	return s.channelRepo.DeleteOverwrite(ctx, channelID, subjectType, subjectID)
}

func (s *channelService) ListOverwrites(ctx context.Context, actorID, channelID string) ([]models.ChannelPermissionOverwrite, error) {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	if actorID == "" || channelID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	canView, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionViewChannel)
	if err != nil {
		return nil, err
	}
	if !canView {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	return s.channelRepo.ListOverwrites(ctx, channelID)
}

func (s *channelService) MarkRead(ctx context.Context, actorID, channelID string) error {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	if actorID == "" || channelID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return err
	}
	if _, err := s.serverRepo.FindMember(ctx, channel.ServerID, actorID); err != nil {
		return apperr.E("NOT_SERVER_MEMBER", err)
	}
	canRead, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionReadMessages)
	if err != nil {
		return err
	}
	if !canRead {
		return apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	if channel.IsPrivate {
		isMember, err := s.channelRepo.IsMember(ctx, channelID, actorID)
		if err != nil {
			return err
		}
		if !isMember {
			return apperr.E("CHANNEL_ACCESS_DENIED", nil)
		}
	}
	return s.messageRepo.MarkChannelRead(ctx, actorID, channelID, time.Now().Unix())
}

func (s *channelService) GetNotificationSetting(ctx context.Context, actorID, channelID string) (*models.ChannelNotificationSetting, error) {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	if actorID == "" || channelID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	if _, err := s.serverRepo.FindMember(ctx, channel.ServerID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}
	return s.channelRepo.GetNotificationSetting(ctx, actorID, channelID)
}

func (s *channelService) UpdateNotificationSetting(
	ctx context.Context,
	actorID, channelID, level string,
	mutedUntil *int64,
) (*models.ChannelNotificationSetting, error) {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	level = strings.TrimSpace(strings.ToLower(level))
	if actorID == "" || channelID == "" || level == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	switch level {
	case models.NotificationLevelAll, models.NotificationLevelMentionsOnly, models.NotificationLevelNone:
	default:
		return nil, apperr.E("INVALID_NOTIFICATION_LEVEL", nil)
	}

	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	if _, err := s.serverRepo.FindMember(ctx, channel.ServerID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}

	setting := &models.ChannelNotificationSetting{
		UserID:     actorID,
		ChannelID:  channelID,
		Level:      level,
		MutedUntil: mutedUntil,
	}
	if err := s.channelRepo.UpsertNotificationSetting(ctx, setting); err != nil {
		return nil, err
	}
	return setting, nil
}
