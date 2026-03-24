package serializers

import (
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
)

type CreateTournamentRequest struct {
	Name                   string  `json:"name" binding:"required"`
	Description            *string `json:"description"`
	Game                   string  `json:"game" binding:"required"`
	Format                 string  `json:"format" binding:"required"`
	MaxParticipants        int     `json:"max_participants" binding:"required"`
	ParticipantType        string  `json:"participant_type" binding:"required"`
	TeamSize               *int    `json:"team_size"`
	RegistrationDeadline   *int64  `json:"registration_deadline"`
	CheckInDurationMinutes *int    `json:"check_in_duration_minutes"`
	PrizePool              *string `json:"prize_pool"`
	Rules                  *string `json:"rules"`
}

type UpdateTournamentRequest struct {
	Name                 *string `json:"name"`
	Description          *string `json:"description"`
	Rules                *string `json:"rules"`
	PrizePool            *string `json:"prize_pool"`
	MaxParticipants      *int    `json:"max_participants"`
	RegistrationDeadline *int64  `json:"registration_deadline"`
}

type UpdateTournamentStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

type TournamentResponse struct {
	ID                     string  `json:"id"`
	ServerID               string  `json:"server_id"`
	Name                   string  `json:"name"`
	Description            *string `json:"description,omitempty"`
	Game                   string  `json:"game"`
	Format                 string  `json:"format"`
	Status                 string  `json:"status"`
	MaxParticipants        int     `json:"max_participants"`
	ParticipantType        string  `json:"participant_type"`
	TeamSize               *int    `json:"team_size,omitempty"`
	RegistrationDeadline   *int64  `json:"registration_deadline,omitempty"`
	CheckInDurationMinutes int     `json:"check_in_duration_minutes"`
	PrizePool              *string `json:"prize_pool,omitempty"`
	Rules                  *string `json:"rules,omitempty"`
	CreatedBy              string  `json:"created_by"`
	StartedAt              *int64  `json:"started_at,omitempty"`
	CompletedAt            *int64  `json:"completed_at,omitempty"`
	CreatedAt              int64   `json:"created_at"`
	UpdatedAt              int64   `json:"updated_at"`
}

func NewTournamentResponse(t *models.Tournament) TournamentResponse {
	return TournamentResponse{
		ID:                     t.ID,
		ServerID:               t.ServerID,
		Name:                   t.Name,
		Description:            t.Description,
		Game:                   t.Game,
		Format:                 t.Format,
		Status:                 t.Status,
		MaxParticipants:        t.MaxParticipants,
		ParticipantType:        t.ParticipantType,
		TeamSize:               t.TeamSize,
		RegistrationDeadline:   t.RegistrationDeadline,
		CheckInDurationMinutes: t.CheckInDurationMinutes,
		PrizePool:              t.PrizePool,
		Rules:                  t.Rules,
		CreatedBy:              t.CreatedBy,
		StartedAt:              t.StartedAt,
		CompletedAt:            t.CompletedAt,
		CreatedAt:              t.CreatedAt,
		UpdatedAt:              t.UpdatedAt,
	}
}

type TournamentListResponse struct {
	Items []TournamentResponse `json:"items"`
	Total int64                `json:"total"`
	Page  int                  `json:"page"`
	Limit int                  `json:"limit"`
}

type TournamentParticipantResponse struct {
	ID           string                         `json:"id"`
	User         *UserResponse                  `json:"user,omitempty"`
	Team         *TournamentTeamSummaryResponse `json:"team,omitempty"`
	Seed         *int                           `json:"seed,omitempty"`
	Status       string                         `json:"status"`
	FinalRank    *int                           `json:"final_rank,omitempty"`
	RegisteredAt int64                          `json:"registered_at"`
	CheckedInAt  *int64                         `json:"checked_in_at,omitempty"`
}

type TournamentTeamSummaryResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CaptainID string `json:"captain_id"`
}

func NewTournamentParticipantResponse(p repositories.TournamentParticipantResolved) TournamentParticipantResponse {
	var user *UserResponse
	if p.User != nil {
		u := NewUserResponse(p.User)
		user = &u
	}
	var team *TournamentTeamSummaryResponse
	if p.Team != nil {
		team = &TournamentTeamSummaryResponse{
			ID:        p.Team.ID,
			Name:      p.Team.Name,
			CaptainID: p.Team.CaptainID,
		}
	}
	return TournamentParticipantResponse{
		ID:           p.Participant.ID,
		User:         user,
		Team:         team,
		Seed:         p.Participant.Seed,
		Status:       p.Participant.Status,
		FinalRank:    p.Participant.FinalRank,
		RegisteredAt: p.Participant.RegisteredAt,
		CheckedInAt:  p.Participant.CheckedInAt,
	}
}

type TournamentDetailResponse struct {
	Tournament       TournamentResponse              `json:"tournament"`
	ParticipantCount int64                           `json:"participant_count"`
	Participants     []TournamentParticipantResponse `json:"participants"`
}

type CreateTournamentTeamRequest struct {
	Name string `json:"name" binding:"required"`
}

type AddTournamentTeamMemberRequest struct {
	UserID string `json:"user_id" binding:"required"`
}

type TournamentTeamResponse struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	CaptainID string         `json:"captain_id"`
	CreatedAt int64          `json:"created_at"`
	Members   []UserResponse `json:"members"`
}

type TournamentSeedRequest struct {
	Seed int `json:"seed" binding:"required"`
}

type BulkTournamentParticipantsRequest struct {
	UserIDs []string `json:"user_ids" binding:"required"`
}

type TournamentMatchResponse struct {
	ID               string                         `json:"id"`
	TournamentID     string                         `json:"tournament_id"`
	Round            int                            `json:"round"`
	MatchNumber      int                            `json:"match_number"`
	BracketSide      string                         `json:"bracket_side"`
	Participant1     *TournamentParticipantResponse `json:"participant1,omitempty"`
	Participant2     *TournamentParticipantResponse `json:"participant2,omitempty"`
	Score1           *int                           `json:"score1,omitempty"`
	Score2           *int                           `json:"score2,omitempty"`
	Winner           *TournamentParticipantResponse `json:"winner,omitempty"`
	Status           string                         `json:"status"`
	NextMatchID      *string                        `json:"next_match_id,omitempty"`
	LoserNextMatchID *string                        `json:"loser_next_match_id,omitempty"`
	ScheduledAt      *int64                         `json:"scheduled_at,omitempty"`
	CompletedAt      *int64                         `json:"completed_at,omitempty"`
	CreatedAt        int64                          `json:"created_at"`
}

func NewTournamentMatchResponse(m repositories.TournamentMatchResolved) TournamentMatchResponse {
	var p1 *TournamentParticipantResponse
	if m.Participant1 != nil {
		v := NewTournamentParticipantResponse(*m.Participant1)
		p1 = &v
	}
	var p2 *TournamentParticipantResponse
	if m.Participant2 != nil {
		v := NewTournamentParticipantResponse(*m.Participant2)
		p2 = &v
	}
	var winner *TournamentParticipantResponse
	if m.Winner != nil {
		v := NewTournamentParticipantResponse(*m.Winner)
		winner = &v
	}
	return TournamentMatchResponse{
		ID:               m.Match.ID,
		TournamentID:     m.Match.TournamentID,
		Round:            m.Match.Round,
		MatchNumber:      m.Match.MatchNumber,
		BracketSide:      m.Match.BracketSide,
		Participant1:     p1,
		Participant2:     p2,
		Score1:           m.Match.Score1,
		Score2:           m.Match.Score2,
		Winner:           winner,
		Status:           m.Match.Status,
		NextMatchID:      m.Match.NextMatchID,
		LoserNextMatchID: m.Match.LoserNextMatchID,
		ScheduledAt:      m.Match.ScheduledAt,
		CompletedAt:      m.Match.CompletedAt,
		CreatedAt:        m.Match.CreatedAt,
	}
}

type UpdateTournamentMatchStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

type ReportTournamentMatchResultRequest struct {
	WinnerID      string  `json:"winner_id" binding:"required"`
	Score1        int     `json:"score1" binding:"required"`
	Score2        int     `json:"score2" binding:"required"`
	ScreenshotURL *string `json:"screenshot_url"`
}

type OverrideTournamentMatchRequest struct {
	WinnerID string `json:"winner_id" binding:"required"`
	Score1   int    `json:"score1" binding:"required"`
	Score2   int    `json:"score2" binding:"required"`
	Reason   string `json:"reason" binding:"required"`
}

type TournamentMatchReportResponse struct {
	ID            string  `json:"id"`
	MatchID       string  `json:"match_id"`
	ReportedBy    string  `json:"reported_by"`
	WinnerID      *string `json:"winner_id,omitempty"`
	Score1        int     `json:"score1"`
	Score2        int     `json:"score2"`
	ScreenshotURL *string `json:"screenshot_url,omitempty"`
	Status        string  `json:"status"`
	CreatedAt     int64   `json:"created_at"`
}

func NewTournamentMatchReportResponse(r *models.TournamentMatchReport) TournamentMatchReportResponse {
	return TournamentMatchReportResponse{
		ID:            r.ID,
		MatchID:       r.MatchID,
		ReportedBy:    r.ReportedBy,
		WinnerID:      r.WinnerID,
		Score1:        r.Score1,
		Score2:        r.Score2,
		ScreenshotURL: r.ScreenshotURL,
		Status:        r.Status,
		CreatedAt:     r.CreatedAt,
	}
}
