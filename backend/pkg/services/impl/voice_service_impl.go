package impl

import (
	"context"
	"encoding/json"
	"log"
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
	userRepo      repositories.UserRepository
	recordingRepo repositories.RecordingRepository
	notification  services.NotificationService
	liveKitSvc    services.LiveKitService
	egressSvc     services.EgressService
}

func NewVoiceService(
	serverRepo repositories.ServerRepository,
	channelRepo repositories.ChannelRepository,
	userRepo repositories.UserRepository,
	recordingRepo repositories.RecordingRepository,
	notification services.NotificationService,
	liveKitSvc services.LiveKitService,
	egressSvc services.EgressService,
) services.VoiceService {
	return &voiceService{
		serverRepo:    serverRepo,
		channelRepo:   channelRepo,
		userRepo:      userRepo,
		recordingRepo: recordingRepo,
		notification:  notification,
		liveKitSvc:    liveKitSvc,
		egressSvc:     egressSvc,
	}
}

func (s *voiceService) GenerateVoiceToken(ctx context.Context, actorID, channelID string) (*services.VoiceTokenResult, error) {
	log.Printf("[voice-debug] generate-token:start actor_id=%s channel_id=%s", strings.TrimSpace(actorID), strings.TrimSpace(channelID))
	channel, err := s.ensureChannelAccess(ctx, actorID, channelID, false)
	if err != nil {
		log.Printf("[voice-debug] generate-token:ensure-access-failed actor_id=%s channel_id=%s err=%v", strings.TrimSpace(actorID), strings.TrimSpace(channelID), err)
		return nil, err
	}
	if channel.Type != models.ChannelTypeVoice {
		log.Printf("[voice-debug] generate-token:channel-not-voice actor_id=%s channel_id=%s actual_type=%s", strings.TrimSpace(actorID), channel.ID, channel.Type)
		return nil, apperr.E("VOICE_CHANNEL_REQUIRED", nil)
	}

	actor, err := s.userRepo.FindByID(ctx, actorID)
	if err != nil {
		log.Printf("[voice-debug] generate-token:load-actor-failed actor_id=%s channel_id=%s err=%v", strings.TrimSpace(actorID), channel.ID, err)
		return nil, err
	}

	metadataBytes, err := json.Marshal(map[string]any{
		"user_id":      actor.ID,
		"username":     actor.Username,
		"display_name": actor.Username,
		"avatar_url":   strings.TrimSpace(stringValue(actor.AvatarURL)),
	})
	if err != nil {
		return nil, apperr.E("INTERNAL_ERROR", err)
	}

	token, err := s.liveKitSvc.GenerateAccessToken(channel.ID, actorID, actor.Username, string(metadataBytes))
	if err != nil {
		log.Printf("[voice-debug] generate-token:livekit-generate-failed actor_id=%s channel_id=%s err=%v", strings.TrimSpace(actorID), channel.ID, err)
		return nil, err
	}
	log.Printf("[voice-debug] generate-token:success actor_id=%s channel_id=%s server_id=%s token_len=%d livekit_url=%s", strings.TrimSpace(actorID), channel.ID, channel.ServerID, len(token), strings.TrimSpace(global.Config.LiveKit.URL))

	return &services.VoiceTokenResult{
		Token: token,
		URL:   global.Config.LiveKit.URL,
	}, nil
}

func (s *voiceService) ListChannelParticipants(ctx context.Context, actorID, channelID string) ([]models.VoiceChannelParticipantSnapshot, error) {
	channel, err := s.ensureChannelAccess(ctx, actorID, channelID, false)
	if err != nil {
		return nil, err
	}
	if channel.Type != models.ChannelTypeVoice {
		return nil, apperr.E("VOICE_CHANNEL_REQUIRED", nil)
	}

	_, participantInfos, err := s.liveKitSvc.GetRoomInfo(ctx, channel.ID)
	if err != nil {
		if isAppErrCode(err, "LIVEKIT_ROOM_NOT_FOUND") {
			return []models.VoiceChannelParticipantSnapshot{}, nil
		}
		return nil, err
	}

	return s.buildParticipantSnapshots(ctx, participantInfos)
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
	if evt == nil {
		return nil
	}

	switch evt.GetEvent() {
	case "egress_ended":
		if evt.GetEgressInfo() == nil {
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
	case "participant_joined", "participant_left", "track_published", "track_unpublished", "room_started", "room_finished":
		return s.dispatchVoiceActivityUpdate(ctx, evt)
	default:
		return nil
	}
}

func (s *voiceService) dispatchVoiceActivityUpdate(ctx context.Context, evt *livekit.WebhookEvent) error {
	room := evt.GetRoom()
	if room == nil {
		return nil
	}

	channelID := strings.TrimSpace(room.GetName())
	if channelID == "" {
		return nil
	}

	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return err
	}
	if channel.Type != models.ChannelTypeVoice {
		return nil
	}

	_, participantInfos, err := s.liveKitSvc.GetRoomInfo(ctx, channelID)
	if err != nil && !isAppErrCode(err, "LIVEKIT_ROOM_NOT_FOUND") {
		return err
	}
	participantInfos = participantInfos[:len(participantInfos):len(participantInfos)]
	participants, err := s.buildParticipantSnapshots(ctx, participantInfos)
	if err != nil {
		return err
	}

	payload, err := json.Marshal(models.VoiceChannelActivityUpdatedEvent{
		EventType:    models.VoiceEventTypeActivityUpdated,
		ServerID:     channel.ServerID,
		ChannelID:    channel.ID,
		Participants: participants,
	})
	if err != nil {
		return apperr.E("INTERNAL_ERROR", err)
	}

	members, err := s.serverRepo.ListMembers(ctx, channel.ServerID)
	if err != nil {
		return err
	}

	for _, member := range members {
		memberID := strings.TrimSpace(member.ID)
		if memberID == "" {
			continue
		}

		hasViewPerm, err := s.serverRepo.HasPermission(ctx, channel.ServerID, memberID, models.PermissionViewChannel)
		if err != nil || !hasViewPerm {
			continue
		}

		if channel.IsPrivate {
			isMember, err := s.channelRepo.IsMember(ctx, channel.ID, memberID)
			if err != nil || !isMember {
				continue
			}
		}

		if s.notification != nil {
			_, _ = s.notification.Dispatch(
				ctx,
				memberID,
				models.NotificationSourceTypeSystem,
				models.NotificationEventTypePopup,
				models.NotificationPriorityNormal,
				"voice-service",
				payload,
				nil,
			)
		}
	}

	return nil
}

func (s *voiceService) buildParticipantSnapshots(ctx context.Context, participantInfos []*livekit.ParticipantInfo) ([]models.VoiceChannelParticipantSnapshot, error) {
	userIDs := make([]string, 0, len(participantInfos))
	userSeen := make(map[string]struct{}, len(participantInfos))
	for _, p := range participantInfos {
		userID := strings.TrimSpace(p.GetIdentity())
		if userID == "" {
			continue
		}
		if _, exists := userSeen[userID]; exists {
			continue
		}
		userSeen[userID] = struct{}{}
		userIDs = append(userIDs, userID)
	}

	users, err := s.userRepo.FindByIDs(ctx, userIDs)
	if err != nil {
		return nil, err
	}
	userMap := make(map[string]models.User, len(users))
	for _, u := range users {
		userMap[u.ID] = u
	}

	participants := make([]models.VoiceChannelParticipantSnapshot, 0, len(participantInfos))
	for _, p := range participantInfos {
		userID := strings.TrimSpace(p.GetIdentity())
		if userID == "" {
			continue
		}
		user, ok := userMap[userID]
		name := strings.TrimSpace(p.GetName())
		if ok && strings.TrimSpace(user.Username) != "" {
			name = strings.TrimSpace(user.Username)
		}
		if name == "" {
			name = userID
		}
		avatarURL := ""
		if ok {
			avatarURL = strings.TrimSpace(stringValue(user.AvatarURL))
		}

		isScreenSharing := false
		for _, track := range p.GetTracks() {
			source := track.GetSource()
			if source == livekit.TrackSource_SCREEN_SHARE || source == livekit.TrackSource_SCREEN_SHARE_AUDIO {
				isScreenSharing = true
				break
			}
		}

		participants = append(participants, models.VoiceChannelParticipantSnapshot{
			UserID:          userID,
			Name:            name,
			AvatarURL:       avatarURL,
			IsScreenSharing: isScreenSharing,
		})
	}

	return participants, nil
}

func (s *voiceService) ensureChannelAccess(ctx context.Context, actorID, channelID string, manageRequired bool) (*models.Channel, error) {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	log.Printf("[voice-debug] ensure-access:start actor_id=%s channel_id=%s manage_required=%t", actorID, channelID, manageRequired)
	if actorID == "" || channelID == "" {
		log.Printf("[voice-debug] ensure-access:missing-fields actor_id=%s channel_id=%s", actorID, channelID)
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		log.Printf("[voice-debug] ensure-access:channel-not-found actor_id=%s channel_id=%s err=%v", actorID, channelID, err)
		return nil, err
	}
	if _, err := s.serverRepo.FindMember(ctx, channel.ServerID, actorID); err != nil {
		log.Printf("[voice-debug] ensure-access:not-server-member actor_id=%s channel_id=%s server_id=%s err=%v", actorID, channelID, channel.ServerID, err)
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}

	perm := models.PermissionViewChannel
	if manageRequired {
		perm = models.PermissionManageChannels
	}
	hasPerm, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, perm)
	if err != nil {
		log.Printf("[voice-debug] ensure-access:permission-check-failed actor_id=%s channel_id=%s server_id=%s perm=%d err=%v", actorID, channelID, channel.ServerID, perm, err)
		return nil, err
	}
	if !hasPerm {
		log.Printf("[voice-debug] ensure-access:permission-denied actor_id=%s channel_id=%s server_id=%s perm=%d", actorID, channelID, channel.ServerID, perm)
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	if channel.IsPrivate {
		isMember, err := s.channelRepo.IsMember(ctx, channel.ID, actorID)
		if err != nil {
			log.Printf("[voice-debug] ensure-access:private-membership-check-failed actor_id=%s channel_id=%s err=%v", actorID, channel.ID, err)
			return nil, err
		}
		if !isMember {
			log.Printf("[voice-debug] ensure-access:private-membership-denied actor_id=%s channel_id=%s", actorID, channel.ID)
			return nil, apperr.E("CHANNEL_ACCESS_DENIED", nil)
		}
	}
	log.Printf("[voice-debug] ensure-access:success actor_id=%s channel_id=%s server_id=%s channel_type=%s private=%t", actorID, channel.ID, channel.ServerID, channel.Type, channel.IsPrivate)
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

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
