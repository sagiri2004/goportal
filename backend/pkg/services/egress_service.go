package services

import (
	"context"

	"github.com/livekit/protocol/livekit"
)

type EgressService interface {
	StartRoomCompositeRecording(ctx context.Context, channelID string) (*livekit.EgressInfo, error)
	StartTrackRecording(ctx context.Context, channelID, trackID string) (*livekit.EgressInfo, error)
	StartRTMPStream(ctx context.Context, channelID, rtmpURL string) (*livekit.EgressInfo, error)
	StopEgress(ctx context.Context, egressID string) (*livekit.EgressInfo, error)
	GetEgressStatus(ctx context.Context, egressID string) (*livekit.EgressInfo, error)
}
