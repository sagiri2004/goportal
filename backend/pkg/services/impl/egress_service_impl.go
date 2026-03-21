package impl

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go"
	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/services"
)

type egressService struct {
	client *lksdk.EgressClient
}

func NewEgressService() services.EgressService {
	cfg := global.Config.LiveKit
	return &egressService{client: lksdk.NewEgressClient(cfg.URL, cfg.APIKey, cfg.APISecret)}
}

func (s *egressService) StartRoomCompositeRecording(ctx context.Context, channelID string) (*livekit.EgressInfo, error) {
	channelID = strings.TrimSpace(channelID)
	if channelID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	out := &livekit.EncodedFileOutput{
		Filepath: fmt.Sprintf("%s/%d-room.mp4", channelID, time.Now().Unix()),
	}
	info, err := s.client.StartRoomCompositeEgress(ctx, &livekit.RoomCompositeEgressRequest{
		RoomName:    channelID,
		Layout:      "grid",
		FileOutputs: []*livekit.EncodedFileOutput{out},
	})
	if err != nil {
		return nil, apperr.E("LIVEKIT_EGRESS_FAILED", err)
	}
	return info, nil
}

func (s *egressService) StartTrackRecording(ctx context.Context, channelID, trackID string) (*livekit.EgressInfo, error) {
	channelID = strings.TrimSpace(channelID)
	trackID = strings.TrimSpace(trackID)
	if channelID == "" || trackID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	info, err := s.client.StartTrackEgress(ctx, &livekit.TrackEgressRequest{
		RoomName: channelID,
		TrackId:  trackID,
		Output: &livekit.TrackEgressRequest_File{File: &livekit.DirectFileOutput{
			Filepath: fmt.Sprintf("%s/%d-track-%s", channelID, time.Now().Unix(), trackID),
		}},
	})
	if err != nil {
		return nil, apperr.E("LIVEKIT_EGRESS_FAILED", err)
	}
	return info, nil
}

func (s *egressService) StartRTMPStream(ctx context.Context, channelID, rtmpURL string) (*livekit.EgressInfo, error) {
	channelID = strings.TrimSpace(channelID)
	rtmpURL = strings.TrimSpace(rtmpURL)
	if channelID == "" || rtmpURL == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	info, err := s.client.StartRoomCompositeEgress(ctx, &livekit.RoomCompositeEgressRequest{
		RoomName: channelID,
		Layout:   "grid",
		StreamOutputs: []*livekit.StreamOutput{{
			Protocol: livekit.StreamProtocol_RTMP,
			Urls:     []string{rtmpURL},
		}},
	})
	if err != nil {
		return nil, apperr.E("LIVEKIT_EGRESS_FAILED", err)
	}
	return info, nil
}

func (s *egressService) StopEgress(ctx context.Context, egressID string) (*livekit.EgressInfo, error) {
	egressID = strings.TrimSpace(egressID)
	if egressID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	info, err := s.client.StopEgress(ctx, &livekit.StopEgressRequest{EgressId: egressID})
	if err != nil {
		return nil, apperr.E("LIVEKIT_EGRESS_FAILED", err)
	}
	return info, nil
}

func (s *egressService) GetEgressStatus(ctx context.Context, egressID string) (*livekit.EgressInfo, error) {
	egressID = strings.TrimSpace(egressID)
	if egressID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	list, err := s.client.ListEgress(ctx, &livekit.ListEgressRequest{EgressId: egressID})
	if err != nil {
		return nil, apperr.E("LIVEKIT_EGRESS_FAILED", err)
	}
	if len(list.GetItems()) == 0 {
		return nil, apperr.E("RECORDING_NOT_FOUND", nil)
	}
	return list.GetItems()[0], nil
}
