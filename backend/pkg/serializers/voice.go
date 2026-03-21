package serializers

import "github.com/sagiri2004/goportal/pkg/models"

type StartStreamRequest struct {
	RTMPURL string `json:"rtmp_url" binding:"required"`
}

type VoiceTokenResponse struct {
	Token string `json:"token"`
	URL   string `json:"url"`
}

type RecordingResponse struct {
	ID              string  `json:"id"`
	ChannelID       string  `json:"channel_id"`
	ServerID        string  `json:"server_id"`
	StartedBy       string  `json:"started_by"`
	EgressID        string  `json:"egress_id"`
	Type            string  `json:"type"`
	Status          string  `json:"status"`
	FileURL         *string `json:"file_url,omitempty"`
	RTMPURL         *string `json:"rtmp_url,omitempty"`
	DurationSeconds *int64  `json:"duration_seconds,omitempty"`
	StartedAt       int64   `json:"started_at"`
	EndedAt         *int64  `json:"ended_at,omitempty"`
	CreatedAt       int64   `json:"created_at"`
}

func NewVoiceTokenResponse(token, url string) VoiceTokenResponse {
	return VoiceTokenResponse{Token: token, URL: url}
}

func NewRecordingResponse(r *models.Recording) RecordingResponse {
	return RecordingResponse{
		ID:              r.ID,
		ChannelID:       r.ChannelID,
		ServerID:        r.ServerID,
		StartedBy:       r.StartedBy,
		EgressID:        r.EgressID,
		Type:            r.Type,
		Status:          r.Status,
		FileURL:         r.FileURL,
		RTMPURL:         r.RTMPURL,
		DurationSeconds: r.DurationSeconds,
		StartedAt:       r.StartedAt,
		EndedAt:         r.EndedAt,
		CreatedAt:       r.CreatedAt,
	}
}
