package impl

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	"github.com/livekit/protocol/webhook"
	lksdk "github.com/livekit/server-sdk-go"
	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/services"
)

type liveKitService struct {
	roomClient *lksdk.RoomServiceClient
	apiKey     string
	apiSecret  string
}

func NewLiveKitService() services.LiveKitService {
	cfg := global.Config.LiveKit
	return &liveKitService{
		roomClient: lksdk.NewRoomServiceClient(cfg.URL, cfg.APIKey, cfg.APISecret),
		apiKey:     cfg.APIKey,
		apiSecret:  cfg.APISecret,
	}
}

func (s *liveKitService) GenerateAccessToken(channelID, userID string) (string, error) {
	channelID = strings.TrimSpace(channelID)
	userID = strings.TrimSpace(userID)
	if channelID == "" || userID == "" {
		return "", apperr.E("MISSING_FIELDS", nil)
	}
	if s.apiKey == "" || s.apiSecret == "" {
		return "", apperr.E("LIVEKIT_NOT_CONFIGURED", nil)
	}

	token := auth.NewAccessToken(s.apiKey, s.apiSecret)
	token.SetIdentity(userID)
	token.SetValidFor(time.Hour)
	canPublish := true
	canSubscribe := true
	token.AddGrant(&auth.VideoGrant{
		Room:         channelID,
		RoomJoin:     true,
		CanPublish:   &canPublish,
		CanSubscribe: &canSubscribe,
	})
	jwt, err := token.ToJWT()
	if err != nil {
		return "", apperr.E("LIVEKIT_TOKEN_FAILED", err)
	}
	return jwt, nil
}

func (s *liveKitService) GetRoomInfo(ctx context.Context, channelID string) (*livekit.Room, []*livekit.ParticipantInfo, error) {
	channelID = strings.TrimSpace(channelID)
	if channelID == "" {
		return nil, nil, apperr.E("MISSING_FIELDS", nil)
	}

	rooms, err := s.roomClient.ListRooms(ctx, &livekit.ListRoomsRequest{Names: []string{channelID}})
	if err != nil {
		return nil, nil, apperr.E("LIVEKIT_REQUEST_FAILED", err)
	}
	if len(rooms.GetRooms()) == 0 {
		return nil, nil, apperr.E("LIVEKIT_ROOM_NOT_FOUND", nil)
	}

	participants, err := s.roomClient.ListParticipants(ctx, &livekit.ListParticipantsRequest{Room: channelID})
	if err != nil {
		return nil, nil, apperr.E("LIVEKIT_REQUEST_FAILED", err)
	}

	return rooms.GetRooms()[0], participants.GetParticipants(), nil
}

func (s *liveKitService) RemoveParticipant(ctx context.Context, channelID, userID string) error {
	channelID = strings.TrimSpace(channelID)
	userID = strings.TrimSpace(userID)
	if channelID == "" || userID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}

	if _, err := s.roomClient.RemoveParticipant(ctx, &livekit.RoomParticipantIdentity{Room: channelID, Identity: userID}); err != nil {
		return apperr.E("LIVEKIT_REQUEST_FAILED", err)
	}
	return nil
}

func (s *liveKitService) VerifyWebhook(r *http.Request) (*livekit.WebhookEvent, error) {
	if s.apiKey == "" || s.apiSecret == "" {
		return nil, apperr.E("LIVEKIT_NOT_CONFIGURED", nil)
	}
	event, err := webhook.ReceiveWebhookEvent(r, auth.NewSimpleKeyProvider(s.apiKey, s.apiSecret))
	if err != nil {
		return nil, apperr.E("LIVEKIT_WEBHOOK_INVALID", err)
	}
	return event, nil
}
