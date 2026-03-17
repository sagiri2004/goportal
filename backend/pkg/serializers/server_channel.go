package serializers

import "github.com/sagiri2004/goportal/pkg/models"

type CreateServerRequest struct {
	Name string `json:"name" binding:"required,min=2,max=255"`
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

type ServerResponse struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	OwnerID string `json:"owner_id"`
}

func NewServerResponse(server *models.Server) ServerResponse {
	return ServerResponse{
		ID:      server.ID,
		Name:    server.Name,
		OwnerID: server.OwnerID,
	}
}

type ChannelResponse struct {
	ID       string  `json:"id"`
	ServerID string  `json:"server_id"`
	ParentID *string `json:"parent_id,omitempty"`
	Type     string  `json:"type"`
	Name     string  `json:"name"`
	Position int     `json:"position"`
}

func NewChannelResponse(channel *models.Channel) ChannelResponse {
	return ChannelResponse{
		ID:       channel.ID,
		ServerID: channel.ServerID,
		ParentID: channel.ParentID,
		Type:     channel.Type,
		Name:     channel.Name,
		Position: channel.Position,
	}
}
