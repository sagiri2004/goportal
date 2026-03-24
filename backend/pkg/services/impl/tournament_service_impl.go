package impl

import (
	"context"
	"encoding/json"
	"math"
	"math/rand"
	"slices"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/google/uuid"
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
)

type tournamentService struct {
	repo       repositories.TournamentRepository
	serverRepo repositories.ServerRepository
	userRepo   repositories.UserRepository
	publisher  message.Publisher
}

func NewTournamentService(
	repo repositories.TournamentRepository,
	serverRepo repositories.ServerRepository,
	userRepo repositories.UserRepository,
	publisher message.Publisher,
) services.TournamentService {
	return &tournamentService{
		repo:       repo,
		serverRepo: serverRepo,
		userRepo:   userRepo,
		publisher:  publisher,
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
		ServerID:               input.ServerID,
		Name:                   input.Name,
		Description:            input.Description,
		Game:                   input.Game,
		Format:                 input.Format,
		Status:                 models.TournamentStatusDraft,
		MaxParticipants:        input.MaxParticipants,
		ParticipantType:        input.ParticipantType,
		TeamSize:               input.TeamSize,
		RegistrationDeadline:   input.RegistrationDeadline,
		CheckInDurationMinutes: checkIn,
		PrizePool:              input.PrizePool,
		Rules:                  input.Rules,
		CreatedBy:              actorID,
	}
	if err := s.repo.CreateTournament(ctx, t); err != nil {
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
	s.publishEvent(ctx, tournamentStatusChangedTopic, map[string]any{
		"event_id":      uuid.NewString(),
		"event_type":    "TOURNAMENT_STATUS_CHANGED",
		"occurred_at":   time.Now().UTC().Format(time.RFC3339),
		"tournament_id": t.ID,
		"server_id":     t.ServerID,
		"status":        t.Status,
	})
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
	if t.RegistrationDeadline != nil && time.Now().Unix() > *t.RegistrationDeadline {
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
		}
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
	return s.repo.AddTeamMember(ctx, &models.TournamentTeamMember{
		TeamID:   team.ID,
		UserID:   userID,
		JoinedAt: time.Now().Unix(),
	})
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
		s.publishEvent(ctx, tournamentMatchStartedTopic, map[string]any{
			"event_id":      uuid.NewString(),
			"event_type":    "TOURNAMENT_MATCH_STARTED",
			"occurred_at":   time.Now().UTC().Format(time.RFC3339),
			"tournament_id": t.ID,
			"match_id":      m.Match.ID,
		})
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
	s.publishEvent(ctx, tournamentBracketUpdatedTopic, map[string]any{
		"event_id":      uuid.NewString(),
		"event_type":    "TOURNAMENT_BRACKET_UPDATED",
		"occurred_at":   time.Now().UTC().Format(time.RFC3339),
		"tournament_id": t.ID,
	})
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
