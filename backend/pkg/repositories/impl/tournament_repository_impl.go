package impl

import (
	"context"
	"errors"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"gorm.io/gorm"
)

type tournamentRepository struct {
	db *gorm.DB
}

func NewTournamentRepository(db *gorm.DB) repositories.TournamentRepository {
	return &tournamentRepository{db: db}
}

func (r *tournamentRepository) CreateTournament(ctx context.Context, t *models.Tournament) error {
	if err := r.db.WithContext(ctx).Create(t).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) ListTournamentsByServer(ctx context.Context, serverID string, filter repositories.TournamentListFilter) ([]models.Tournament, int64, error) {
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Limit > 100 {
		filter.Limit = 100
	}

	query := r.db.WithContext(ctx).Model(&models.Tournament{}).Where("server_id = ?", serverID)
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, apperr.E("DB_ERROR", err)
	}

	var rows []models.Tournament
	if err := query.Order("created_at DESC").Offset((filter.Page - 1) * filter.Limit).Limit(filter.Limit).Find(&rows).Error; err != nil {
		return nil, 0, apperr.E("DB_ERROR", err)
	}
	return rows, total, nil
}

func (r *tournamentRepository) FindTournamentByID(ctx context.Context, id string) (*models.Tournament, error) {
	var row models.Tournament
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("TOURNAMENT_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &row, nil
}

func (r *tournamentRepository) UpdateTournament(ctx context.Context, t *models.Tournament) error {
	if err := r.db.WithContext(ctx).Save(t).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) DeleteTournamentByID(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Tournament{}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) CountParticipants(ctx context.Context, tournamentID string) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.TournamentParticipant{}).Where("tournament_id = ?", tournamentID).Count(&count).Error; err != nil {
		return 0, apperr.E("DB_ERROR", err)
	}
	return count, nil
}

func (r *tournamentRepository) ListParticipants(ctx context.Context, tournamentID string) ([]repositories.TournamentParticipantResolved, error) {
	var participants []models.TournamentParticipant
	if err := r.db.WithContext(ctx).Where("tournament_id = ?", tournamentID).Order("seed IS NULL, seed ASC, registered_at ASC").Find(&participants).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return r.resolveParticipants(ctx, participants)
}

func (r *tournamentRepository) ListParticipantsByStatus(ctx context.Context, tournamentID, status string) ([]repositories.TournamentParticipantResolved, error) {
	var participants []models.TournamentParticipant
	if err := r.db.WithContext(ctx).Where("tournament_id = ? AND status = ?", tournamentID, status).Order("seed IS NULL, seed ASC, registered_at ASC").Find(&participants).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return r.resolveParticipants(ctx, participants)
}

func (r *tournamentRepository) FindParticipantByID(ctx context.Context, tournamentID, participantID string) (*repositories.TournamentParticipantResolved, error) {
	var row models.TournamentParticipant
	if err := r.db.WithContext(ctx).Where("id = ? AND tournament_id = ?", participantID, tournamentID).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("TOURNAMENT_PARTICIPANT_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	resolved, err := r.resolveParticipants(ctx, []models.TournamentParticipant{row})
	if err != nil {
		return nil, err
	}
	if len(resolved) == 0 {
		return nil, apperr.E("TOURNAMENT_PARTICIPANT_NOT_FOUND", nil)
	}
	return &resolved[0], nil
}

func (r *tournamentRepository) FindParticipantByUserID(ctx context.Context, tournamentID, userID string) (*repositories.TournamentParticipantResolved, error) {
	var row models.TournamentParticipant
	if err := r.db.WithContext(ctx).Where("tournament_id = ? AND user_id = ?", tournamentID, userID).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("TOURNAMENT_PARTICIPANT_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	resolved, err := r.resolveParticipants(ctx, []models.TournamentParticipant{row})
	if err != nil {
		return nil, err
	}
	return &resolved[0], nil
}

func (r *tournamentRepository) FindParticipantByTeamID(ctx context.Context, tournamentID, teamID string) (*repositories.TournamentParticipantResolved, error) {
	var row models.TournamentParticipant
	if err := r.db.WithContext(ctx).Where("tournament_id = ? AND team_id = ?", tournamentID, teamID).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("TOURNAMENT_PARTICIPANT_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	resolved, err := r.resolveParticipants(ctx, []models.TournamentParticipant{row})
	if err != nil {
		return nil, err
	}
	return &resolved[0], nil
}

func (r *tournamentRepository) CreateParticipant(ctx context.Context, p *models.TournamentParticipant) error {
	if err := r.db.WithContext(ctx).Create(p).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) UpdateParticipant(ctx context.Context, p *models.TournamentParticipant) error {
	if err := r.db.WithContext(ctx).Save(p).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) DeleteParticipantByID(ctx context.Context, tournamentID, participantID string) error {
	if err := r.db.WithContext(ctx).Where("id = ? AND tournament_id = ?", participantID, tournamentID).Delete(&models.TournamentParticipant{}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) DeleteParticipantByUserID(ctx context.Context, tournamentID, userID string) error {
	if err := r.db.WithContext(ctx).Where("tournament_id = ? AND user_id = ?", tournamentID, userID).Delete(&models.TournamentParticipant{}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) CreateTeam(ctx context.Context, team *models.TournamentTeam, captainMember *models.TournamentTeamMember) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(team).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		if err := tx.Create(captainMember).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		return nil
	})
}

func (r *tournamentRepository) ListTeams(ctx context.Context, tournamentID string) ([]repositories.TournamentTeamWithMembers, error) {
	var teams []models.TournamentTeam
	if err := r.db.WithContext(ctx).Where("tournament_id = ?", tournamentID).Order("created_at ASC").Find(&teams).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}

	out := make([]repositories.TournamentTeamWithMembers, 0, len(teams))
	for i := range teams {
		members, err := r.ListTeamMembers(ctx, teams[i].ID)
		if err != nil {
			return nil, err
		}
		out = append(out, repositories.TournamentTeamWithMembers{
			Team:    teams[i],
			Members: members,
		})
	}
	return out, nil
}

func (r *tournamentRepository) FindTeamByID(ctx context.Context, tournamentID, teamID string) (*models.TournamentTeam, error) {
	var team models.TournamentTeam
	if err := r.db.WithContext(ctx).Where("id = ? AND tournament_id = ?", teamID, tournamentID).First(&team).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("TOURNAMENT_TEAM_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &team, nil
}

func (r *tournamentRepository) DeleteTeamByID(ctx context.Context, tournamentID, teamID string) error {
	if err := r.db.WithContext(ctx).Where("id = ? AND tournament_id = ?", teamID, tournamentID).Delete(&models.TournamentTeam{}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) AddTeamMember(ctx context.Context, member *models.TournamentTeamMember) error {
	if err := r.db.WithContext(ctx).Create(member).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) RemoveTeamMember(ctx context.Context, teamID, userID string) error {
	if err := r.db.WithContext(ctx).Where("team_id = ? AND user_id = ?", teamID, userID).Delete(&models.TournamentTeamMember{}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) CountTeamMembers(ctx context.Context, teamID string) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.TournamentTeamMember{}).Where("team_id = ?", teamID).Count(&count).Error; err != nil {
		return 0, apperr.E("DB_ERROR", err)
	}
	return count, nil
}

func (r *tournamentRepository) IsTeamMember(ctx context.Context, teamID, userID string) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.TournamentTeamMember{}).Where("team_id = ? AND user_id = ?", teamID, userID).Count(&count).Error; err != nil {
		return false, apperr.E("DB_ERROR", err)
	}
	return count > 0, nil
}

func (r *tournamentRepository) ListTeamMembers(ctx context.Context, teamID string) ([]models.User, error) {
	var users []models.User
	if err := r.db.WithContext(ctx).Raw(`
		SELECT u.id, u.created_at, u.updated_at, u.deleted_at, u.username, u.password, u.is_admin, u.status, u.avatar_url
		FROM tournament_team_members tm
		INNER JOIN users u ON u.id = tm.user_id
		WHERE tm.team_id = ? AND u.deleted_at = 0
		ORDER BY u.username ASC
	`, teamID).Scan(&users).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return users, nil
}

func (r *tournamentRepository) ReplaceMatches(ctx context.Context, tournamentID string, matches []models.TournamentMatch) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("tournament_id = ?", tournamentID).Delete(&models.TournamentMatch{}).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		if len(matches) == 0 {
			return nil
		}
		if err := tx.Create(&matches).Error; err != nil {
			return apperr.E("DB_ERROR", err)
		}
		return nil
	})
}

func (r *tournamentRepository) ListMatches(ctx context.Context, tournamentID string, filter repositories.TournamentMatchFilter) ([]repositories.TournamentMatchResolved, error) {
	query := r.db.WithContext(ctx).Model(&models.TournamentMatch{}).Where("tournament_id = ?", tournamentID)
	if filter.Round != nil {
		query = query.Where("round = ?", *filter.Round)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.ParticipantID != "" {
		query = query.Where("participant1_id = ? OR participant2_id = ?", filter.ParticipantID, filter.ParticipantID)
	}
	var rows []models.TournamentMatch
	if err := query.Order("round ASC, match_number ASC").Find(&rows).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return r.resolveMatches(ctx, rows)
}

func (r *tournamentRepository) FindMatchByID(ctx context.Context, tournamentID, matchID string) (*repositories.TournamentMatchResolved, error) {
	var row models.TournamentMatch
	if err := r.db.WithContext(ctx).Where("id = ? AND tournament_id = ?", matchID, tournamentID).First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("TOURNAMENT_MATCH_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	resolved, err := r.resolveMatches(ctx, []models.TournamentMatch{row})
	if err != nil {
		return nil, err
	}
	if len(resolved) == 0 {
		return nil, apperr.E("TOURNAMENT_MATCH_NOT_FOUND", nil)
	}
	return &resolved[0], nil
}

func (r *tournamentRepository) UpdateMatch(ctx context.Context, match *models.TournamentMatch) error {
	if err := r.db.WithContext(ctx).Save(match).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) FindMatchesByNextMatchID(ctx context.Context, tournamentID, nextMatchID string) ([]models.TournamentMatch, error) {
	var rows []models.TournamentMatch
	if err := r.db.WithContext(ctx).Where("tournament_id = ? AND next_match_id = ?", tournamentID, nextMatchID).Find(&rows).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return rows, nil
}

func (r *tournamentRepository) FindMatchesByLoserNextMatchID(ctx context.Context, tournamentID, nextMatchID string) ([]models.TournamentMatch, error) {
	var rows []models.TournamentMatch
	if err := r.db.WithContext(ctx).Where("tournament_id = ? AND loser_next_match_id = ?", tournamentID, nextMatchID).Find(&rows).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return rows, nil
}

func (r *tournamentRepository) CountIncompleteMatches(ctx context.Context, tournamentID string) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&models.TournamentMatch{}).
		Where("tournament_id = ? AND status <> ?", tournamentID, models.TournamentMatchStatusCompleted).
		Count(&count).Error; err != nil {
		return 0, apperr.E("DB_ERROR", err)
	}
	return count, nil
}

func (r *tournamentRepository) CreateMatchReport(ctx context.Context, report *models.TournamentMatchReport) error {
	if err := r.db.WithContext(ctx).Create(report).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) FindLatestMatchReportByMatchID(ctx context.Context, matchID string) (*models.TournamentMatchReport, error) {
	var row models.TournamentMatchReport
	if err := r.db.WithContext(ctx).Where("match_id = ?", matchID).Order("created_at DESC").First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("TOURNAMENT_REPORT_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &row, nil
}

func (r *tournamentRepository) UpdateMatchReport(ctx context.Context, report *models.TournamentMatchReport) error {
	if err := r.db.WithContext(ctx).Save(report).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *tournamentRepository) ListUserTournaments(ctx context.Context, userID string) ([]models.Tournament, error) {
	var rows []models.Tournament
	if err := r.db.WithContext(ctx).Raw(`
		SELECT DISTINCT t.id, t.server_id, t.name, t.description, t.game, t.format, t.status, t.max_participants, t.participant_type,
		                t.team_size, t.registration_deadline, t.check_in_duration_minutes, t.prize_pool, t.rules, t.created_by,
		                t.started_at, t.completed_at, t.created_at, t.updated_at
		FROM tournaments t
		INNER JOIN tournament_participants p ON p.tournament_id = t.id
		WHERE p.user_id = ?
		ORDER BY t.created_at DESC
	`, userID).Scan(&rows).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return rows, nil
}

func (r *tournamentRepository) ListParticipantMatches(ctx context.Context, tournamentID, participantID string) ([]repositories.TournamentMatchResolved, error) {
	var rows []models.TournamentMatch
	if err := r.db.WithContext(ctx).
		Where("tournament_id = ? AND (participant1_id = ? OR participant2_id = ?)", tournamentID, participantID, participantID).
		Order("round ASC, match_number ASC").
		Find(&rows).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return r.resolveMatches(ctx, rows)
}

func (r *tournamentRepository) resolveParticipants(ctx context.Context, participants []models.TournamentParticipant) ([]repositories.TournamentParticipantResolved, error) {
	out := make([]repositories.TournamentParticipantResolved, 0, len(participants))
	for i := range participants {
		item := repositories.TournamentParticipantResolved{Participant: participants[i]}
		if participants[i].UserID != nil && *participants[i].UserID != "" {
			var user models.User
			if err := r.db.WithContext(ctx).Where("id = ? AND deleted_at = 0", *participants[i].UserID).First(&user).Error; err == nil {
				item.User = &user
			}
		}
		if participants[i].TeamID != nil && *participants[i].TeamID != "" {
			var team models.TournamentTeam
			if err := r.db.WithContext(ctx).Where("id = ?", *participants[i].TeamID).First(&team).Error; err == nil {
				item.Team = &team
			}
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *tournamentRepository) resolveMatches(ctx context.Context, matches []models.TournamentMatch) ([]repositories.TournamentMatchResolved, error) {
	out := make([]repositories.TournamentMatchResolved, 0, len(matches))
	for i := range matches {
		item := repositories.TournamentMatchResolved{Match: matches[i]}
		if matches[i].Participant1ID != nil {
			p, _ := r.FindParticipantByID(ctx, matches[i].TournamentID, *matches[i].Participant1ID)
			item.Participant1 = p
		}
		if matches[i].Participant2ID != nil {
			p, _ := r.FindParticipantByID(ctx, matches[i].TournamentID, *matches[i].Participant2ID)
			item.Participant2 = p
		}
		if matches[i].WinnerID != nil {
			p, _ := r.FindParticipantByID(ctx, matches[i].TournamentID, *matches[i].WinnerID)
			item.Winner = p
		}
		out = append(out, item)
	}
	return out, nil
}
