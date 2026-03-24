package repositories

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type TournamentParticipantResolved struct {
	Participant models.TournamentParticipant
	User        *models.User
	Team        *models.TournamentTeam
}

type TournamentTeamWithMembers struct {
	Team    models.TournamentTeam
	Members []models.User
}

type TournamentMatchResolved struct {
	Match        models.TournamentMatch
	Participant1 *TournamentParticipantResolved
	Participant2 *TournamentParticipantResolved
	Winner       *TournamentParticipantResolved
}

type TournamentListFilter struct {
	Status string
	Page   int
	Limit  int
}

type TournamentMatchFilter struct {
	Round         *int
	Status        string
	ParticipantID string
}

type TournamentRepository interface {
	CreateTournament(ctx context.Context, t *models.Tournament) error
	ListTournamentsByServer(ctx context.Context, serverID string, filter TournamentListFilter) ([]models.Tournament, int64, error)
	FindTournamentByID(ctx context.Context, id string) (*models.Tournament, error)
	UpdateTournament(ctx context.Context, t *models.Tournament) error
	DeleteTournamentByID(ctx context.Context, id string) error

	CountParticipants(ctx context.Context, tournamentID string) (int64, error)
	ListParticipants(ctx context.Context, tournamentID string) ([]TournamentParticipantResolved, error)
	ListParticipantsByStatus(ctx context.Context, tournamentID, status string) ([]TournamentParticipantResolved, error)
	FindParticipantByID(ctx context.Context, tournamentID, participantID string) (*TournamentParticipantResolved, error)
	FindParticipantByUserID(ctx context.Context, tournamentID, userID string) (*TournamentParticipantResolved, error)
	FindParticipantByTeamID(ctx context.Context, tournamentID, teamID string) (*TournamentParticipantResolved, error)
	CreateParticipant(ctx context.Context, p *models.TournamentParticipant) error
	UpdateParticipant(ctx context.Context, p *models.TournamentParticipant) error
	DeleteParticipantByID(ctx context.Context, tournamentID, participantID string) error
	DeleteParticipantByUserID(ctx context.Context, tournamentID, userID string) error

	CreateTeam(ctx context.Context, team *models.TournamentTeam, captainMember *models.TournamentTeamMember) error
	ListTeams(ctx context.Context, tournamentID string) ([]TournamentTeamWithMembers, error)
	FindTeamByID(ctx context.Context, tournamentID, teamID string) (*models.TournamentTeam, error)
	DeleteTeamByID(ctx context.Context, tournamentID, teamID string) error
	AddTeamMember(ctx context.Context, member *models.TournamentTeamMember) error
	RemoveTeamMember(ctx context.Context, teamID, userID string) error
	CountTeamMembers(ctx context.Context, teamID string) (int64, error)
	IsTeamMember(ctx context.Context, teamID, userID string) (bool, error)
	ListTeamMembers(ctx context.Context, teamID string) ([]models.User, error)

	ReplaceMatches(ctx context.Context, tournamentID string, matches []models.TournamentMatch) error
	ListMatches(ctx context.Context, tournamentID string, filter TournamentMatchFilter) ([]TournamentMatchResolved, error)
	FindMatchByID(ctx context.Context, tournamentID, matchID string) (*TournamentMatchResolved, error)
	UpdateMatch(ctx context.Context, match *models.TournamentMatch) error
	FindMatchesByNextMatchID(ctx context.Context, tournamentID, nextMatchID string) ([]models.TournamentMatch, error)
	FindMatchesByLoserNextMatchID(ctx context.Context, tournamentID, nextMatchID string) ([]models.TournamentMatch, error)
	CountIncompleteMatches(ctx context.Context, tournamentID string) (int64, error)

	CreateMatchReport(ctx context.Context, report *models.TournamentMatchReport) error
	FindLatestMatchReportByMatchID(ctx context.Context, matchID string) (*models.TournamentMatchReport, error)
	UpdateMatchReport(ctx context.Context, report *models.TournamentMatchReport) error

	ListUserTournaments(ctx context.Context, userID string) ([]models.Tournament, error)
	ListParticipantMatches(ctx context.Context, tournamentID, participantID string) ([]TournamentMatchResolved, error)
}
