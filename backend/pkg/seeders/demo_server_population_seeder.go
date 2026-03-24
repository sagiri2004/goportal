package seeders

import (
	"context"
	"errors"
	"fmt"

	"github.com/sagiri2004/goportal/pkg/models"
	repoimpl "github.com/sagiri2004/goportal/pkg/repositories/impl"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	demoOwnerUsername = "superadmin"
	demoServerName    = "Seed Owner Server"
	demoUserCount     = 20
)

// SeedDemoServerPopulation creates:
// 1 owner user -> 1 server -> 20 extra users -> add all 20 users into that server.
func SeedDemoServerPopulation(db *gorm.DB, logger *zap.Logger) {
	ctx := context.Background()
	serverRepo := repoimpl.NewServerRepository(db)

	owner, err := findOrCreateUser(db, demoOwnerUsername, "superadmin123")
	if err != nil {
		if logger != nil {
			logger.Error("failed to seed demo owner", zap.Error(err))
		}
		return
	}

	server, err := findOrCreateServer(ctx, db, serverRepo, owner.ID, demoServerName)
	if err != nil {
		if logger != nil {
			logger.Error("failed to seed demo server", zap.Error(err))
		}
		return
	}
	if err := ensureServerHasDefaultChannels(db, server.ID); err != nil {
		if logger != nil {
			logger.Error("failed to seed default channels for demo server", zap.Error(err))
		}
		return
	}

	for i := 1; i <= demoUserCount; i++ {
		username := fmt.Sprintf("seed_user_%02d", i)
		user, createErr := findOrCreateUser(db, username, fmt.Sprintf("%s_123", username))
		if createErr != nil {
			if logger != nil {
				logger.Error("failed to seed demo user", zap.String("username", username), zap.Error(createErr))
			}
			continue
		}

		if addErr := serverRepo.AddMemberWithDefaultRole(ctx, server.ID, user.ID); addErr != nil {
			if logger != nil {
				logger.Error(
					"failed to add demo user to server",
					zap.String("username", username),
					zap.String("server_id", server.ID),
					zap.Error(addErr),
				)
			}
		}
	}
}

func findOrCreateUser(db *gorm.DB, username, rawPassword string) (*models.User, error) {
	var existing models.User
	if err := db.Where("username = ? AND deleted_at = 0", username).First(&existing).Error; err == nil {
		return &existing, nil
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(rawPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username: username,
		Password: string(hash),
		IsAdmin:  false,
	}
	if err := db.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func findOrCreateServer(
	ctx context.Context,
	db *gorm.DB,
	serverRepo repositoriesAdapter,
	ownerID, name string,
) (*models.Server, error) {
	var existing models.Server
	if err := db.Where("owner_id = ? AND name = ? AND deleted_at = 0", ownerID, name).First(&existing).Error; err == nil {
		return &existing, nil
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	server := &models.Server{
		Name:    name,
		OwnerID: ownerID,
	}
	member := &models.ServerMember{UserID: ownerID}
	if err := serverRepo.CreateWithOwnerMember(ctx, server, member); err != nil {
		return nil, err
	}
	return server, nil
}

type repositoriesAdapter interface {
	CreateWithOwnerMember(ctx context.Context, server *models.Server, ownerMember *models.ServerMember) error
	AddMemberWithDefaultRole(ctx context.Context, serverID, userID string) error
}

func ensureServerHasDefaultChannels(db *gorm.DB, serverID string) error {
	var count int64
	if err := db.Model(&models.Channel{}).
		Where("server_id = ? AND deleted_at = 0", serverID).
		Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	defaultChannels := []models.Channel{
		{
			ServerID: serverID,
			Type:     models.ChannelTypeText,
			Name:     "general",
			Position: 0,
		},
		{
			ServerID: serverID,
			Type:     models.ChannelTypeVoice,
			Name:     "General",
			Position: 1,
		},
	}
	for i := range defaultChannels {
		if err := db.Create(&defaultChannels[i]).Error; err != nil {
			return err
		}
	}
	return nil
}
