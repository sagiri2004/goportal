package impl

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/google/uuid"
	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

const (
	tournamentCreatedTopic           = "tournament.created"
	tournamentStatusChangedTopic     = "tournament.status_changed"
	tournamentParticipantJoinedTopic = "tournament.participant_joined"
	tournamentMatchStartedTopic      = "tournament.match_started"
	tournamentMatchCompletedTopic    = "tournament.match_completed"
	tournamentBracketUpdatedTopic    = "tournament.bracket_updated"
	tournamentCompletedTopic         = "tournament.completed"
	registrationDeadlineGraceSeconds = int64(12 * 60 * 60)
)

type tournamentService struct {
	repo          repositories.TournamentRepository
	serverRepo    repositories.ServerRepository
	channelRepo   repositories.ChannelRepository
	userRepo      repositories.UserRepository
	messageRepo   repositories.MessageRepository
	recordingRepo repositories.RecordingRepository
	liveKitSvc    services.LiveKitService
	egressSvc     services.EgressService
	notifySvc     services.NotificationService
	publisher     message.Publisher
}

func NewTournamentService(
	repo repositories.TournamentRepository,
	serverRepo repositories.ServerRepository,
	channelRepo repositories.ChannelRepository,
	userRepo repositories.UserRepository,
	messageRepo repositories.MessageRepository,
	recordingRepo repositories.RecordingRepository,
	liveKitSvc services.LiveKitService,
	egressSvc services.EgressService,
	notifySvc services.NotificationService,
	publisher message.Publisher,
) services.TournamentService {
	return &tournamentService{
		repo:          repo,
		serverRepo:    serverRepo,
		channelRepo:   channelRepo,
		userRepo:      userRepo,
		messageRepo:   messageRepo,
		recordingRepo: recordingRepo,
		liveKitSvc:    liveKitSvc,
		egressSvc:     egressSvc,
		notifySvc:     notifySvc,
		publisher:     publisher,
	}
}

func (s *tournamentService) CreateTournament(ctx context.Context, actorID string, input services.TournamentCreateInput) (*models.Tournament, error) {
	actorID = strings.TrimSpace(actorID)
	input.ServerID = strings.TrimSpace(input.ServerID)
	input.Name = strings.TrimSpace(input.Name)
	input.Game = strings.TrimSpace(input.Game)
	input.Format = strings.TrimSpace(input.Format)
	input.ParticipantType = strings.TrimSpace(input.ParticipantType)
	if actorID == "" || input.ServerID == "" || input.Name == "" || input.Game == "" || input.Format == "" || input.ParticipantType == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if err := s.ensureServerPermission(ctx, actorID, input.ServerID); err != nil {
		return nil, err
	}
	if !isValidFormat(input.Format) {
		return nil, apperr.E("TOURNAMENT_INVALID_FORMAT", nil)
	}
	if !isValidParticipantType(input.ParticipantType) {
		return nil, apperr.E("TOURNAMENT_INVALID_PARTICIPANT_TYPE", nil)
	}
	if input.MaxParticipants <= 1 {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if input.ParticipantType == models.TournamentParticipantTypeTeam && (input.TeamSize == nil || *input.TeamSize <= 0) {
		return nil, apperr.E("TOURNAMENT_INVALID_TEAM_SIZE", nil)
	}

	checkIn := 15
	if input.CheckInDurationMinutes != nil && *input.CheckInDurationMinutes > 0 {
		checkIn = *input.CheckInDurationMinutes
	}
	t := &models.Tournament{
		ServerID:                       input.ServerID,
		Name:                           input.Name,
		Description:                    input.Description,
		Game:                           input.Game,
		Format:                         input.Format,
		Status:                         models.TournamentStatusDraft,
		MaxParticipants:                input.MaxParticipants,
		ParticipantType:                input.ParticipantType,
		TeamSize:                       input.TeamSize,
		RegistrationDeadline:           input.RegistrationDeadline,
		CheckInDurationMinutes:         checkIn,
		PrizePool:                      input.PrizePool,
		Rules:                          input.Rules,
		CreatedBy:                      actorID,
		RecordingEnabled:               false,
		RecordTeamA:                    true,
		RecordTeamB:                    true,
		RecordReferee:                  false,
		RecordLivestream:               false,
		AutoStartRecordingOnMatchStart: true,
	}
	if err := s.repo.CreateTournament(ctx, t); err != nil {
		return nil, err
	}
	if err := s.ensureTournamentGeneralChannel(ctx, t); err != nil {
		return nil, err
	}
	s.publishEvent(ctx, tournamentCreatedTopic, map[string]any{
		"event_id":      uuid.NewString(),
		"event_type":    "TOURNAMENT_CREATED",
		"occurred_at":   time.Now().UTC().Format(time.RFC3339),
		"tournament_id": t.ID,
		"server_id":     t.ServerID,
		"created_by":    actorID,
		"status":        t.Status,
		"format":        t.Format,
	})
	return t, nil
}

func (s *tournamentService) ListTournaments(ctx context.Context, actorID string, input services.TournamentListInput) (*services.TournamentListResult, error) {
	actorID = strings.TrimSpace(actorID)
	input.ServerID = strings.TrimSpace(input.ServerID)
	input.Status = strings.TrimSpace(input.Status)
	if actorID == "" || input.ServerID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if _, err := s.serverRepo.FindMember(ctx, input.ServerID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}
	rows, total, err := s.repo.ListTournamentsByServer(ctx, input.ServerID, repositories.TournamentListFilter{
		Status: input.Status,
		Page:   input.Page,
		Limit:  input.Limit,
	})
	if err != nil {
		return nil, err
	}
	for i := range rows {
		_ = s.ensureTournamentGeneralChannel(ctx, &rows[i])
	}
	page := input.Page
	if page <= 0 {
		page = 1
	}
	limit := input.Limit
	if limit <= 0 {
		limit = 20
	}
	return &services.TournamentListResult{
		Items: rows,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

func (s *tournamentService) GetTournamentDetail(ctx context.Context, actorID, tournamentID string) (*models.Tournament, int64, []repositories.TournamentParticipantResolved, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, 0, nil, err
	}
	_ = s.ensureTournamentGeneralChannel(ctx, t)
	count, err := s.repo.CountParticipants(ctx, t.ID)
	if err != nil {
		return nil, 0, nil, err
	}
	participants, err := s.repo.ListParticipants(ctx, t.ID)
	if err != nil {
		return nil, 0, nil, err
	}
	return t, count, participants, nil
}

func (s *tournamentService) ensureTournamentGeneralChannel(ctx context.Context, t *models.Tournament) error {
	if t == nil || strings.TrimSpace(t.ID) == "" || strings.TrimSpace(t.ServerID) == "" {
		return nil
	}
	if t.TournamentGeneralChannelID != nil && strings.TrimSpace(*t.TournamentGeneralChannelID) != "" {
		return nil
	}

	slug := slugifyTournamentName(t.Name)
	channelName := fmt.Sprintf("tournament-%s-general", slug)

	channels, err := s.channelRepo.ListByServerID(ctx, t.ServerID)
	if err != nil {
		return err
	}

	var tournamentCategoryID *string
	for i := range channels {
		ch := channels[i]
		if ch.Type != models.ChannelTypeCategory {
			continue
		}
		lower := strings.ToLower(strings.TrimSpace(ch.Name))
		if strings.Contains(lower, "tournament") || strings.Contains(lower, "giai dau") || strings.Contains(lower, "giải đấu") {
			id := ch.ID
			tournamentCategoryID = &id
			break
		}
	}

	for i := range channels {
		ch := channels[i]
		if ch.Type != models.ChannelTypeText || strings.TrimSpace(ch.Name) != channelName {
			continue
		}
		if tournamentCategoryID != nil {
			if ch.ParentID == nil || *ch.ParentID != *tournamentCategoryID {
				ch.ParentID = tournamentCategoryID
				_ = s.channelRepo.Update(ctx, &ch)
			}
		}
		t.TournamentGeneralChannelID = &ch.ID
		return s.repo.UpdateTournament(ctx, t)
	}

	general, err := s.createChannel(ctx, t.ServerID, tournamentCategoryID, models.ChannelTypeText, channelName, false)
	if err != nil {
		return err
	}
	t.TournamentGeneralChannelID = &general.ID
	return s.repo.UpdateTournament(ctx, t)
}

var tournamentSlugRegex = regexp.MustCompile(`[^a-z0-9]+`)

func slugifyTournamentName(raw string) string {
	slug := strings.ToLower(strings.TrimSpace(raw))
	slug = tournamentSlugRegex.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		return "main"
	}
	return slug
}

func (s *tournamentService) postTournamentSystemMessage(ctx context.Context, t *models.Tournament, eventType, text string, data map[string]any) {
	if s.messageRepo == nil || t == nil {
		return
	}
	if err := s.ensureTournamentGeneralChannel(ctx, t); err != nil {
		return
	}
	if t.TournamentGeneralChannelID == nil || strings.TrimSpace(*t.TournamentGeneralChannelID) == "" {
		return
	}
	authorID := strings.TrimSpace(t.CreatedBy)
	if authorID == "" {
		return
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return
	}
	channelID := strings.TrimSpace(*t.TournamentGeneralChannelID)
	payload := map[string]any{
		"event_type":      eventType,
		"text":            text,
		"bot_name":        "Tournament Bot",
		"tournament_id":   t.ID,
		"tournament_name": t.Name,
		"server_id":       t.ServerID,
	}
	for key, value := range data {
		payload[key] = value
	}
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return
	}
	content := models.MessageContentEnvelope{
		Type:     "system/tournament",
		Payload:  json.RawMessage(rawPayload),
		Encoding: "utf-8",
	}
	rawContent, err := json.Marshal(content)
	if err != nil {
		return
	}
	msg := &models.Message{
		ChannelID: channelID,
		AuthorID:  authorID,
		Content:   rawContent,
	}
	if err := s.messageRepo.Create(ctx, msg, nil); err != nil {
		return
	}
	_ = s.messageRepo.IncrementUnreadCounts(ctx, channelID, nil)
	if s.publisher == nil {
		return
	}
	event := models.ChatMessageCreatedEvent{
		EventID:    uuid.NewString(),
		EventType:  "CHAT_MESSAGE_CREATED",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
		ServerID:   t.ServerID,
		ChannelID:  channelID,
		AuthorID:   authorID,
		MessageID:  msg.ID,
		Content:    content,
		Author: &models.EventAuthor{
			ID:       authorID,
			Username: "Tournament Bot",
		},
		CreatedAt: msg.CreatedAt,
		UpdatedAt: msg.UpdatedAt,
	}
	rawEvent, err := json.Marshal(event)
	if err != nil {
		return
	}
	wm := message.NewMessage(event.EventID, rawEvent)
	wm.SetContext(ctx)
	_ = s.publisher.Publish(chatMessageCreatedTopic, wm)
}

func (s *tournamentService) UpdateTournament(ctx context.Context, actorID, tournamentID string, input services.TournamentUpdateInput) (*models.Tournament, error) {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	if t.Status == models.TournamentStatusInProgress || t.Status == models.TournamentStatusCompleted {
		return nil, apperr.E("TOURNAMENT_UPDATE_FORBIDDEN", nil)
	}
	if input.Name != nil {
		name := strings.TrimSpace(*input.Name)
		if name == "" {
			return nil, apperr.E("MISSING_FIELDS", nil)
		}
		t.Name = name
	}
	if input.Description != nil {
		trimmed := strings.TrimSpace(*input.Description)
		t.Description = &trimmed
	}
	if input.Rules != nil {
		trimmed := strings.TrimSpace(*input.Rules)
		t.Rules = &trimmed
	}
	if input.PrizePool != nil {
		trimmed := strings.TrimSpace(*input.PrizePool)
		t.PrizePool = &trimmed
	}
	if input.MaxParticipants != nil {
		if *input.MaxParticipants <= 1 {
			return nil, apperr.E("MISSING_FIELDS", nil)
		}
		t.MaxParticipants = *input.MaxParticipants
	}
	if input.RegistrationDeadline != nil {
		t.RegistrationDeadline = input.RegistrationDeadline
	}
	if input.RecordingEnabled != nil {
		t.RecordingEnabled = *input.RecordingEnabled
	}
	if input.RecordTeamA != nil {
		t.RecordTeamA = *input.RecordTeamA
	}
	if input.RecordTeamB != nil {
		t.RecordTeamB = *input.RecordTeamB
	}
	if input.RecordReferee != nil {
		t.RecordReferee = *input.RecordReferee
	}
	if input.RecordLivestream != nil {
		t.RecordLivestream = *input.RecordLivestream
	}
	if input.AutoStartRecordingOnMatchStart != nil {
		t.AutoStartRecordingOnMatchStart = *input.AutoStartRecordingOnMatchStart
	}
	if err := s.repo.UpdateTournament(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *tournamentService) DeleteTournament(ctx context.Context, actorID, tournamentID string) error {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return err
	}
	if t.Status != models.TournamentStatusDraft {
		return apperr.E("TOURNAMENT_DELETE_FORBIDDEN", nil)
	}
	return s.repo.DeleteTournamentByID(ctx, t.ID)
}

func (s *tournamentService) UpdateTournamentStatus(ctx context.Context, actorID, tournamentID, status string) (*models.Tournament, error) {
	status = strings.TrimSpace(status)
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	if status == "" || !isValidTournamentStatus(status) {
		return nil, apperr.E("TOURNAMENT_INVALID_STATUS_TRANSITION", nil)
	}
	if !canTransitionStatus(t.Status, status) {
		return nil, apperr.E("TOURNAMENT_INVALID_STATUS_TRANSITION", nil)
	}
	if status == models.TournamentStatusInProgress {
		if err := s.generateBracket(ctx, t); err != nil {
			return nil, err
		}
		now := time.Now().Unix()
		t.StartedAt = &now
	}
	if status == models.TournamentStatusCompleted {
		now := time.Now().Unix()
		t.CompletedAt = &now
	}
	t.Status = status
	if err := s.repo.UpdateTournament(ctx, t); err != nil {
		return nil, err
	}
	if status == models.TournamentStatusCompleted {
		_ = s.closeTournamentLiveWorkspaces(ctx, t, actorID)
	}
	s.publishEvent(ctx, tournamentStatusChangedTopic, map[string]any{
		"event_id":      uuid.NewString(),
		"event_type":    "TOURNAMENT_STATUS_CHANGED",
		"occurred_at":   time.Now().UTC().Format(time.RFC3339),
		"tournament_id": t.ID,
		"server_id":     t.ServerID,
		"status":        t.Status,
	})
	s.notifyTournamentParticipants(ctx, t, actorID, "TOURNAMENT_STATUS_CHANGED", tournamentStatusNotificationTitle(t.Status), tournamentStatusNotificationBody(t), map[string]any{
		"status": t.Status,
	})
	s.postTournamentSystemMessage(ctx, t, "TOURNAMENT_STATUS_CHANGED", tournamentStatusSystemMessage(t), map[string]any{
		"status": t.Status,
	})
	if t.Status == models.TournamentStatusCheckIn {
		s.notifyTournamentParticipantsByStatus(ctx, t, actorID, true, []string{models.TournamentParticipantStatusRegistered}, "TOURNAMENT_CHECK_IN_OPENED", "Da den giai doan check-in", fmt.Sprintf("%s da mo check-in. Hay vao giai dau de xac nhan tham gia.", t.Name), map[string]any{
			"status": t.Status,
		})
	}
	return t, nil
}

func (s *tournamentService) RegisterParticipant(ctx context.Context, actorID, tournamentID string) (*repositories.TournamentParticipantResolved, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	if t.ParticipantType != models.TournamentParticipantTypeSolo {
		return nil, apperr.E("TOURNAMENT_INVALID_PARTICIPANT_TYPE", nil)
	}
	if t.Status != models.TournamentStatusRegistration {
		return nil, apperr.E("TOURNAMENT_REGISTRATION_CLOSED", nil)
	}
	if t.RegistrationDeadline != nil && time.Now().Unix() > (*t.RegistrationDeadline+registrationDeadlineGraceSeconds) {
		return nil, apperr.E("TOURNAMENT_REGISTRATION_CLOSED", nil)
	}
	if _, err := s.repo.FindParticipantByUserID(ctx, t.ID, actorID); err == nil {
		return nil, apperr.E("TOURNAMENT_PARTICIPANT_EXISTS", nil)
	} else if ae, ok := apperr.From(err); !ok || ae.Code != "TOURNAMENT_PARTICIPANT_NOT_FOUND" {
		return nil, err
	}
	count, err := s.repo.CountParticipants(ctx, t.ID)
	if err != nil {
		return nil, err
	}
	if count >= int64(t.MaxParticipants) {
		return nil, apperr.E("TOURNAMENT_MAX_PARTICIPANTS_REACHED", nil)
	}
	p := &models.TournamentParticipant{
		TournamentID: t.ID,
		UserID:       &actorID,
		Status:       models.TournamentParticipantStatusRegistered,
		RegisteredAt: time.Now().Unix(),
	}
	if err := s.repo.CreateParticipant(ctx, p); err != nil {
		return nil, err
	}
	out, err := s.repo.FindParticipantByID(ctx, t.ID, p.ID)
	if err != nil {
		return nil, err
	}
	s.publishEvent(ctx, tournamentParticipantJoinedTopic, map[string]any{
		"event_id":       uuid.NewString(),
		"event_type":     "TOURNAMENT_PARTICIPANT_JOINED",
		"occurred_at":    time.Now().UTC().Format(time.RFC3339),
		"tournament_id":  t.ID,
		"participant_id": p.ID,
		"user_id":        actorID,
	})
	s.notifyTournamentUser(ctx, t, t.CreatedBy, "TOURNAMENT_PARTICIPANT_JOINED", "Co nguoi tham gia giai dau", fmt.Sprintf("%s vua dang ky tham gia %s.", participantDisplayName(out), t.Name), map[string]any{
		"participant_id": p.ID,
		"user_id":        actorID,
	}, actorID)
	s.postTournamentSystemMessage(ctx, t, "TOURNAMENT_PARTICIPANT_JOINED", fmt.Sprintf("%s vua dang ky tham gia giai dau.", participantDisplayName(out)), map[string]any{
		"participant_id": p.ID,
		"user_id":        actorID,
	})
	return out, nil
}

func (s *tournamentService) BulkAddParticipants(ctx context.Context, actorID, tournamentID string, input services.TournamentParticipantBulkInput) ([]repositories.TournamentParticipantResolved, error) {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	if t.ParticipantType != models.TournamentParticipantTypeSolo {
		return nil, apperr.E("TOURNAMENT_INVALID_PARTICIPANT_TYPE", nil)
	}
	if t.Status != models.TournamentStatusRegistration {
		return nil, apperr.E("TOURNAMENT_REGISTRATION_CLOSED", nil)
	}

	userIDs := make([]string, 0, len(input.UserIDs))
	seen := map[string]struct{}{}
	for _, raw := range input.UserIDs {
		id := strings.TrimSpace(raw)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		userIDs = append(userIDs, id)
	}
	if len(userIDs) == 0 {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	currentCount, err := s.repo.CountParticipants(ctx, t.ID)
	if err != nil {
		return nil, err
	}
	if currentCount >= int64(t.MaxParticipants) {
		return nil, apperr.E("TOURNAMENT_MAX_PARTICIPANTS_REACHED", nil)
	}

	created := make([]repositories.TournamentParticipantResolved, 0, len(userIDs))
	for _, userID := range userIDs {
		if currentCount >= int64(t.MaxParticipants) {
			break
		}
		if _, err := s.userRepo.FindByID(ctx, userID); err != nil {
			continue
		}
		if _, err := s.repo.FindParticipantByUserID(ctx, t.ID, userID); err == nil {
			continue
		}
		p := &models.TournamentParticipant{
			TournamentID: t.ID,
			UserID:       &userID,
			Status:       models.TournamentParticipantStatusRegistered,
			RegisteredAt: time.Now().Unix(),
		}
		if err := s.repo.CreateParticipant(ctx, p); err != nil {
			continue
		}
		if resolved, err := s.repo.FindParticipantByID(ctx, t.ID, p.ID); err == nil {
			created = append(created, *resolved)
			currentCount++
			s.notifyTournamentUser(ctx, t, userID, "TOURNAMENT_PARTICIPANT_ASSIGNED", "Ban duoc them vao giai dau", fmt.Sprintf("Ban da duoc them vao %s.", t.Name), map[string]any{
				"participant_id": p.ID,
				"assigned_by":    actorID,
			}, actorID)
		}
	}
	if len(created) > 0 {
		s.postTournamentSystemMessage(ctx, t, "TOURNAMENT_PARTICIPANT_ASSIGNED", fmt.Sprintf("%d nguoi choi da duoc them vao giai dau.", len(created)), map[string]any{
			"count":       len(created),
			"assigned_by": actorID,
		})
	}
	return created, nil
}

func (s *tournamentService) CancelMyRegistration(ctx context.Context, actorID, tournamentID string) error {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return err
	}
	if t.Status != models.TournamentStatusRegistration {
		return apperr.E("TOURNAMENT_REGISTRATION_CLOSED", nil)
	}
	return s.repo.DeleteParticipantByUserID(ctx, t.ID, actorID)
}

func (s *tournamentService) CheckInParticipant(ctx context.Context, actorID, tournamentID, participantID string) (*repositories.TournamentParticipantResolved, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	if t.Status != models.TournamentStatusCheckIn {
		return nil, apperr.E("TOURNAMENT_CHECKIN_CLOSED", nil)
	}
	p, err := s.repo.FindParticipantByID(ctx, t.ID, participantID)
	if err != nil {
		return nil, err
	}
	if !s.canOperateParticipant(actorID, t, p) {
		return nil, apperr.E("TOURNAMENT_FORBIDDEN", nil)
	}
	now := time.Now().Unix()
	p.Participant.Status = models.TournamentParticipantStatusCheckedIn
	p.Participant.CheckedInAt = &now
	if err := s.repo.UpdateParticipant(ctx, &p.Participant); err != nil {
		return nil, err
	}
	if p.User != nil {
		s.notifyTournamentUser(ctx, t, p.User.ID, "TOURNAMENT_CHECKED_IN", "Da check-in giai dau", fmt.Sprintf("Ban da check-in thanh cong cho %s.", t.Name), map[string]any{
			"participant_id": p.Participant.ID,
		}, actorID)
	}
	s.postTournamentSystemMessage(ctx, t, "TOURNAMENT_CHECKED_IN", fmt.Sprintf("%s da check-in.", participantDisplayName(p)), map[string]any{
		"participant_id": p.Participant.ID,
	})
	return s.repo.FindParticipantByID(ctx, t.ID, p.Participant.ID)
}

func (s *tournamentService) RemoveParticipant(ctx context.Context, actorID, tournamentID, participantID string) error {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return err
	}
	return s.repo.DeleteParticipantByID(ctx, t.ID, participantID)
}

func (s *tournamentService) UpdateParticipantSeed(ctx context.Context, actorID, tournamentID, participantID string, seed int) (*repositories.TournamentParticipantResolved, error) {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	if t.Status == models.TournamentStatusInProgress || t.Status == models.TournamentStatusCompleted {
		return nil, apperr.E("TOURNAMENT_UPDATE_FORBIDDEN", nil)
	}
	p, err := s.repo.FindParticipantByID(ctx, t.ID, participantID)
	if err != nil {
		return nil, err
	}
	p.Participant.Seed = &seed
	if err := s.repo.UpdateParticipant(ctx, &p.Participant); err != nil {
		return nil, err
	}
	return s.repo.FindParticipantByID(ctx, t.ID, p.Participant.ID)
}

func (s *tournamentService) CreateTeam(ctx context.Context, actorID, tournamentID string, input services.TournamentTeamCreateInput) (*models.TournamentTeam, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	if t.ParticipantType != models.TournamentParticipantTypeTeam {
		return nil, apperr.E("TOURNAMENT_INVALID_PARTICIPANT_TYPE", nil)
	}
	if t.Status != models.TournamentStatusRegistration {
		return nil, apperr.E("TOURNAMENT_REGISTRATION_CLOSED", nil)
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	team := &models.TournamentTeam{
		TournamentID: t.ID,
		Name:         name,
		CaptainID:    actorID,
	}
	if err := s.repo.CreateTeam(ctx, team, &models.TournamentTeamMember{
		TeamID:   team.ID,
		UserID:   actorID,
		JoinedAt: time.Now().Unix(),
	}); err != nil {
		return nil, err
	}
	if _, err := s.repo.FindParticipantByTeamID(ctx, t.ID, team.ID); err != nil {
		teamID := team.ID
		_ = s.repo.CreateParticipant(ctx, &models.TournamentParticipant{
			TournamentID: t.ID,
			TeamID:       &teamID,
			Status:       models.TournamentParticipantStatusRegistered,
			RegisteredAt: time.Now().Unix(),
		})
	}
	s.postTournamentSystemMessage(ctx, t, "TOURNAMENT_TEAM_CREATED", fmt.Sprintf("Doi %s vua dang ky tham gia giai dau.", team.Name), map[string]any{
		"team_id":   team.ID,
		"team_name": team.Name,
	})
	return team, nil
}

func (s *tournamentService) ListTeams(ctx context.Context, actorID, tournamentID string) ([]repositories.TournamentTeamWithMembers, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListTeams(ctx, t.ID)
}

func (s *tournamentService) AddTeamMember(ctx context.Context, actorID, tournamentID, teamID string, input services.TournamentAddTeamMemberInput) error {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return err
	}
	if t.ParticipantType != models.TournamentParticipantTypeTeam {
		return apperr.E("TOURNAMENT_INVALID_PARTICIPANT_TYPE", nil)
	}
	team, err := s.repo.FindTeamByID(ctx, t.ID, teamID)
	if err != nil {
		return err
	}
	if team.CaptainID != actorID && actorID != t.CreatedBy {
		return apperr.E("TOURNAMENT_FORBIDDEN", nil)
	}
	count, err := s.repo.CountTeamMembers(ctx, team.ID)
	if err != nil {
		return err
	}
	if t.TeamSize != nil && count >= int64(*t.TeamSize) {
		return apperr.E("TOURNAMENT_TEAM_SIZE_EXCEEDED", nil)
	}
	userID := strings.TrimSpace(input.UserID)
	if userID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	if err := s.repo.AddTeamMember(ctx, &models.TournamentTeamMember{
		TeamID:   team.ID,
		UserID:   userID,
		JoinedAt: time.Now().Unix(),
	}); err != nil {
		return err
	}
	s.notifyTournamentUser(ctx, t, userID, "TOURNAMENT_TEAM_MEMBER_ASSIGNED", "Ban duoc them vao doi thi dau", fmt.Sprintf("Ban da duoc them vao doi %s trong %s.", team.Name, t.Name), map[string]any{
		"team_id":     team.ID,
		"team_name":   team.Name,
		"assigned_by": actorID,
	}, actorID)
	s.postTournamentSystemMessage(ctx, t, "TOURNAMENT_TEAM_MEMBER_ASSIGNED", fmt.Sprintf("Mot thanh vien moi da duoc them vao doi %s.", team.Name), map[string]any{
		"team_id":     team.ID,
		"team_name":   team.Name,
		"user_id":     userID,
		"assigned_by": actorID,
	})
	return nil
}

func (s *tournamentService) RemoveTeamMember(ctx context.Context, actorID, tournamentID, teamID, userID string) error {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return err
	}
	team, err := s.repo.FindTeamByID(ctx, t.ID, teamID)
	if err != nil {
		return err
	}
	if team.CaptainID != actorID && actorID != t.CreatedBy {
		return apperr.E("TOURNAMENT_FORBIDDEN", nil)
	}
	if userID == team.CaptainID && actorID != t.CreatedBy {
		return apperr.E("TOURNAMENT_FORBIDDEN", nil)
	}
	return s.repo.RemoveTeamMember(ctx, team.ID, userID)
}

func (s *tournamentService) DeleteTeam(ctx context.Context, actorID, tournamentID, teamID string) error {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return err
	}
	team, err := s.repo.FindTeamByID(ctx, t.ID, teamID)
	if err != nil {
		return err
	}
	if team.CaptainID != actorID && actorID != t.CreatedBy {
		return apperr.E("TOURNAMENT_FORBIDDEN", nil)
	}
	return s.repo.DeleteTeamByID(ctx, t.ID, team.ID)
}

func (s *tournamentService) GetBracket(ctx context.Context, actorID, tournamentID string) ([]repositories.TournamentMatchResolved, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListMatches(ctx, t.ID, repositories.TournamentMatchFilter{})
}

func (s *tournamentService) ListMatches(ctx context.Context, actorID string, input services.TournamentMatchListInput) ([]repositories.TournamentMatchResolved, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, input.TournamentID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListMatches(ctx, t.ID, repositories.TournamentMatchFilter{
		Round:         input.Round,
		Status:        input.Status,
		ParticipantID: input.ParticipantID,
	})
}

func (s *tournamentService) GetMatch(ctx context.Context, actorID, tournamentID, matchID string) (*repositories.TournamentMatchResolved, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	return s.repo.FindMatchByID(ctx, t.ID, matchID)
}

func (s *tournamentService) UpdateMatchStatus(ctx context.Context, actorID, tournamentID, matchID, status string) (*repositories.TournamentMatchResolved, error) {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	m, err := s.repo.FindMatchByID(ctx, t.ID, matchID)
	if err != nil {
		return nil, err
	}
	status = strings.TrimSpace(status)
	if !canTransitionMatchStatus(m.Match.Status, status) {
		return nil, apperr.E("TOURNAMENT_INVALID_MATCH_STATUS", nil)
	}
	m.Match.Status = status
	if status == models.TournamentMatchStatusCompleted {
		now := time.Now().Unix()
		m.Match.CompletedAt = &now
	}
	if err := s.repo.UpdateMatch(ctx, &m.Match); err != nil {
		return nil, err
	}
	if status == models.TournamentMatchStatusInProgress {
		workspace, _ := s.ProvisionMatchWorkspace(ctx, actorID, t.ID, m.Match.ID)
		_ = s.autoStartMatchRecordings(ctx, actorID, t, &m.Match, workspace)
		s.publishEvent(ctx, tournamentMatchStartedTopic, map[string]any{
			"event_id":      uuid.NewString(),
			"event_type":    "TOURNAMENT_MATCH_STARTED",
			"occurred_at":   time.Now().UTC().Format(time.RFC3339),
			"tournament_id": t.ID,
			"match_id":      m.Match.ID,
		})
		s.notifyMatchParticipants(ctx, t, &m.Match, actorID, "TOURNAMENT_MATCH_STARTED", "Tran dau da bat dau", fmt.Sprintf("Tran dau trong %s da bat dau.", t.Name), map[string]any{
			"match_id": m.Match.ID,
		})
		s.postTournamentSystemMessage(ctx, t, "TOURNAMENT_MATCH_STARTED", fmt.Sprintf("%s da bat dau.", matchDisplayName(&m.Match)), map[string]any{
			"match_id": m.Match.ID,
		})
	} else if status == models.TournamentMatchStatusCompleted {
		_ = s.closeMatchLiveIfPresent(ctx, t, &m.Match, actorID)
	}
	return s.repo.FindMatchByID(ctx, t.ID, m.Match.ID)
}

func (s *tournamentService) ReportMatchResult(ctx context.Context, actorID, tournamentID, matchID string, input services.TournamentMatchResultInput) (*models.TournamentMatchReport, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	match, err := s.repo.FindMatchByID(ctx, t.ID, matchID)
	if err != nil {
		return nil, err
	}
	winnerID := strings.TrimSpace(input.WinnerID)
	if winnerID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	report := &models.TournamentMatchReport{
		MatchID:       match.Match.ID,
		ReportedBy:    actorID,
		WinnerID:      &winnerID,
		Score1:        input.Score1,
		Score2:        input.Score2,
		ScreenshotURL: input.ScreenshotURL,
		Status:        models.TournamentReportStatusPending,
		CreatedAt:     time.Now().Unix(),
	}
	if err := s.repo.CreateMatchReport(ctx, report); err != nil {
		return nil, err
	}
	if actorID == t.CreatedBy {
		report.Status = models.TournamentReportStatusConfirmed
		if err := s.repo.UpdateMatchReport(ctx, report); err != nil {
			return nil, err
		}
		if err := s.applyConfirmedResult(ctx, t, &match.Match, winnerID, input.Score1, input.Score2); err != nil {
			return nil, err
		}
	}
	return report, nil
}

func (s *tournamentService) DisputeMatchResult(ctx context.Context, actorID, tournamentID, matchID string) (*models.TournamentMatchReport, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	match, err := s.repo.FindMatchByID(ctx, t.ID, matchID)
	if err != nil {
		return nil, err
	}
	report, err := s.repo.FindLatestMatchReportByMatchID(ctx, match.Match.ID)
	if err != nil {
		return nil, err
	}
	report.Status = models.TournamentReportStatusDisputed
	if err := s.repo.UpdateMatchReport(ctx, report); err != nil {
		return nil, err
	}
	return report, nil
}

func (s *tournamentService) OverrideMatchResult(ctx context.Context, actorID, tournamentID, matchID string, input services.TournamentMatchOverrideInput) (*repositories.TournamentMatchResolved, error) {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	match, err := s.repo.FindMatchByID(ctx, t.ID, matchID)
	if err != nil {
		return nil, err
	}
	if err := s.applyConfirmedResult(ctx, t, &match.Match, input.WinnerID, input.Score1, input.Score2); err != nil {
		return nil, err
	}
	return s.repo.FindMatchByID(ctx, t.ID, match.Match.ID)
}

func (s *tournamentService) GetStandings(ctx context.Context, actorID, tournamentID string) ([]repositories.TournamentParticipantResolved, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	participants, err := s.repo.ListParticipants(ctx, t.ID)
	if err != nil {
		return nil, err
	}
	slices.SortFunc(participants, func(a, b repositories.TournamentParticipantResolved) int {
		if a.Participant.FinalRank != nil && b.Participant.FinalRank != nil {
			return *a.Participant.FinalRank - *b.Participant.FinalRank
		}
		if a.Participant.FinalRank != nil {
			return -1
		}
		if b.Participant.FinalRank != nil {
			return 1
		}
		seedA := math.MaxInt
		seedB := math.MaxInt
		if a.Participant.Seed != nil {
			seedA = *a.Participant.Seed
		}
		if b.Participant.Seed != nil {
			seedB = *b.Participant.Seed
		}
		return seedA - seedB
	})
	return participants, nil
}

func (s *tournamentService) GetParticipantMatches(ctx context.Context, actorID, tournamentID, participantID string) ([]repositories.TournamentMatchResolved, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListParticipantMatches(ctx, t.ID, participantID)
}

func (s *tournamentService) GetUserTournamentHistory(ctx context.Context, actorID, userID string) ([]models.Tournament, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	return s.repo.ListUserTournaments(ctx, userID)
}

func (s *tournamentService) applyConfirmedResult(ctx context.Context, t *models.Tournament, match *models.TournamentMatch, winnerID string, score1, score2 int) error {
	winnerID = strings.TrimSpace(winnerID)
	if winnerID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	match.WinnerID = &winnerID
	match.Score1 = &score1
	match.Score2 = &score2
	match.Status = models.TournamentMatchStatusCompleted
	now := time.Now().Unix()
	match.CompletedAt = &now
	if err := s.repo.UpdateMatch(ctx, match); err != nil {
		return err
	}
	_ = s.closeMatchLiveIfPresent(ctx, t, match, "")
	if match.Participant1ID != nil && *match.Participant1ID != winnerID {
		if p, err := s.repo.FindParticipantByID(ctx, t.ID, *match.Participant1ID); err == nil {
			p.Participant.Status = models.TournamentParticipantStatusEliminated
			_ = s.repo.UpdateParticipant(ctx, &p.Participant)
		}
	}
	if match.Participant2ID != nil && *match.Participant2ID != winnerID {
		if p, err := s.repo.FindParticipantByID(ctx, t.ID, *match.Participant2ID); err == nil {
			p.Participant.Status = models.TournamentParticipantStatusEliminated
			_ = s.repo.UpdateParticipant(ctx, &p.Participant)
		}
	}
	if match.NextMatchID != nil && *match.NextMatchID != "" {
		next, err := s.repo.FindMatchByID(ctx, t.ID, *match.NextMatchID)
		if err == nil {
			if next.Match.Participant1ID == nil {
				next.Match.Participant1ID = &winnerID
			} else if next.Match.Participant2ID == nil {
				next.Match.Participant2ID = &winnerID
			}
			if next.Match.Participant1ID != nil && next.Match.Participant2ID != nil && next.Match.Status == models.TournamentMatchStatusPending {
				next.Match.Status = models.TournamentMatchStatusReady
			}
			_ = s.repo.UpdateMatch(ctx, &next.Match)
		}
	}
	if match.LoserNextMatchID != nil && *match.LoserNextMatchID != "" {
		loserID := ""
		if match.Participant1ID != nil && *match.Participant1ID != winnerID {
			loserID = *match.Participant1ID
		}
		if match.Participant2ID != nil && *match.Participant2ID != winnerID {
			loserID = *match.Participant2ID
		}
		if loserID != "" {
			next, err := s.repo.FindMatchByID(ctx, t.ID, *match.LoserNextMatchID)
			if err == nil {
				if next.Match.Participant1ID == nil {
					next.Match.Participant1ID = &loserID
				} else if next.Match.Participant2ID == nil {
					next.Match.Participant2ID = &loserID
				}
				if next.Match.Participant1ID != nil && next.Match.Participant2ID != nil && next.Match.Status == models.TournamentMatchStatusPending {
					next.Match.Status = models.TournamentMatchStatusReady
				}
				_ = s.repo.UpdateMatch(ctx, &next.Match)
			}
		}
	}

	incomplete, err := s.repo.CountIncompleteMatches(ctx, t.ID)
	if err == nil && incomplete == 0 {
		t.Status = models.TournamentStatusCompleted
		nowComplete := time.Now().Unix()
		t.CompletedAt = &nowComplete
		_ = s.repo.UpdateTournament(ctx, t)
		if p, err := s.repo.FindParticipantByID(ctx, t.ID, winnerID); err == nil {
			one := 1
			p.Participant.FinalRank = &one
			p.Participant.Status = models.TournamentParticipantStatusWinner
			_ = s.repo.UpdateParticipant(ctx, &p.Participant)
		}
		s.publishEvent(ctx, tournamentCompletedTopic, map[string]any{
			"event_id":      uuid.NewString(),
			"event_type":    "TOURNAMENT_COMPLETED",
			"occurred_at":   time.Now().UTC().Format(time.RFC3339),
			"tournament_id": t.ID,
			"winner_id":     winnerID,
		})
	}

	s.publishEvent(ctx, tournamentMatchCompletedTopic, map[string]any{
		"event_id":      uuid.NewString(),
		"event_type":    "TOURNAMENT_MATCH_COMPLETED",
		"occurred_at":   time.Now().UTC().Format(time.RFC3339),
		"tournament_id": t.ID,
		"match_id":      match.ID,
		"winner_id":     winnerID,
	})
	s.notifyMatchParticipants(ctx, t, match, "", "TOURNAMENT_MATCH_COMPLETED", "Tran dau da ket thuc", fmt.Sprintf("Tran dau trong %s da co ket qua.", t.Name), map[string]any{
		"match_id":  match.ID,
		"winner_id": winnerID,
	})
	s.postTournamentSystemMessage(ctx, t, "TOURNAMENT_MATCH_COMPLETED", fmt.Sprintf("%s da ket thuc. Nguoi thang: %s.", matchDisplayName(match), s.participantNameByID(ctx, t, winnerID)), map[string]any{
		"match_id":  match.ID,
		"winner_id": winnerID,
	})
	s.publishEvent(ctx, tournamentBracketUpdatedTopic, map[string]any{
		"event_id":      uuid.NewString(),
		"event_type":    "TOURNAMENT_BRACKET_UPDATED",
		"occurred_at":   time.Now().UTC().Format(time.RFC3339),
		"tournament_id": t.ID,
	})
	s.notifyTournamentParticipants(ctx, t, "", "TOURNAMENT_BRACKET_UPDATED", "Nhanh dau da cap nhat", fmt.Sprintf("Nhanh dau cua %s vua duoc cap nhat.", t.Name), map[string]any{})
	return nil
}

func (s *tournamentService) generateBracket(ctx context.Context, tournament *models.Tournament) error {
	participants, err := s.repo.ListParticipantsByStatus(ctx, tournament.ID, models.TournamentParticipantStatusCheckedIn)
	if err != nil {
		return err
	}
	if len(participants) < 2 {
		return apperr.E("TOURNAMENT_BRACKET_GENERATION_FAILED", nil)
	}
	slices.SortFunc(participants, func(a, b repositories.TournamentParticipantResolved) int {
		seedA := math.MaxInt
		seedB := math.MaxInt
		if a.Participant.Seed != nil {
			seedA = *a.Participant.Seed
		}
		if b.Participant.Seed != nil {
			seedB = *b.Participant.Seed
		}
		return seedA - seedB
	})

	var matches []models.TournamentMatch
	switch tournament.Format {
	case models.TournamentFormatSingleElimination:
		matches = generateSingleEliminationMatches(participants)
	case models.TournamentFormatDoubleElimination:
		matches = generateDoubleEliminationMatches(participants)
	case models.TournamentFormatRoundRobin:
		matches = generateRoundRobinMatches(participants)
	case models.TournamentFormatSwiss:
		matches = generateSwissRoundOneMatches(participants)
	default:
		return apperr.E("TOURNAMENT_INVALID_FORMAT", nil)
	}
	if len(matches) == 0 {
		return apperr.E("TOURNAMENT_BRACKET_GENERATION_FAILED", nil)
	}
	return s.repo.ReplaceMatches(ctx, tournament.ID, matches)
}

func generateSingleEliminationMatches(participants []repositories.TournamentParticipantResolved) []models.TournamentMatch {
	n := len(participants)
	size := 1
	for size < n {
		size <<= 1
	}
	slotIDs := make([]*string, size)
	for i := 0; i < n; i++ {
		id := participants[i].Participant.ID
		slotIDs[i] = &id
	}
	firstRound := make([]models.TournamentMatch, 0, size/2)
	totalRounds := int(math.Log2(float64(size)))
	allRounds := make([][]models.TournamentMatch, 0, totalRounds)

	for i := 0; i < size/2; i++ {
		left := slotIDs[i]
		right := slotIDs[size-1-i]
		match := models.TournamentMatch{
			ID:           uuid.NewString(),
			TournamentID: participants[0].Participant.TournamentID,
			Round:        1,
			MatchNumber:  i + 1,
			BracketSide:  models.TournamentBracketWinners,
			Status:       models.TournamentMatchStatusPending,
		}
		match.Participant1ID = left
		match.Participant2ID = right
		if (left == nil && right != nil) || (left != nil && right == nil) {
			match.Status = models.TournamentMatchStatusBye
			winner := ""
			if left != nil {
				winner = *left
			} else {
				winner = *right
			}
			match.WinnerID = &winner
		}
		firstRound = append(firstRound, match)
	}
	allRounds = append(allRounds, firstRound)

	prevCount := len(firstRound)
	for round := 2; round <= totalRounds; round++ {
		cur := make([]models.TournamentMatch, 0, prevCount/2)
		for i := 0; i < prevCount/2; i++ {
			cur = append(cur, models.TournamentMatch{
				ID:           uuid.NewString(),
				TournamentID: participants[0].Participant.TournamentID,
				Round:        round,
				MatchNumber:  i + 1,
				BracketSide:  models.TournamentBracketWinners,
				Status:       models.TournamentMatchStatusPending,
			})
		}
		allRounds = append(allRounds, cur)
		prevCount = len(cur)
	}
	for round := 0; round < len(allRounds)-1; round++ {
		next := allRounds[round+1]
		for i := 0; i < len(allRounds[round]); i++ {
			nextID := next[i/2].ID
			allRounds[round][i].NextMatchID = &nextID
		}
	}
	out := make([]models.TournamentMatch, 0)
	for _, round := range allRounds {
		out = append(out, round...)
	}
	return out
}

func generateDoubleEliminationMatches(participants []repositories.TournamentParticipantResolved) []models.TournamentMatch {
	winners := generateSingleEliminationMatches(participants)
	if len(winners) == 0 {
		return nil
	}
	tID := participants[0].Participant.TournamentID
	loserRound := make([]models.TournamentMatch, 0, len(winners)/2)
	roundNumber := 100
	for i := 0; i < len(winners)/2; i++ {
		loserRound = append(loserRound, models.TournamentMatch{
			ID:           uuid.NewString(),
			TournamentID: tID,
			Round:        roundNumber,
			MatchNumber:  i + 1,
			BracketSide:  models.TournamentBracketLosers,
			Status:       models.TournamentMatchStatusPending,
		})
	}
	for i := 0; i < len(winners) && i/2 < len(loserRound); i++ {
		nextID := loserRound[i/2].ID
		winners[i].LoserNextMatchID = &nextID
	}
	grandFinal := models.TournamentMatch{
		ID:           uuid.NewString(),
		TournamentID: tID,
		Round:        999,
		MatchNumber:  1,
		BracketSide:  models.TournamentBracketGrandFinal,
		Status:       models.TournamentMatchStatusPending,
	}
	if len(winners) > 0 {
		grandID := grandFinal.ID
		winners[len(winners)-1].NextMatchID = &grandID
	}
	if len(loserRound) > 0 {
		grandID := grandFinal.ID
		loserRound[len(loserRound)-1].NextMatchID = &grandID
	}
	out := make([]models.TournamentMatch, 0, len(winners)+len(loserRound)+1)
	out = append(out, winners...)
	out = append(out, loserRound...)
	out = append(out, grandFinal)
	return out
}

func generateRoundRobinMatches(participants []repositories.TournamentParticipantResolved) []models.TournamentMatch {
	out := make([]models.TournamentMatch, 0, len(participants)*(len(participants)-1)/2)
	tID := participants[0].Participant.TournamentID
	number := 1
	for i := 0; i < len(participants); i++ {
		for j := i + 1; j < len(participants); j++ {
			p1 := participants[i].Participant.ID
			p2 := participants[j].Participant.ID
			out = append(out, models.TournamentMatch{
				ID:             uuid.NewString(),
				TournamentID:   tID,
				Round:          1,
				MatchNumber:    number,
				BracketSide:    models.TournamentBracketWinners,
				Participant1ID: &p1,
				Participant2ID: &p2,
				Status:         models.TournamentMatchStatusReady,
			})
			number++
		}
	}
	return out
}

func generateSwissRoundOneMatches(participants []repositories.TournamentParticipantResolved) []models.TournamentMatch {
	shuffled := make([]repositories.TournamentParticipantResolved, len(participants))
	copy(shuffled, participants)
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	rng.Shuffle(len(shuffled), func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	out := make([]models.TournamentMatch, 0, len(shuffled)/2+1)
	tID := participants[0].Participant.TournamentID
	matchNo := 1
	for i := 0; i < len(shuffled); i += 2 {
		p1 := shuffled[i].Participant.ID
		match := models.TournamentMatch{
			ID:             uuid.NewString(),
			TournamentID:   tID,
			Round:          1,
			MatchNumber:    matchNo,
			BracketSide:    models.TournamentBracketWinners,
			Participant1ID: &p1,
			Status:         models.TournamentMatchStatusPending,
		}
		if i+1 < len(shuffled) {
			p2 := shuffled[i+1].Participant.ID
			match.Participant2ID = &p2
			match.Status = models.TournamentMatchStatusReady
		} else {
			match.Status = models.TournamentMatchStatusBye
			match.WinnerID = &p1
		}
		out = append(out, match)
		matchNo++
	}
	return out
}

func (s *tournamentService) EnsureDefaultRoles(ctx context.Context, actorID, tournamentID string) ([]models.TournamentRole, error) {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	defaults := []models.TournamentRole{
		{TournamentID: t.ID, Code: models.TournamentRoleAdmin, Name: "Tournament Admin"},
		{TournamentID: t.ID, Code: models.TournamentRoleReferee, Name: "Referee"},
		{TournamentID: t.ID, Code: models.TournamentRoleCaster, Name: "Caster"},
		{TournamentID: t.ID, Code: models.TournamentRoleSpectator, Name: "Spectator"},
		{TournamentID: t.ID, Code: models.TournamentRolePlayer, Name: "Player"},
	}
	for i := range defaults {
		if err := s.repo.UpsertRole(ctx, &defaults[i]); err != nil {
			return nil, err
		}
	}
	roles, err := s.repo.ListRoles(ctx, t.ID)
	if err != nil {
		return nil, err
	}
	var adminRoleID string
	for i := range roles {
		if roles[i].Code == models.TournamentRoleAdmin {
			adminRoleID = roles[i].ID
			break
		}
	}
	if strings.TrimSpace(adminRoleID) != "" && strings.TrimSpace(t.CreatedBy) != "" {
		_ = s.repo.BindRole(ctx, &models.TournamentRoleBinding{
			TournamentID: t.ID,
			RoleID:       adminRoleID,
			UserID:       t.CreatedBy,
		})
	}
	return roles, nil
}

func (s *tournamentService) BindRole(ctx context.Context, actorID, tournamentID, roleCode, userID string) error {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return err
	}
	roleCode = strings.TrimSpace(roleCode)
	userID = strings.TrimSpace(userID)
	if roleCode == "" || userID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	if _, err := s.EnsureDefaultRoles(ctx, actorID, t.ID); err != nil {
		return err
	}
	role, err := s.repo.FindRoleByCode(ctx, t.ID, roleCode)
	if err != nil {
		return err
	}
	if _, err := s.userRepo.FindByID(ctx, userID); err != nil {
		return err
	}
	if err := s.repo.BindRole(ctx, &models.TournamentRoleBinding{
		TournamentID: t.ID,
		RoleID:       role.ID,
		UserID:       userID,
	}); err != nil {
		return err
	}
	return s.reseedTournamentWorkspaces(ctx, t)
}

func (s *tournamentService) UnbindRole(ctx context.Context, actorID, tournamentID, roleCode, userID string) error {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return err
	}
	role, err := s.repo.FindRoleByCode(ctx, t.ID, strings.TrimSpace(roleCode))
	if err != nil {
		return err
	}
	if err := s.repo.DeleteRoleBinding(ctx, t.ID, role.ID, strings.TrimSpace(userID)); err != nil {
		return err
	}
	return s.reseedTournamentWorkspaces(ctx, t)
}

func (s *tournamentService) reseedTournamentWorkspaces(ctx context.Context, t *models.Tournament) error {
	workspaces, err := s.repo.ListMatchWorkspaces(ctx, t.ID)
	if err != nil {
		return err
	}
	for i := range workspaces {
		match, mErr := s.repo.FindMatchByID(ctx, t.ID, workspaces[i].MatchID)
		if mErr != nil {
			continue
		}
		_ = s.seedWorkspaceMembers(ctx, t.ID, match, &workspaces[i])
		_ = s.seedRoleMembers(ctx, t.ServerID, t.ID, match, &workspaces[i])
	}
	return nil
}

func (s *tournamentService) ListRoleBindings(ctx context.Context, actorID, tournamentID string) ([]models.TournamentRoleBinding, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListRoleBindings(ctx, t.ID)
}

func (s *tournamentService) ProvisionMatchWorkspace(ctx context.Context, actorID, tournamentID, matchID string) (*models.TournamentMatchWorkspace, error) {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	if workspace, err := s.repo.FindMatchWorkspace(ctx, t.ID, matchID); err == nil {
		match, mErr := s.repo.FindMatchByID(ctx, t.ID, matchID)
		if mErr == nil {
			_ = s.seedWorkspaceMembers(ctx, t.ID, match, workspace)
			_ = s.seedRoleMembers(ctx, t.ServerID, t.ID, match, workspace)
		}
		return workspace, nil
	}
	match, err := s.repo.FindMatchByID(ctx, t.ID, matchID)
	if err != nil {
		return nil, err
	}
	if match.Participant1 == nil || match.Participant2 == nil {
		return nil, apperr.E("TOURNAMENT_INVALID_MATCH_STATUS", nil)
	}
	if _, err := s.EnsureDefaultRoles(ctx, actorID, t.ID); err != nil {
		return nil, err
	}
	category, err := s.createChannel(ctx, t.ServerID, nil, models.ChannelTypeCategory, fmt.Sprintf("match-r%d-m%d", match.Match.Round, match.Match.MatchNumber), false)
	if err != nil {
		return nil, err
	}
	parentID := category.ID
	channelSuffix := fmt.Sprintf("r%d-m%d", match.Match.Round, match.Match.MatchNumber)
	teamA, err := s.createChannel(ctx, t.ServerID, &parentID, models.ChannelTypeVoice, fmt.Sprintf("team-a-%s", channelSuffix), true)
	if err != nil {
		return nil, err
	}
	teamB, err := s.createChannel(ctx, t.ServerID, &parentID, models.ChannelTypeVoice, fmt.Sprintf("team-b-%s", channelSuffix), true)
	if err != nil {
		return nil, err
	}
	referee, err := s.createChannel(ctx, t.ServerID, &parentID, models.ChannelTypeVoice, fmt.Sprintf("referee-%s", channelSuffix), true)
	if err != nil {
		return nil, err
	}
	livestream, err := s.createChannel(ctx, t.ServerID, &parentID, models.ChannelTypeLivestream, fmt.Sprintf("live-%s", channelSuffix), false)
	if err != nil {
		return nil, err
	}
	livestreamID := livestream.ID
	workspace := &models.TournamentMatchWorkspace{
		TournamentID:      t.ID,
		MatchID:           matchID,
		ServerID:          t.ServerID,
		CategoryChannelID: category.ID,
		TeamAChannelID:    teamA.ID,
		TeamBChannelID:    teamB.ID,
		// Legacy DB columns kept for compatibility; caster/spectator channels are removed.
		CasterChannelID:     referee.ID,
		AdminChannelID:      referee.ID,
		RefereeChannelID:    referee.ID,
		SpectatorChannelID:  referee.ID,
		LivestreamChannelID: &livestreamID,
		CreatedBy:           actorID,
	}
	if err := s.repo.CreateMatchWorkspace(ctx, workspace); err != nil {
		return nil, err
	}
	_ = s.seedWorkspaceMembers(ctx, t.ID, match, workspace)
	_ = s.seedRoleMembers(ctx, t.ServerID, t.ID, match, workspace)
	return workspace, nil
}

func (s *tournamentService) ListMatchWorkspaces(ctx context.Context, actorID, tournamentID string) ([]models.TournamentMatchWorkspace, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	rows, err := s.repo.ListMatchWorkspaces(ctx, t.ID)
	if err != nil {
		return nil, err
	}
	changed := false
	for i := range rows {
		if rows[i].ArchivedAt != nil {
			continue
		}
		match, matchErr := s.repo.FindMatchByID(ctx, t.ID, rows[i].MatchID)
		if matchErr != nil {
			continue
		}
		if t.Status != models.TournamentStatusCompleted && match.Match.Status != models.TournamentMatchStatusCompleted {
			continue
		}
		if _, closeErr := s.closeMatchLiveResources(ctx, t, &match.Match, &rows[i], actorID, false); closeErr == nil {
			changed = true
		}
	}
	if changed {
		return s.repo.ListMatchWorkspaces(ctx, t.ID)
	}
	return rows, nil
}

func (s *tournamentService) createChannel(ctx context.Context, serverID string, parentID *string, channelType, name string, private bool) (*models.Channel, error) {
	maxPos, err := s.channelRepo.GetMaxPositionByParent(ctx, serverID, parentID)
	if err != nil {
		return nil, err
	}
	ch := &models.Channel{
		ServerID:  serverID,
		ParentID:  parentID,
		Type:      channelType,
		Name:      name,
		Position:  maxPos + 1,
		IsPrivate: private,
	}
	if err := s.channelRepo.Create(ctx, ch); err != nil {
		return nil, err
	}
	return ch, nil
}

func (s *tournamentService) seedWorkspaceMembers(ctx context.Context, tournamentID string, match *repositories.TournamentMatchResolved, workspace *models.TournamentMatchWorkspace) error {
	addUsers := func(channelID string, participant *repositories.TournamentParticipantResolved) {
		if participant == nil {
			return
		}
		if participant.Participant.UserID != nil && strings.TrimSpace(*participant.Participant.UserID) != "" {
			_ = s.channelRepo.AddMember(ctx, channelID, *participant.Participant.UserID)
		}
		if participant.Team != nil {
			members, err := s.repo.ListTeams(ctx, tournamentID)
			if err != nil {
				return
			}
			for i := range members {
				if members[i].Team.ID != participant.Team.ID {
					continue
				}
				for j := range members[i].Members {
					_ = s.channelRepo.AddMember(ctx, channelID, members[i].Members[j].ID)
				}
				break
			}
		}
	}
	addUsers(workspace.TeamAChannelID, match.Participant1)
	addUsers(workspace.TeamBChannelID, match.Participant2)
	return nil
}

func (s *tournamentService) seedRoleMembers(
	ctx context.Context,
	serverID string,
	tournamentID string,
	match *repositories.TournamentMatchResolved,
	workspace *models.TournamentMatchWorkspace,
) error {
	roles, err := s.repo.ListRoles(ctx, tournamentID)
	if err != nil {
		return err
	}
	bindings, err := s.repo.ListRoleBindings(ctx, tournamentID)
	if err != nil {
		return err
	}
	roleByID := map[string]string{}
	for i := range roles {
		roleByID[roles[i].ID] = roles[i].Code
	}
	for i := range bindings {
		code := roleByID[bindings[i].RoleID]
		switch code {
		case models.TournamentRoleCaster:
			// caster voice channel removed.
		case models.TournamentRoleAdmin, models.TournamentRoleReferee:
			refereeChannelID := workspace.RefereeChannelID
			if strings.TrimSpace(refereeChannelID) == "" {
				refereeChannelID = workspace.AdminChannelID
			}
			_ = s.channelRepo.AddMember(ctx, refereeChannelID, bindings[i].UserID)
			// Bridge policy: admin/referee can enter both team channels to monitor
			// player screen-share streams directly at source.
			_ = s.channelRepo.AddMember(ctx, workspace.TeamAChannelID, bindings[i].UserID)
			_ = s.channelRepo.AddMember(ctx, workspace.TeamBChannelID, bindings[i].UserID)
		case models.TournamentRoleSpectator:
			// spectator voice channel removed.
		}
	}

	playerIDs := map[string]struct{}{}
	if match != nil {
		if match.Participant1 != nil && match.Participant1.Participant.UserID != nil {
			playerIDs[*match.Participant1.Participant.UserID] = struct{}{}
		}
		if match.Participant2 != nil && match.Participant2.Participant.UserID != nil {
			playerIDs[*match.Participant2.Participant.UserID] = struct{}{}
		}
	}

	_ = serverID
	_ = playerIDs
	return nil
}

func (s *tournamentService) StartMatch(ctx context.Context, actorID, tournamentID, matchID string) (*repositories.TournamentMatchResolved, *models.TournamentMatchWorkspace, error) {
	t, err := s.mustGetTournamentForUpdate(ctx, actorID, tournamentID)
	if err != nil {
		return nil, nil, err
	}
	m, err := s.repo.FindMatchByID(ctx, t.ID, matchID)
	if err != nil {
		return nil, nil, err
	}
	if m.Match.Participant1ID == nil || m.Match.Participant2ID == nil {
		return nil, nil, apperr.E("TOURNAMENT_INVALID_MATCH_STATUS", nil)
	}
	switch m.Match.Status {
	case models.TournamentMatchStatusPending:
		m.Match.Status = models.TournamentMatchStatusReady
		if err := s.repo.UpdateMatch(ctx, &m.Match); err != nil {
			return nil, nil, err
		}
		fallthrough
	case models.TournamentMatchStatusReady:
		m.Match.Status = models.TournamentMatchStatusInProgress
		if err := s.repo.UpdateMatch(ctx, &m.Match); err != nil {
			return nil, nil, err
		}
	case models.TournamentMatchStatusInProgress:
		// already started
	default:
		return nil, nil, apperr.E("TOURNAMENT_INVALID_MATCH_STATUS", nil)
	}

	workspace, err := s.ProvisionMatchWorkspace(ctx, actorID, t.ID, m.Match.ID)
	if err != nil {
		return nil, nil, err
	}
	_ = s.autoStartMatchRecordings(ctx, actorID, t, &m.Match, workspace)
	s.publishEvent(ctx, tournamentMatchStartedTopic, map[string]any{
		"event_id":              uuid.NewString(),
		"event_type":            "TOURNAMENT_MATCH_STARTED",
		"occurred_at":           time.Now().UTC().Format(time.RFC3339),
		"tournament_id":         t.ID,
		"match_id":              m.Match.ID,
		"screen_share_required": true,
	})
	s.notifyMatchParticipants(ctx, t, &m.Match, actorID, "TOURNAMENT_MATCH_STARTED", "Tran dau da bat dau", fmt.Sprintf("Tran dau trong %s da bat dau.", t.Name), map[string]any{
		"match_id": m.Match.ID,
	})
	s.postTournamentSystemMessage(ctx, t, "TOURNAMENT_MATCH_STARTED", fmt.Sprintf("%s da bat dau.", matchDisplayName(&m.Match)), map[string]any{
		"match_id": m.Match.ID,
	})
	updated, err := s.repo.FindMatchByID(ctx, t.ID, m.Match.ID)
	if err != nil {
		return nil, nil, err
	}
	return updated, workspace, nil
}

func (s *tournamentService) autoStartMatchRecordings(
	ctx context.Context,
	actorID string,
	t *models.Tournament,
	match *models.TournamentMatch,
	workspace *models.TournamentMatchWorkspace,
) error {
	if t == nil || match == nil || workspace == nil {
		return nil
	}
	if !t.RecordingEnabled || !t.AutoStartRecordingOnMatchStart {
		return nil
	}
	type source struct {
		role      string
		channelID string
		enabled   bool
	}
	sources := []source{
		{role: "team-a", channelID: workspace.TeamAChannelID, enabled: t.RecordTeamA},
		{role: "team-b", channelID: workspace.TeamBChannelID, enabled: t.RecordTeamB},
		{role: "referee", channelID: workspace.RefereeChannelID, enabled: t.RecordReferee},
	}
	if workspace.LivestreamChannelID != nil {
		sources = append(sources, source{role: "livestream", channelID: *workspace.LivestreamChannelID, enabled: t.RecordLivestream})
	}

	for _, item := range sources {
		if !item.enabled || strings.TrimSpace(item.channelID) == "" {
			continue
		}
		if existing, err := s.recordingRepo.FindActiveByChannelAndType(ctx, item.channelID, models.RecordingTypeRoomComposite); err == nil && existing != nil {
			_ = s.createMatchRecordingRuntime(ctx, t.ID, match.ID, item.channelID, item.role, actorID, existing, nil)
			continue
		} else if !isAppErrCode(err, "RECORDING_NOT_FOUND") {
			errText := err.Error()
			_ = s.createMatchRecordingRuntime(ctx, t.ID, match.ID, item.channelID, item.role, actorID, nil, &errText)
			continue
		}

		info, err := s.egressSvc.StartRoomCompositeRecording(ctx, item.channelID)
		if err != nil {
			errText := err.Error()
			_ = s.createMatchRecordingRuntime(ctx, t.ID, match.ID, item.channelID, item.role, actorID, nil, &errText)
			continue
		}
		now := time.Now().Unix()
		recording := &models.Recording{
			ChannelID: item.channelID,
			ServerID:  t.ServerID,
			StartedBy: actorID,
			EgressID:  info.GetEgressId(),
			Type:      models.RecordingTypeRoomComposite,
			Status:    models.RecordingStatusActive,
			StartedAt: now,
		}
		if err := s.recordingRepo.Create(ctx, recording); err != nil {
			errText := err.Error()
			_ = s.createMatchRecordingRuntime(ctx, t.ID, match.ID, item.channelID, item.role, actorID, nil, &errText)
			continue
		}
		_ = s.createMatchRecordingRuntime(ctx, t.ID, match.ID, item.channelID, item.role, actorID, recording, nil)
	}
	return nil
}

func (s *tournamentService) createMatchRecordingRuntime(
	ctx context.Context,
	tournamentID string,
	matchID string,
	channelID string,
	sourceRole string,
	startedBy string,
	recording *models.Recording,
	startErr *string,
) error {
	now := time.Now().Unix()
	status := models.RecordingStatusActive
	var recordingID *string
	startedAt := now
	if recording != nil {
		recordingID = &recording.ID
		startedAt = recording.StartedAt
		status = recording.Status
	}
	if startErr != nil {
		status = models.RecordingStatusFailed
	}
	return s.repo.CreateMatchRecording(ctx, &models.TournamentMatchRecording{
		TournamentID: tournamentID,
		MatchID:      matchID,
		ChannelID:    channelID,
		SourceRole:   sourceRole,
		RecordingID:  recordingID,
		Status:       status,
		StartedBy:    startedBy,
		StartedAt:    startedAt,
		Error:        startErr,
	})
}

func (s *tournamentService) CloseMatchLive(ctx context.Context, actorID, tournamentID, matchID string) (*services.TournamentCloseLiveResult, error) {
	t, err := s.mustGetTournamentForLiveClose(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	match, err := s.repo.FindMatchByID(ctx, t.ID, matchID)
	if err != nil {
		return nil, err
	}
	workspace, err := s.repo.FindMatchWorkspace(ctx, t.ID, matchID)
	if err != nil {
		return nil, err
	}
	return s.closeMatchLiveResources(ctx, t, &match.Match, workspace, actorID, true)
}

func (s *tournamentService) closeMatchLiveIfPresent(ctx context.Context, t *models.Tournament, match *models.TournamentMatch, actorID string) error {
	if t == nil || match == nil {
		return nil
	}
	workspace, err := s.repo.FindMatchWorkspace(ctx, t.ID, match.ID)
	if err != nil {
		if isAppErrCode(err, "TOURNAMENT_WORKSPACE_NOT_FOUND") {
			return nil
		}
		return err
	}
	_, err = s.closeMatchLiveResources(ctx, t, match, workspace, actorID, false)
	return err
}

func (s *tournamentService) closeTournamentLiveWorkspaces(ctx context.Context, t *models.Tournament, actorID string) error {
	if t == nil {
		return nil
	}
	workspaces, err := s.repo.ListMatchWorkspaces(ctx, t.ID)
	if err != nil {
		return err
	}
	for i := range workspaces {
		match, matchErr := s.repo.FindMatchByID(ctx, t.ID, workspaces[i].MatchID)
		if matchErr != nil {
			continue
		}
		_, _ = s.closeMatchLiveResources(ctx, t, &match.Match, &workspaces[i], actorID, false)
	}
	return nil
}

func (s *tournamentService) closeMatchLiveResources(
	ctx context.Context,
	t *models.Tournament,
	match *models.TournamentMatch,
	workspace *models.TournamentMatchWorkspace,
	actorID string,
	strict bool,
) (*services.TournamentCloseLiveResult, error) {
	result := &services.TournamentCloseLiveResult{
		Recordings:     []models.Recording{},
		StoppedStreams: []models.Recording{},
	}
	if workspace == nil {
		return result, nil
	}
	seenChannels := map[string]struct{}{}
	for _, channelID := range []string{
		workspace.TeamAChannelID,
		workspace.TeamBChannelID,
		workspace.CasterChannelID,
		workspace.AdminChannelID,
		workspace.RefereeChannelID,
		workspace.SpectatorChannelID,
	} {
		channelID = strings.TrimSpace(channelID)
		if channelID == "" {
			continue
		}
		if _, ok := seenChannels[channelID]; ok {
			continue
		}
		seenChannels[channelID] = struct{}{}
		if recording, stopErr := s.stopActiveRecordingByType(ctx, channelID, models.RecordingTypeRoomComposite); stopErr == nil && recording != nil {
			result.Recordings = append(result.Recordings, *recording)
			_ = s.markMatchRecordingRuntimeStopped(ctx, workspace.MatchID, channelID, recording)
		} else if stopErr != nil && !isAppErrCode(stopErr, "RECORDING_NOT_FOUND") && strict {
			return nil, stopErr
		}
	}
	if workspace.LivestreamChannelID != nil && strings.TrimSpace(*workspace.LivestreamChannelID) != "" {
		channelID := strings.TrimSpace(*workspace.LivestreamChannelID)
		if recording, stopErr := s.stopActiveRecordingByType(ctx, channelID, models.RecordingTypeRoomComposite); stopErr == nil && recording != nil {
			result.Recordings = append(result.Recordings, *recording)
			_ = s.markMatchRecordingRuntimeStopped(ctx, workspace.MatchID, channelID, recording)
		} else if stopErr != nil && !isAppErrCode(stopErr, "RECORDING_NOT_FOUND") && strict {
			return nil, stopErr
		}
		if stream, stopErr := s.stopActiveRecordingByType(ctx, channelID, models.RecordingTypeRTMP); stopErr == nil && stream != nil {
			result.StoppedStreams = append(result.StoppedStreams, *stream)
			_ = s.markMatchRecordingRuntimeStopped(ctx, workspace.MatchID, channelID, stream)
		} else if stopErr != nil && !isAppErrCode(stopErr, "RECORDING_NOT_FOUND") && strict {
			return nil, stopErr
		}
	}
	if err := s.archiveMatchWorkspace(ctx, workspace, actorID); err != nil {
		return nil, err
	}
	result.Workspace = workspace
	if t != nil && match != nil {
		s.postTournamentSystemMessage(ctx, t, "TOURNAMENT_MATCH_LIVE_CLOSED", fmt.Sprintf("%s da duoc dong live va chuyen sang luu tru.", matchDisplayName(match)), map[string]any{
			"match_id": match.ID,
		})
	}
	return result, nil
}

func (s *tournamentService) stopActiveRecordingByType(ctx context.Context, channelID, recordingType string) (*models.Recording, error) {
	recording, err := s.recordingRepo.FindActiveByChannelAndType(ctx, channelID, recordingType)
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

func (s *tournamentService) markMatchRecordingRuntimeStopped(ctx context.Context, matchID, channelID string, recording *models.Recording) error {
	rows, err := s.repo.ListActiveMatchRecordingsByChannel(ctx, matchID, channelID)
	if err != nil {
		return err
	}
	now := time.Now().Unix()
	for i := range rows {
		if rows[i].RecordingID != nil && recording != nil && *rows[i].RecordingID != recording.ID {
			continue
		}
		rows[i].Status = models.RecordingStatusCompleted
		if recording != nil {
			rows[i].Status = recording.Status
		}
		rows[i].StoppedAt = &now
		_ = s.repo.UpdateMatchRecording(ctx, &rows[i])
	}
	return nil
}

func (s *tournamentService) archiveMatchWorkspace(ctx context.Context, workspace *models.TournamentMatchWorkspace, actorID string) error {
	if workspace == nil {
		return nil
	}
	now := time.Now().Unix()
	if workspace.ArchivedAt == nil {
		workspace.ArchivedAt = &now
	}
	closedBy := strings.TrimSpace(actorID)
	if closedBy != "" {
		workspace.ClosedBy = &closedBy
	}
	for _, channelID := range []string{
		workspace.TeamAChannelID,
		workspace.TeamBChannelID,
		workspace.CasterChannelID,
		workspace.AdminChannelID,
		workspace.RefereeChannelID,
		workspace.SpectatorChannelID,
	} {
		channelID = strings.TrimSpace(channelID)
		if channelID == "" {
			continue
		}
		_ = s.channelRepo.SoftDelete(ctx, channelID)
	}
	return s.repo.UpdateMatchWorkspace(ctx, workspace)
}

func (s *tournamentService) GenerateMatchObserverTokens(ctx context.Context, actorID, tournamentID, matchID string) (*services.TournamentObserverTokenBundle, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	if !s.canUseObserverMode(ctx, t, actorID) {
		return nil, apperr.E("TOURNAMENT_FORBIDDEN", nil)
	}

	if _, err := s.repo.FindMatchByID(ctx, t.ID, matchID); err != nil {
		return nil, err
	}
	workspace, err := s.repo.FindMatchWorkspace(ctx, t.ID, matchID)
	if err != nil {
		return nil, err
	}

	actor, err := s.userRepo.FindByID(ctx, actorID)
	if err != nil {
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

	buildToken := func(channelID string) (services.TournamentObserverToken, error) {
		token, tkErr := s.liveKitSvc.GenerateAccessTokenWithGrant(
			channelID,
			actorID,
			actor.Username,
			string(metadataBytes),
			false,
			true,
		)
		if tkErr != nil {
			return services.TournamentObserverToken{}, tkErr
		}
		return services.TournamentObserverToken{
			ChannelID: channelID,
			Token:     token,
			URL:       global.Config.LiveKit.URL,
		}, nil
	}

	teamA, err := buildToken(workspace.TeamAChannelID)
	if err != nil {
		return nil, err
	}
	teamB, err := buildToken(workspace.TeamBChannelID)
	if err != nil {
		return nil, err
	}
	return &services.TournamentObserverTokenBundle{
		TeamA: teamA,
		TeamB: teamB,
	}, nil
}

func (s *tournamentService) canOperateParticipant(actorID string, tournament *models.Tournament, participant *repositories.TournamentParticipantResolved) bool {
	if actorID == tournament.CreatedBy {
		return true
	}
	if participant.Participant.UserID != nil && *participant.Participant.UserID == actorID {
		return true
	}
	if participant.Team != nil && participant.Team.CaptainID == actorID {
		return true
	}
	return false
}

func (s *tournamentService) canUseObserverMode(ctx context.Context, tournament *models.Tournament, actorID string) bool {
	if actorID == tournament.CreatedBy {
		return true
	}
	ok, err := s.serverRepo.HasPermission(ctx, tournament.ServerID, actorID, models.PermissionManageChannels)
	if err == nil && ok {
		return true
	}
	roles, err := s.repo.ListRoles(ctx, tournament.ID)
	if err != nil {
		return false
	}
	roleByID := make(map[string]string, len(roles))
	for i := range roles {
		roleByID[roles[i].ID] = roles[i].Code
	}
	bindings, err := s.repo.ListRoleBindings(ctx, tournament.ID)
	if err != nil {
		return false
	}
	for i := range bindings {
		if bindings[i].UserID != actorID {
			continue
		}
		code := roleByID[bindings[i].RoleID]
		if code == models.TournamentRoleAdmin || code == models.TournamentRoleReferee || code == models.TournamentRoleCaster {
			return true
		}
	}
	return false
}

func (s *tournamentService) mustGetTournamentForMember(ctx context.Context, actorID, tournamentID string) (*models.Tournament, error) {
	actorID = strings.TrimSpace(actorID)
	tournamentID = strings.TrimSpace(tournamentID)
	if actorID == "" || tournamentID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	t, err := s.repo.FindTournamentByID(ctx, tournamentID)
	if err != nil {
		return nil, err
	}
	if _, err := s.serverRepo.FindMember(ctx, t.ServerID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}
	return t, nil
}

func (s *tournamentService) mustGetTournamentForUpdate(ctx context.Context, actorID, tournamentID string) (*models.Tournament, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	if actorID == t.CreatedBy {
		return t, nil
	}
	ok, err := s.serverRepo.HasPermission(ctx, t.ServerID, actorID, models.PermissionManageChannels)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, apperr.E("TOURNAMENT_FORBIDDEN", nil)
	}
	return t, nil
}

func (s *tournamentService) mustGetTournamentForLiveClose(ctx context.Context, actorID, tournamentID string) (*models.Tournament, error) {
	t, err := s.mustGetTournamentForMember(ctx, actorID, tournamentID)
	if err != nil {
		return nil, err
	}
	if !s.canUseObserverMode(ctx, t, actorID) {
		return nil, apperr.E("TOURNAMENT_FORBIDDEN", nil)
	}
	return t, nil
}

func (s *tournamentService) ensureServerPermission(ctx context.Context, actorID, serverID string) error {
	if _, err := s.serverRepo.FindMember(ctx, serverID, actorID); err != nil {
		return apperr.E("NOT_SERVER_MEMBER", err)
	}
	ok, err := s.serverRepo.HasPermission(ctx, serverID, actorID, models.PermissionManageChannels)
	if err != nil {
		return err
	}
	if !ok {
		return apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	return nil
}

func (s *tournamentService) notifyTournamentParticipants(ctx context.Context, t *models.Tournament, actorID, eventType, title, body string, data map[string]any) {
	if s.notifySvc == nil || t == nil {
		return
	}
	participants, err := s.repo.ListParticipants(ctx, t.ID)
	if err != nil {
		return
	}
	seen := map[string]struct{}{}
	for i := range participants {
		for _, userID := range s.participantUserIDs(ctx, participants[i]) {
			if userID == "" || userID == actorID {
				continue
			}
			if _, ok := seen[userID]; ok {
				continue
			}
			seen[userID] = struct{}{}
			s.notifyTournamentUser(ctx, t, userID, eventType, title, body, data, actorID)
		}
	}
}

func (s *tournamentService) notifyTournamentParticipantsByStatus(ctx context.Context, t *models.Tournament, actorID string, includeActor bool, statuses []string, eventType, title, body string, data map[string]any) {
	if s.notifySvc == nil || t == nil || len(statuses) == 0 {
		return
	}
	allowed := map[string]struct{}{}
	for _, status := range statuses {
		status = strings.TrimSpace(status)
		if status != "" {
			allowed[status] = struct{}{}
		}
	}
	if len(allowed) == 0 {
		return
	}
	participants, err := s.repo.ListParticipants(ctx, t.ID)
	if err != nil {
		return
	}
	seen := map[string]struct{}{}
	for i := range participants {
		if _, ok := allowed[participants[i].Participant.Status]; !ok {
			continue
		}
		for _, userID := range s.participantUserIDs(ctx, participants[i]) {
			if userID == "" || (!includeActor && userID == actorID) {
				continue
			}
			if _, ok := seen[userID]; ok {
				continue
			}
			seen[userID] = struct{}{}
			excludedActorID := actorID
			if includeActor {
				excludedActorID = ""
			}
			s.notifyTournamentUser(ctx, t, userID, eventType, title, body, data, excludedActorID)
		}
	}
}

func (s *tournamentService) notifyMatchParticipants(ctx context.Context, t *models.Tournament, match *models.TournamentMatch, actorID, eventType, title, body string, data map[string]any) {
	if s.notifySvc == nil || t == nil || match == nil {
		return
	}
	participantIDs := []string{}
	if match.Participant1ID != nil {
		participantIDs = append(participantIDs, *match.Participant1ID)
	}
	if match.Participant2ID != nil {
		participantIDs = append(participantIDs, *match.Participant2ID)
	}
	seen := map[string]struct{}{}
	for _, participantID := range participantIDs {
		participant, err := s.repo.FindParticipantByID(ctx, t.ID, participantID)
		if err != nil {
			continue
		}
		for _, userID := range s.participantUserIDs(ctx, *participant) {
			if userID == "" || userID == actorID {
				continue
			}
			if _, ok := seen[userID]; ok {
				continue
			}
			seen[userID] = struct{}{}
			s.notifyTournamentUser(ctx, t, userID, eventType, title, body, data, actorID)
		}
	}
}

func (s *tournamentService) participantUserIDs(ctx context.Context, participant repositories.TournamentParticipantResolved) []string {
	if participant.User != nil {
		return []string{participant.User.ID}
	}
	if participant.Team != nil {
		members, err := s.repo.ListTeamMembers(ctx, participant.Team.ID)
		if err != nil {
			return nil
		}
		userIDs := make([]string, 0, len(members))
		for i := range members {
			userIDs = append(userIDs, members[i].ID)
		}
		return userIDs
	}
	return nil
}

func (s *tournamentService) notifyTournamentUser(ctx context.Context, t *models.Tournament, userID, eventType, title, body string, data map[string]any, actorID string) {
	if s.notifySvc == nil || t == nil {
		return
	}
	userID = strings.TrimSpace(userID)
	if userID == "" || userID == strings.TrimSpace(actorID) {
		return
	}
	payload := map[string]any{
		"event_type":      eventType,
		"title":           title,
		"body":            body,
		"tournament_id":   t.ID,
		"tournament_name": t.Name,
		"server_id":       t.ServerID,
	}
	for key, value := range data {
		payload[key] = value
	}
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return
	}
	metadata, _ := json.Marshal(map[string]any{
		"category":      "tournament",
		"tournament_id": t.ID,
	})
	_, _ = s.notifySvc.Dispatch(
		ctx,
		userID,
		models.NotificationSourceTypeSystem,
		eventType,
		models.NotificationPriorityNormal,
		"tournament",
		rawPayload,
		metadata,
	)
}

func tournamentStatusNotificationTitle(status string) string {
	switch status {
	case models.TournamentStatusRegistration:
		return "Giai dau mo dang ky"
	case models.TournamentStatusCheckIn:
		return "Da den giai doan check-in"
	case models.TournamentStatusInProgress:
		return "Giai dau da bat dau"
	case models.TournamentStatusCompleted:
		return "Giai dau da ket thuc"
	case models.TournamentStatusCancelled:
		return "Giai dau da bi huy"
	default:
		return "Giai dau da cap nhat"
	}
}

func tournamentStatusNotificationBody(t *models.Tournament) string {
	if t == nil {
		return "Giai dau vua duoc cap nhat."
	}
	switch t.Status {
	case models.TournamentStatusCheckIn:
		return fmt.Sprintf("%s da mo check-in. Hay vao giai dau de xac nhan tham gia.", t.Name)
	case models.TournamentStatusInProgress:
		return fmt.Sprintf("%s da bat dau. Hay theo doi lich thi dau cua ban.", t.Name)
	case models.TournamentStatusCompleted:
		return fmt.Sprintf("%s da ket thuc.", t.Name)
	case models.TournamentStatusCancelled:
		return fmt.Sprintf("%s da bi huy.", t.Name)
	default:
		return fmt.Sprintf("%s vua chuyen sang trang thai %s.", t.Name, t.Status)
	}
}

func tournamentStatusSystemMessage(t *models.Tournament) string {
	if t == nil {
		return "Giai dau vua duoc cap nhat."
	}
	switch t.Status {
	case models.TournamentStatusRegistration:
		return fmt.Sprintf("%s da mo dang ky.", t.Name)
	case models.TournamentStatusCheckIn:
		return fmt.Sprintf("%s da chuyen sang giai doan check-in. Cac tuyen thu da dang ky hay xac nhan tham gia.", t.Name)
	case models.TournamentStatusInProgress:
		return fmt.Sprintf("%s da bat dau.", t.Name)
	case models.TournamentStatusCompleted:
		return fmt.Sprintf("%s da ket thuc.", t.Name)
	case models.TournamentStatusCancelled:
		return fmt.Sprintf("%s da bi huy.", t.Name)
	default:
		return fmt.Sprintf("%s vua chuyen sang trang thai %s.", t.Name, t.Status)
	}
}

func matchDisplayName(match *models.TournamentMatch) string {
	if match == nil {
		return "Tran dau"
	}
	return fmt.Sprintf("Tran dau vong %d - match %d", match.Round, match.MatchNumber)
}

func (s *tournamentService) participantNameByID(ctx context.Context, t *models.Tournament, participantID string) string {
	if t == nil || strings.TrimSpace(participantID) == "" {
		return "chua ro"
	}
	p, err := s.repo.FindParticipantByID(ctx, t.ID, participantID)
	if err != nil {
		return "chua ro"
	}
	return participantDisplayName(p)
}

func participantDisplayName(row *repositories.TournamentParticipantResolved) string {
	if row == nil {
		return "Mot nguoi choi"
	}
	if row.User != nil && strings.TrimSpace(row.User.Username) != "" {
		return row.User.Username
	}
	if row.Team != nil && strings.TrimSpace(row.Team.Name) != "" {
		return row.Team.Name
	}
	return "Mot nguoi choi"
}

func (s *tournamentService) publishEvent(ctx context.Context, topic string, payload map[string]any) {
	if s.publisher == nil {
		return
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return
	}
	idAny, _ := payload["event_id"].(string)
	if strings.TrimSpace(idAny) == "" {
		idAny = uuid.NewString()
	}
	msg := message.NewMessage(idAny, body)
	msg.SetContext(ctx)
	_ = s.publisher.Publish(topic, msg)
}

func isValidFormat(v string) bool {
	switch v {
	case models.TournamentFormatSingleElimination,
		models.TournamentFormatDoubleElimination,
		models.TournamentFormatRoundRobin,
		models.TournamentFormatSwiss:
		return true
	default:
		return false
	}
}

func isValidParticipantType(v string) bool {
	return v == models.TournamentParticipantTypeSolo || v == models.TournamentParticipantTypeTeam
}

func isValidTournamentStatus(v string) bool {
	switch v {
	case models.TournamentStatusDraft,
		models.TournamentStatusRegistration,
		models.TournamentStatusCheckIn,
		models.TournamentStatusInProgress,
		models.TournamentStatusCompleted,
		models.TournamentStatusCancelled:
		return true
	default:
		return false
	}
}

func canTransitionStatus(current, target string) bool {
	if target == models.TournamentStatusCancelled {
		return current != models.TournamentStatusCompleted
	}
	switch current {
	case models.TournamentStatusDraft:
		return target == models.TournamentStatusRegistration
	case models.TournamentStatusRegistration:
		return target == models.TournamentStatusCheckIn
	case models.TournamentStatusCheckIn:
		return target == models.TournamentStatusInProgress
	case models.TournamentStatusInProgress:
		return target == models.TournamentStatusCompleted
	default:
		return false
	}
}

func canTransitionMatchStatus(current, target string) bool {
	switch current {
	case models.TournamentMatchStatusPending:
		return target == models.TournamentMatchStatusReady
	case models.TournamentMatchStatusReady:
		return target == models.TournamentMatchStatusInProgress
	case models.TournamentMatchStatusInProgress:
		return target == models.TournamentMatchStatusCompleted
	default:
		return false
	}
}
