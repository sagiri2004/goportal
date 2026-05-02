package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	GameBuildStatusReady  = "ready"
	GameBuildStatusFailed = "failed"
)

type UserGameBuild struct {
	ID            string  `gorm:"type:char(36);primaryKey" json:"id"`
	GameID        string  `gorm:"type:char(36);not null;index" json:"game_id"`
	Version       string  `gorm:"type:varchar(64);not null" json:"version"`
	StorageZipURL string  `gorm:"type:text;not null" json:"storage_zip_url"`
	PlayBasePath  string  `gorm:"type:text;not null" json:"play_base_path"`
	EntryFile     string  `gorm:"type:varchar(255);not null;default:index.html" json:"entry_file"`
	FileSize      int64   `gorm:"not null" json:"file_size"`
	Checksum      *string `gorm:"type:varchar(128)" json:"checksum,omitempty"`
	Status        string  `gorm:"type:varchar(16);not null;default:ready;index" json:"status"`
	ErrorMessage  *string `gorm:"type:text" json:"error_message,omitempty"`
	CreatedAt     int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt     int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt     int64   `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (UserGameBuild) TableName() string {
	return "user_game_builds"
}

func (b *UserGameBuild) BeforeCreate(_ *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}
