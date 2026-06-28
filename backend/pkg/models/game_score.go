package models

import (
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	GameLeaderboardScopeGlobal = "global"
	GameLeaderboardScopeServer = "server"
)

type GameScoreEntry struct {
	ID            string          `gorm:"type:char(36);primaryKey" json:"id"`
	GameID        string          `gorm:"type:char(36);not null;index" json:"game_id"`
	LeaderboardID string          `gorm:"type:varchar(64);not null;default:default;index" json:"leaderboard_id"`
	UserID        string          `gorm:"type:char(36);not null;index" json:"user_id"`
	SessionID     *string         `gorm:"type:char(36);index" json:"session_id,omitempty"`
	EventID       *string         `gorm:"type:char(36);index" json:"event_id,omitempty"`
	ServerID      *string         `gorm:"type:char(36);index" json:"server_id,omitempty"`
	ChannelID     *string         `gorm:"type:char(36);index" json:"channel_id,omitempty"`
	Score         int64           `gorm:"not null;index" json:"score"`
	Metadata      json.RawMessage `gorm:"type:json" json:"metadata,omitempty"`
	CreatedAt     int64           `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt     int64           `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt     int64           `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameScoreEntry) TableName() string {
	return "game_score_entries"
}

func (e *GameScoreEntry) BeforeCreate(_ *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	return nil
}

type GameLeaderboardEntry struct {
	ID               string          `gorm:"type:char(36);primaryKey" json:"id"`
	GameID           string          `gorm:"type:char(36);not null;index" json:"game_id"`
	LeaderboardID    string          `gorm:"type:varchar(64);not null;default:default;index" json:"leaderboard_id"`
	Scope            string          `gorm:"type:varchar(16);not null;default:global;index" json:"scope"`
	ServerID         *string         `gorm:"type:char(36);index" json:"server_id,omitempty"`
	UserID           string          `gorm:"type:char(36);not null;index" json:"user_id"`
	BestScore        int64           `gorm:"not null;index" json:"best_score"`
	BestScoreEntryID string          `gorm:"type:char(36);not null;index" json:"best_score_entry_id"`
	Metadata         json.RawMessage `gorm:"type:json" json:"metadata,omitempty"`
	AchievedAt       int64           `gorm:"not null;index" json:"achieved_at"`
	CreatedAt        int64           `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt        int64           `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt        int64           `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameLeaderboardEntry) TableName() string {
	return "game_leaderboard_entries"
}

func (e *GameLeaderboardEntry) BeforeCreate(_ *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	return nil
}
