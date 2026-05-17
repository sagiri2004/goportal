package services

import (
	"context"

	"github.com/livekit/protocol/livekit"
	"github.com/sagiri2004/goportal/pkg/models"
)

type VoiceTokenResult struct {
	Token string
	URL   string
}

type LivestreamStateResult struct {
	ChannelID     string                                   `json:"channel_id"`
	Participants  []models.VoiceChannelParticipantSnapshot `json:"participants"`
	ViewerCount   int                                      `json:"viewer_count"`
	StreamerCount int                                      `json:"streamer_count"`
}

type VoiceService interface {
	GenerateVoiceToken(ctx context.Context, actorID, channelID string) (*VoiceTokenResult, error)
	GenerateLivestreamToken(ctx context.Context, actorID, channelID, mode string) (*VoiceTokenResult, error)
	GetLivestreamState(ctx context.Context, actorID, channelID string) (*LivestreamStateResult, error)
	ListChannelParticipants(ctx context.Context, actorID, channelID string) ([]models.VoiceChannelParticipantSnapshot, error)
	StartChannelRecording(ctx context.Context, actorID, channelID string) (*models.Recording, error)
	StopChannelRecording(ctx context.Context, actorID, channelID string) (*models.Recording, error)
	ListChannelRecordings(ctx context.Context, actorID, channelID string, limit, offset int) ([]models.Recording, error)
	StartChannelRTMPStream(ctx context.Context, actorID, channelID, rtmpURL string) (*models.Recording, error)
	StopChannelRTMPStream(ctx context.Context, actorID, channelID string) (*models.Recording, error)
	HandleWebhookEvent(ctx context.Context, evt *livekit.WebhookEvent) error
}
