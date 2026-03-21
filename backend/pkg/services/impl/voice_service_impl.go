package impl

import (
	"context"
	"strings"
	"time"

	"github.com/livekit/protocol/livekit"
	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

type voiceService struct {
	serverRepo    repositories.ServerRepository
	channelRepo   repositories.ChannelRepository
	recordingRepo repositories.RecordingRepository
	liveKitSvc    services.LiveKitService
	egressSvc     services.EgressService
}

func NewVoiceService(
	serverRepo repositories.ServerRepository,
	channelRepo repositories.ChannelRepository,
	recordingRepo repositories.RecordingRepository,
	liveKitSvc services.LiveKitService,
	egressSvc services.EgressService,
) services.VoiceService {
	return &voiceService{
		serverRepo:    serverRepo,
		channelRepo:   channelRepo,
		recordingRepo: recordingRepo,
		liveKitSvc:    liveKitSvc,
		egressSvc:     egressSvc,
	}
}

func (s *voiceService) GenerateVoiceToken(ctx context.Context, actorID, channelID string) (*services.VoiceTokenResult, error) {
	channel, err := s.ensureChannelAccess(ctx, actorID, channelID, false)
	if err != nil {
		return nil, err
	}
	if channel.Type != models.ChannelTypeVoice {
		return nil, apperr.E("VOICE_CHANNEL_REQUIRED", nil)
	}

	token, err := s.liveKitSvc.GenerateAccessToken(channel.ID, actorID)
	if err != nil {
		return nil, err
	}

	return &services.VoiceTokenResult{
		Token: token,
		URL:   global.Config.LiveKit.URL,
	}, nil
}

func (s *voiceService) StartChannelRecording(ctx context.Context, actorID, channelID string) (*models.Recording, error) {
	channel, err := s.ensureChannelAccess(ctx, actorID, channelID, true)
	if err != nil {
		return nil, err
	}
	if channel.Type != models.ChannelTypeVoice {
		return nil, apperr.E("VOICE_CHANNEL_REQUIRED", nil)
	}

	if existing, err := s.recordingRepo.FindActiveByChannelAndType(ctx, channel.ID, models.RecordingTypeRoomComposite); err == nil && existing != nil {
		return nil, apperr.E("RECORDING_ALREADY_ACTIVE", nil)
	} else if !isAppErrCode(err, "RECORDING_NOT_FOUND") {
		return nil, err
	}

	info, err := s.egressSvc.StartRoomCompositeRecording(ctx, channel.ID)
	if err != nil {
		return nil, err
	}

	now := time.Now().Unix()
	recording := &models.Recording{
		ChannelID: channel.ID,
		ServerID:  channel.ServerID,
		StartedBy: actorID,
		EgressID:  info.GetEgressId(),
		Type:      models.RecordingTypeRoomComposite,
		Status:    models.RecordingStatusActive,
		StartedAt: now,
	}
	if err := s.recordingRepo.Create(ctx, recording); err != nil {
		return nil, err
	}
	return recording, nil
}

func (s *voiceService) StopChannelRecording(ctx context.Context, actorID, channelID string) (*models.Recording, error) {
	channel, err := s.ensureChannelAccess(ctx, actorID, channelID, true)
	if err != nil {
		return nil, err
	}
	recording, err := s.recordingRepo.FindActiveByChannelAndType(ctx, channel.ID, models.RecordingTypeRoomComposite)
	if err != nil {
		return nil, err
	}

	info, err := s.egressSvc.StopEgress(ctx, recording.EgressID)
	if err != nil {
		return nil, err
	}

	applyEgressResult(recording, info)
	if err := s.recordingRepo.Update(ctx, recording); err != nil {
		return nil, err
	}
	return recording, nil
}

func (s *voiceService) ListChannelRecordings(ctx context.Context, actorID, channelID string, limit, offset int) ([]models.Recording, error) {
	channel, err := s.ensureChannelAccess(ctx, actorID, channelID, false)
	if err != nil {
		return nil, err
	}
	if channel.Type != models.ChannelTypeVoice {
		return nil, apperr.E("VOICE_CHANNEL_REQUIRED", nil)
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.recordingRepo.ListByChannel(ctx, channel.ID, limit, offset)
}

func (s *voiceService) StartChannelRTMPStream(ctx context.Context, actorID, channelID, rtmpURL string) (*models.Recording, error) {
	channel, err := s.ensureChannelAccess(ctx, actorID, channelID, true)
	if err != nil {
		return nil, err
	}
	if channel.Type != models.ChannelTypeVoice {
		return nil, apperr.E("VOICE_CHANNEL_REQUIRED", nil)
	}
	rtmpURL = strings.TrimSpace(rtmpURL)
	if !strings.HasPrefix(rtmpURL, "rtmp://") && !strings.HasPrefix(rtmpURL, "rtmps://") {
		return nil, apperr.E("INVALID_RTMP_URL", nil)
	}

	if existing, err := s.recordingRepo.FindActiveByChannelAndType(ctx, channel.ID, models.RecordingTypeRTMP); err == nil && existing != nil {
		return nil, apperr.E("RECORDING_ALREADY_ACTIVE", nil)
	} else if !isAppErrCode(err, "RECORDING_NOT_FOUND") {
		return nil, err
	}

	info, err := s.egressSvc.StartRTMPStream(ctx, channel.ID, rtmpURL)
	if err != nil {
		return nil, err
	}

	now := time.Now().Unix()
	recording := &models.Recording{
		ChannelID: channel.ID,
		ServerID:  channel.ServerID,
		StartedBy: actorID,
		EgressID:  info.GetEgressId(),
		Type:      models.RecordingTypeRTMP,
		Status:    models.RecordingStatusActive,
		RTMPURL:   &rtmpURL,
		StartedAt: now,
	}
	if err := s.recordingRepo.Create(ctx, recording); err != nil {
		return nil, err
	}
	return recording, nil
}

func (s *voiceService) StopChannelRTMPStream(ctx context.Context, actorID, channelID string) (*models.Recording, error) {
	channel, err := s.ensureChannelAccess(ctx, actorID, channelID, true)
	if err != nil {
		return nil, err
	}
	recording, err := s.recordingRepo.FindActiveByChannelAndType(ctx, channel.ID, models.RecordingTypeRTMP)
	if err != nil {
		return nil, err
	}

	info, err := s.egressSvc.StopEgress(ctx, recording.EgressID)
	if err != nil {
		return nil, err
	}
	applyEgressResult(recording, info)
	if err := s.recordingRepo.Update(ctx, recording); err != nil {
		return nil, err
	}
	return recording, nil
}

func (s *voiceService) HandleWebhookEvent(ctx context.Context, evt *livekit.WebhookEvent) error {
	if evt == nil || evt.GetEvent() != "egress_ended" || evt.GetEgressInfo() == nil {
		return nil
	}
	egress := evt.GetEgressInfo()
	recording, err := s.recordingRepo.FindByEgressID(ctx, egress.GetEgressId())
	if err != nil {
		if isAppErrCode(err, "RECORDING_NOT_FOUND") {
			return nil
		}
		return err
	}
	applyEgressResult(recording, egress)
	return s.recordingRepo.Update(ctx, recording)
}

func (s *voiceService) ensureChannelAccess(ctx context.Context, actorID, channelID string, manageRequired bool) (*models.Channel, error) {
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

	perm := models.PermissionViewChannel
	if manageRequired {
		perm = models.PermissionManageChannels
	}
	hasPerm, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, perm)
	if err != nil {
		return nil, err
	}
	if !hasPerm {
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

func applyEgressResult(recording *models.Recording, info *livekit.EgressInfo) {
	if recording == nil || info == nil {
		return
	}

	status := normalizeRecordingStatus(info.GetStatus())
	recording.Status = status

	if len(info.GetFileResults()) > 0 {
		url := strings.TrimSpace(info.GetFileResults()[0].GetLocation())
		if url != "" {
			recording.FileURL = &url
		}
	}

	started := normalizeEpochSeconds(info.GetStartedAt())
	ended := normalizeEpochSeconds(info.GetEndedAt())
	if started > 0 {
		recording.StartedAt = started
	}
	if ended > 0 {
		recording.EndedAt = &ended
	}
	if ended > 0 && started > 0 && ended >= started {
		duration := ended - started
		recording.DurationSeconds = &duration
	}
}

func normalizeRecordingStatus(status livekit.EgressStatus) string {
	s := status.String()
	switch s {
	case "EGRESS_COMPLETE":
		return models.RecordingStatusCompleted
	case "EGRESS_FAILED", "EGRESS_ABORTED", "EGRESS_LIMIT_REACHED":
		return models.RecordingStatusFailed
	default:
		return models.RecordingStatusActive
	}
}

func normalizeEpochSeconds(ts int64) int64 {
	switch {
	case ts > 1_000_000_000_000_000_000:
		return ts / 1_000_000_000
	case ts > 1_000_000_000_000_000:
		return ts / 1_000_000
	case ts > 1_000_000_000_000:
		return ts / 1_000
	default:
		return ts
	}
}

func isAppErrCode(err error, code string) bool {
	ae, ok := apperr.From(err)
	return ok && ae.Code == code
}
