package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	TournamentFormatSingleElimination = "single_elimination"
	TournamentFormatDoubleElimination = "double_elimination"
	TournamentFormatRoundRobin        = "round_robin"
	TournamentFormatSwiss             = "swiss"
)

const (
	TournamentStatusDraft        = "draft"
	TournamentStatusRegistration = "registration"
	TournamentStatusCheckIn      = "check_in"
	TournamentStatusInProgress   = "in_progress"
	TournamentStatusCompleted    = "completed"
	TournamentStatusCancelled    = "cancelled"
)

const (
	TournamentParticipantTypeSolo = "solo"
	TournamentParticipantTypeTeam = "team"
)

const (
	TournamentParticipantStatusRegistered   = "registered"
	TournamentParticipantStatusCheckedIn    = "checked_in"
	TournamentParticipantStatusEliminated   = "eliminated"
	TournamentParticipantStatusWinner       = "winner"
	TournamentParticipantStatusDisqualified = "disqualified"
)

const (
	TournamentBracketWinners    = "winners"
	TournamentBracketLosers     = "losers"
	TournamentBracketGrandFinal = "grand_final"
)

const (
	TournamentMatchStatusPending    = "pending"
	TournamentMatchStatusReady      = "ready"
	TournamentMatchStatusInProgress = "in_progress"
	TournamentMatchStatusCompleted  = "completed"
	TournamentMatchStatusBye        = "bye"
)

const (
	TournamentReportStatusPending   = "pending"
	TournamentReportStatusConfirmed = "confirmed"
	TournamentReportStatusDisputed  = "disputed"
)

type Tournament struct {
	ID                     string  `gorm:"type:char(36);primaryKey" json:"id"`
	ServerID               string  `gorm:"type:char(36);not null;index" json:"server_id"`
	Name                   string  `gorm:"type:varchar(255);not null" json:"name"`
	Description            *string `gorm:"type:text" json:"description,omitempty"`
	Game                   string  `gorm:"type:varchar(255);not null" json:"game"`
	Format                 string  `gorm:"type:varchar(32);not null" json:"format"`
	Status                 string  `gorm:"type:varchar(32);not null;default:'draft';index" json:"status"`
	MaxParticipants        int     `gorm:"not null" json:"max_participants"`
	ParticipantType        string  `gorm:"type:varchar(16);not null" json:"participant_type"`
	TeamSize               *int    `gorm:"type:int" json:"team_size,omitempty"`
	RegistrationDeadline   *int64  `gorm:"type:bigint" json:"registration_deadline,omitempty"`
	CheckInDurationMinutes int     `gorm:"not null;default:15" json:"check_in_duration_minutes"`
	PrizePool              *string `gorm:"type:text" json:"prize_pool,omitempty"`
	Rules                  *string `gorm:"type:text" json:"rules,omitempty"`
	CreatedBy              string  `gorm:"type:char(36);not null;index" json:"created_by"`
	StartedAt              *int64  `gorm:"type:bigint" json:"started_at,omitempty"`
	CompletedAt            *int64  `gorm:"type:bigint" json:"completed_at,omitempty"`
	CreatedAt              int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt              int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
}

func (Tournament) TableName() string {
	return "tournaments"
}

func (t *Tournament) BeforeCreate(_ *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	if t.Status == "" {
		t.Status = TournamentStatusDraft
	}
	if t.CheckInDurationMinutes <= 0 {
		t.CheckInDurationMinutes = 15
	}
	return nil
}

type TournamentTeam struct {
	ID           string `gorm:"type:char(36);primaryKey" json:"id"`
	TournamentID string `gorm:"type:char(36);not null;index" json:"tournament_id"`
	Name         string `gorm:"type:varchar(255);not null" json:"name"`
	CaptainID    string `gorm:"type:char(36);not null;index" json:"captain_id"`
	CreatedAt    int64  `gorm:"not null;autoCreateTime" json:"created_at"`
}

func (TournamentTeam) TableName() string {
	return "tournament_teams"
}

func (t *TournamentTeam) BeforeCreate(_ *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}

type TournamentTeamMember struct {
	TeamID   string `gorm:"type:char(36);primaryKey" json:"team_id"`
	UserID   string `gorm:"type:char(36);primaryKey" json:"user_id"`
	JoinedAt int64  `gorm:"not null;autoCreateTime" json:"joined_at"`
}

func (TournamentTeamMember) TableName() string {
	return "tournament_team_members"
}

type TournamentParticipant struct {
	ID           string  `gorm:"type:char(36);primaryKey" json:"id"`
	TournamentID string  `gorm:"type:char(36);not null;index" json:"tournament_id"`
	UserID       *string `gorm:"type:char(36);index" json:"user_id,omitempty"`
	TeamID       *string `gorm:"type:char(36);index" json:"team_id,omitempty"`
	Seed         *int    `gorm:"type:int" json:"seed,omitempty"`
	Status       string  `gorm:"type:varchar(32);not null;default:'registered';index" json:"status"`
	FinalRank    *int    `gorm:"type:int" json:"final_rank,omitempty"`
	RegisteredAt int64   `gorm:"not null;autoCreateTime" json:"registered_at"`
	CheckedInAt  *int64  `gorm:"type:bigint" json:"checked_in_at,omitempty"`
}

func (TournamentParticipant) TableName() string {
	return "tournament_participants"
}

func (p *TournamentParticipant) BeforeCreate(_ *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	if p.Status == "" {
		p.Status = TournamentParticipantStatusRegistered
	}
	return nil
}

type TournamentMatch struct {
	ID               string  `gorm:"type:char(36);primaryKey" json:"id"`
	TournamentID     string  `gorm:"type:char(36);not null;index" json:"tournament_id"`
	Round            int     `gorm:"not null;index" json:"round"`
	MatchNumber      int     `gorm:"not null" json:"match_number"`
	BracketSide      string  `gorm:"type:varchar(16);not null;default:'winners';index" json:"bracket_side"`
	Participant1ID   *string `gorm:"type:char(36)" json:"participant1_id,omitempty"`
	Participant2ID   *string `gorm:"type:char(36)" json:"participant2_id,omitempty"`
	Score1           *int    `gorm:"type:int" json:"score1,omitempty"`
	Score2           *int    `gorm:"type:int" json:"score2,omitempty"`
	WinnerID         *string `gorm:"type:char(36)" json:"winner_id,omitempty"`
	Status           string  `gorm:"type:varchar(32);not null;default:'pending';index" json:"status"`
	NextMatchID      *string `gorm:"type:char(36)" json:"next_match_id,omitempty"`
	LoserNextMatchID *string `gorm:"type:char(36)" json:"loser_next_match_id,omitempty"`
	ScheduledAt      *int64  `gorm:"type:bigint" json:"scheduled_at,omitempty"`
	CompletedAt      *int64  `gorm:"type:bigint" json:"completed_at,omitempty"`
	CreatedAt        int64   `gorm:"not null;autoCreateTime" json:"created_at"`
}

func (TournamentMatch) TableName() string {
	return "tournament_matches"
}

func (m *TournamentMatch) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	if m.Status == "" {
		m.Status = TournamentMatchStatusPending
	}
	if m.BracketSide == "" {
		m.BracketSide = TournamentBracketWinners
	}
	return nil
}

type TournamentMatchReport struct {
	ID            string  `gorm:"type:char(36);primaryKey" json:"id"`
	MatchID       string  `gorm:"type:char(36);not null;index" json:"match_id"`
	ReportedBy    string  `gorm:"type:char(36);not null;index" json:"reported_by"`
	WinnerID      *string `gorm:"type:char(36)" json:"winner_id,omitempty"`
	Score1        int     `gorm:"not null" json:"score1"`
	Score2        int     `gorm:"not null" json:"score2"`
	ScreenshotURL *string `gorm:"type:text" json:"screenshot_url,omitempty"`
	Status        string  `gorm:"type:varchar(32);not null;default:'pending';index" json:"status"`
	CreatedAt     int64   `gorm:"not null;autoCreateTime" json:"created_at"`
}

func (TournamentMatchReport) TableName() string {
	return "tournament_match_reports"
}

func (r *TournamentMatchReport) BeforeCreate(_ *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	if r.Status == "" {
		r.Status = TournamentReportStatusPending
	}
	return nil
}
