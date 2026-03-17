package impl

import (
	"context"
	"strings"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

type channelService struct {
	serverRepo  repositories.ServerRepository
	channelRepo repositories.ChannelRepository
}

func NewChannelService(serverRepo repositories.ServerRepository, channelRepo repositories.ChannelRepository) services.ChannelService {
	return &channelService{
		serverRepo:  serverRepo,
		channelRepo: channelRepo,
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
	if _, err := s.serverRepo.FindMember(ctx, serverID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
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
	if _, err := s.serverRepo.FindMember(ctx, channel.ServerID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
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
	if _, err := s.serverRepo.FindMember(ctx, channel.ServerID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
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
