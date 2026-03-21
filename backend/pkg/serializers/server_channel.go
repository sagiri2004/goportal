package serializers

import "github.com/sagiri2004/goportal/pkg/models"

type CreateServerRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=255"`
	IsPublic bool   `json:"is_public"`
}

type UpdateServerRequest struct {
	Name      *string `json:"name,omitempty"`
	IconURL   *string `json:"icon_url,omitempty"`
	BannerURL *string `json:"banner_url,omitempty"`
}

type CreateChannelRequest struct {
	Name     string  `json:"name" binding:"required,min=1,max=255"`
	Type     string  `json:"type" binding:"required"`
	ParentID *string `json:"parent_id,omitempty"`
	Position *int    `json:"position,omitempty"`
}

type UpdateChannelPositionRequest struct {
	Position int `json:"position" binding:"required"`
}

type UpdateChannelPrivacyRequest struct {
	IsPrivate bool `json:"is_private"`
}

type ChannelMemberRequest struct {
	UserID string `json:"user_id" binding:"required"`
}

type ChannelMemberResponse struct {
	ChannelID string `json:"channel_id"`
	UserID    string `json:"user_id"`
}

type UpsertChannelOverwriteRequest struct {
	SubjectType string `json:"subject_type" binding:"required"`
	SubjectID   string `json:"subject_id" binding:"required"`
	AllowBits   int64  `json:"allow_bits"`
	DenyBits    int64  `json:"deny_bits"`
}

type ChannelOverwriteResponse struct {
	ID          string `json:"id"`
	ChannelID   string `json:"channel_id"`
	SubjectType string `json:"subject_type"`
	SubjectID   string `json:"subject_id"`
	AllowBits   int64  `json:"allow_bits"`
	DenyBits    int64  `json:"deny_bits"`
}

type ServerResponse struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	OwnerID       string  `json:"owner_id"`
	IsPublic      bool    `json:"is_public"`
	DefaultRoleID *string `json:"default_role_id,omitempty"`
	IconURL       *string `json:"icon_url"`
	BannerURL     *string `json:"banner_url"`
}

func NewServerResponse(server *models.Server) ServerResponse {
	return ServerResponse{
		ID:            server.ID,
		Name:          server.Name,
		OwnerID:       server.OwnerID,
		IsPublic:      server.IsPublic,
		DefaultRoleID: server.DefaultRoleID,
		IconURL:       server.IconURL,
		BannerURL:     server.BannerURL,
	}
}

type ChannelResponse struct {
	ID          string  `json:"id"`
	ServerID    string  `json:"server_id"`
	ParentID    *string `json:"parent_id,omitempty"`
	Type        string  `json:"type"`
	Name        string  `json:"name"`
	Position    int     `json:"position"`
	IsPrivate   bool    `json:"is_private"`
	UnreadCount int64   `json:"unread_count"`
}

func NewChannelResponse(channel *models.Channel) ChannelResponse {
	return ChannelResponse{
		ID:          channel.ID,
		ServerID:    channel.ServerID,
		ParentID:    channel.ParentID,
		Type:        channel.Type,
		Name:        channel.Name,
		Position:    channel.Position,
		IsPrivate:   channel.IsPrivate,
		UnreadCount: 0,
	}
}

type MarkChannelReadRequest struct{}

type ChannelNotificationSettingRequest struct {
	Level      string  `json:"level" binding:"required"`
	MutedUntil *string `json:"muted_until"`
}

type ChannelNotificationSettingResponse struct {
	UserID     string  `json:"user_id"`
	ChannelID  string  `json:"channel_id"`
	Level      string  `json:"level"`
	MutedUntil *string `json:"muted_until,omitempty"`
}

func NewChannelMemberResponse(member *models.ChannelMember) ChannelMemberResponse {
	return ChannelMemberResponse{
		ChannelID: member.ChannelID,
		UserID:    member.UserID,
	}
}

func NewChannelOverwriteResponse(ow *models.ChannelPermissionOverwrite) ChannelOverwriteResponse {
	return ChannelOverwriteResponse{
		ID:          ow.ID,
		ChannelID:   ow.ChannelID,
		SubjectType: ow.SubjectType,
		SubjectID:   ow.SubjectID,
		AllowBits:   ow.AllowBits,
		DenyBits:    ow.DenyBits,
	}
}
