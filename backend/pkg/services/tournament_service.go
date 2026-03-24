package services

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
)

type TournamentCreateInput struct {
	ServerID               string
	Name                   string
	Description            *string
	Game                   string
	Format                 string
	MaxParticipants        int
	ParticipantType        string
	TeamSize               *int
	RegistrationDeadline   *int64
	CheckInDurationMinutes *int
	PrizePool              *string
	Rules                  *string
}

type TournamentUpdateInput struct {
	Name                 *string
	Description          *string
	Rules                *string
	PrizePool            *string
	MaxParticipants      *int
	RegistrationDeadline *int64
}

type TournamentListInput struct {
	ServerID string
	Status   string
	Page     int
	Limit    int
}

type TournamentListResult struct {
	Items []models.Tournament
	Total int64
	Page  int
	Limit int
}

type TournamentParticipantBulkInput struct {
	UserIDs []string
}

type TournamentTeamCreateInput struct {
	Name string
}

type TournamentAddTeamMemberInput struct {
	UserID string
}

type TournamentMatchResultInput struct {
	WinnerID      string
	Score1        int
	Score2        int
	ScreenshotURL *string
}

type TournamentMatchOverrideInput struct {
	WinnerID string
	Score1   int
	Score2   int
	Reason   string
}

type TournamentMatchListInput struct {
	TournamentID  string
	Round         *int
	Status        string
	ParticipantID string
}

type TournamentService interface {
	CreateTournament(ctx context.Context, actorID string, input TournamentCreateInput) (*models.Tournament, error)
	ListTournaments(ctx context.Context, actorID string, input TournamentListInput) (*TournamentListResult, error)
	GetTournamentDetail(ctx context.Context, actorID, tournamentID string) (*models.Tournament, int64, []repositories.TournamentParticipantResolved, error)
	UpdateTournament(ctx context.Context, actorID, tournamentID string, input TournamentUpdateInput) (*models.Tournament, error)
	DeleteTournament(ctx context.Context, actorID, tournamentID string) error
	UpdateTournamentStatus(ctx context.Context, actorID, tournamentID, status string) (*models.Tournament, error)

	RegisterParticipant(ctx context.Context, actorID, tournamentID string) (*repositories.TournamentParticipantResolved, error)
	BulkAddParticipants(ctx context.Context, actorID, tournamentID string, input TournamentParticipantBulkInput) ([]repositories.TournamentParticipantResolved, error)
	CancelMyRegistration(ctx context.Context, actorID, tournamentID string) error
	CheckInParticipant(ctx context.Context, actorID, tournamentID, participantID string) (*repositories.TournamentParticipantResolved, error)
	RemoveParticipant(ctx context.Context, actorID, tournamentID, participantID string) error
	UpdateParticipantSeed(ctx context.Context, actorID, tournamentID, participantID string, seed int) (*repositories.TournamentParticipantResolved, error)

	CreateTeam(ctx context.Context, actorID, tournamentID string, input TournamentTeamCreateInput) (*models.TournamentTeam, error)
	ListTeams(ctx context.Context, actorID, tournamentID string) ([]repositories.TournamentTeamWithMembers, error)
	AddTeamMember(ctx context.Context, actorID, tournamentID, teamID string, input TournamentAddTeamMemberInput) error
	RemoveTeamMember(ctx context.Context, actorID, tournamentID, teamID, userID string) error
	DeleteTeam(ctx context.Context, actorID, tournamentID, teamID string) error

	GetBracket(ctx context.Context, actorID, tournamentID string) ([]repositories.TournamentMatchResolved, error)
	ListMatches(ctx context.Context, actorID string, input TournamentMatchListInput) ([]repositories.TournamentMatchResolved, error)
	GetMatch(ctx context.Context, actorID, tournamentID, matchID string) (*repositories.TournamentMatchResolved, error)
	UpdateMatchStatus(ctx context.Context, actorID, tournamentID, matchID, status string) (*repositories.TournamentMatchResolved, error)
	ReportMatchResult(ctx context.Context, actorID, tournamentID, matchID string, input TournamentMatchResultInput) (*models.TournamentMatchReport, error)
	DisputeMatchResult(ctx context.Context, actorID, tournamentID, matchID string) (*models.TournamentMatchReport, error)
	OverrideMatchResult(ctx context.Context, actorID, tournamentID, matchID string, input TournamentMatchOverrideInput) (*repositories.TournamentMatchResolved, error)

	GetStandings(ctx context.Context, actorID, tournamentID string) ([]repositories.TournamentParticipantResolved, error)
	GetParticipantMatches(ctx context.Context, actorID, tournamentID, participantID string) ([]repositories.TournamentMatchResolved, error)
	GetUserTournamentHistory(ctx context.Context, actorID, userID string) ([]models.Tournament, error)
}
