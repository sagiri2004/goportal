package seeders

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	repoimpl "github.com/sagiri2004/goportal/pkg/repositories/impl"
	svcimpl "github.com/sagiri2004/goportal/pkg/services/impl"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/services"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type demoTournamentCase struct {
	Name             string
	Format           string
	ParticipantCount int
	FinalStatus      string
}

// SeedDemoTournaments creates 4 tournaments (one for each format) with participants
// and status progressed to in_progress/completed for frontend testing.
func SeedDemoTournaments(db *gorm.DB, logger *zap.Logger) {
	ctx := context.Background()

	owner, err := findOrCreateUser(db, demoOwnerUsername, "seed_owner_123")
	if err != nil {
		if logger != nil {
			logger.Error("failed to load demo owner for tournaments", zap.Error(err))
		}
		return
	}

	var server models.Server
	if err := db.Where("owner_id = ? AND name = ? AND deleted_at = 0", owner.ID, demoServerName).First(&server).Error; err != nil {
		if logger != nil {
			logger.Error("failed to load demo server for tournaments", zap.Error(err))
		}
		return
	}

	demoUsers, err := listDemoUsers(db)
	if err != nil {
		if logger != nil {
			logger.Error("failed to list demo users for tournaments", zap.Error(err))
		}
		return
	}
	if len(demoUsers) < 8 {
		if logger != nil {
			logger.Warn("not enough demo users for tournament seeding", zap.Int("count", len(demoUsers)))
		}
		return
	}

	tournamentSvc := svcimpl.NewTournamentService(
		repoimpl.NewTournamentRepository(db),
		repoimpl.NewServerRepository(db),
		repoimpl.NewUserRepository(db),
		nil,
	)

	cases := []demoTournamentCase{
		{Name: "Seed Single Elimination", Format: models.TournamentFormatSingleElimination, ParticipantCount: 8, FinalStatus: models.TournamentStatusInProgress},
		{Name: "Seed Double Elimination", Format: models.TournamentFormatDoubleElimination, ParticipantCount: 8, FinalStatus: models.TournamentStatusInProgress},
		{Name: "Seed Round Robin", Format: models.TournamentFormatRoundRobin, ParticipantCount: 6, FinalStatus: models.TournamentStatusCompleted},
		{Name: "Seed Swiss System", Format: models.TournamentFormatSwiss, ParticipantCount: 8, FinalStatus: models.TournamentStatusInProgress},
	}

	for _, tc := range cases {
		if err := seedOneTournamentCase(ctx, db, tournamentSvc, owner.ID, server.ID, demoUsers, tc); err != nil {
			if logger != nil {
				logger.Error("failed to seed demo tournament", zap.String("name", tc.Name), zap.Error(err))
			}
		}
	}
}

func seedOneTournamentCase(
	ctx context.Context,
	db *gorm.DB,
	tournamentSvc services.TournamentService,
	ownerID string,
	serverID string,
	users []models.User,
	tc demoTournamentCase,
) error {
	var existing models.Tournament
	if err := db.Where("server_id = ? AND name = ?", serverID, tc.Name).First(&existing).Error; err == nil {
		return nil
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	deadline := time.Now().Add(24 * time.Hour).Unix()
	checkInMinutes := 20
	t, err := tournamentSvc.CreateTournament(ctx, ownerID, services.TournamentCreateInput{
		ServerID:               serverID,
		Name:                   tc.Name,
		Game:                   "Valorant",
		Format:                 tc.Format,
		MaxParticipants:        tc.ParticipantCount,
		ParticipantType:        models.TournamentParticipantTypeSolo,
		RegistrationDeadline:   &deadline,
		CheckInDurationMinutes: &checkInMinutes,
	})
	if err != nil {
		return err
	}

	if _, err := tournamentSvc.UpdateTournamentStatus(ctx, ownerID, t.ID, models.TournamentStatusRegistration); err != nil {
		return err
	}

	ids := make([]string, 0, tc.ParticipantCount)
	for i := 0; i < tc.ParticipantCount && i < len(users); i++ {
		ids = append(ids, users[i].ID)
	}
	added, err := tournamentSvc.BulkAddParticipants(ctx, ownerID, t.ID, services.TournamentParticipantBulkInput{UserIDs: ids})
	if err != nil {
		return err
	}

	if _, err := tournamentSvc.UpdateTournamentStatus(ctx, ownerID, t.ID, models.TournamentStatusCheckIn); err != nil {
		return err
	}

	for i := range added {
		if _, err := tournamentSvc.CheckInParticipant(ctx, ownerID, t.ID, added[i].Participant.ID); err != nil {
			return fmt.Errorf("check-in failed for %s: %w", added[i].Participant.ID, err)
		}
	}

	if _, err := tournamentSvc.UpdateTournamentStatus(ctx, ownerID, t.ID, models.TournamentStatusInProgress); err != nil {
		return err
	}

	if tc.FinalStatus == models.TournamentStatusCompleted {
		if _, err := tournamentSvc.UpdateTournamentStatus(ctx, ownerID, t.ID, models.TournamentStatusCompleted); err != nil {
			return err
		}
	}

	return nil
}

func listDemoUsers(db *gorm.DB) ([]models.User, error) {
	var users []models.User
	if err := db.Where("deleted_at = 0 AND username LIKE ?", "seed_user_%").
		Order("username ASC").
		Find(&users).Error; err != nil {
		return nil, err
	}
	filtered := make([]models.User, 0, len(users))
	for i := range users {
		if strings.TrimSpace(users[i].ID) == "" {
			continue
		}
		filtered = append(filtered, users[i])
	}
	return filtered, nil
}
