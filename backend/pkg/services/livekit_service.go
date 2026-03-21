package services

import (
	"context"
	"net/http"

	"github.com/livekit/protocol/livekit"
)

type LiveKitService interface {
	GenerateAccessToken(channelID, userID, displayName, metadata string) (string, error)
	GetRoomInfo(ctx context.Context, channelID string) (*livekit.Room, []*livekit.ParticipantInfo, error)
	RemoveParticipant(ctx context.Context, channelID, userID string) error
	VerifyWebhook(r *http.Request) (*livekit.WebhookEvent, error)
}
