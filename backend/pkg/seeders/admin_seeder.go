package seeders

import (
	"os"

	"github.com/sagiri2004/goportal/pkg/models"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedAdmin ensures there's at least one admin user in the database.
func SeedAdmin(db *gorm.DB, logger *zap.Logger) {
	var count int64
	db.Model(&models.User{}).Where("is_admin = ?", true).Count(&count)
	if count > 0 {
		return
	}

	password := os.Getenv("ADMIN_PASSWORD")
	if password == "" {
		password = "admin123"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		if logger != nil {
			logger.Error("failed to hash admin password", zap.Error(err))
		}
		return
	}

	admin := models.User{
		Username: "admin",
		Password: string(hash),
		IsAdmin:  true,
	}
	if err := db.Create(&admin).Error; err != nil {
		if logger != nil {
			logger.Error("failed to seed admin user", zap.Error(err))
		}
	}
}
