package models

import (
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	GameSessionStatusActive  = "active"
	GameSessionStatusEnded   = "ended"
	GameSessionStatusExpired = "expired"
)

type GameSession struct {
	ID         string          `gorm:"type:char(36);primaryKey" json:"id"`
	GameID     string          `gorm:"type:char(36);not null;index" json:"game_id"`
	UserID     string          `gorm:"type:char(36);not null;index" json:"user_id"`
	ChannelID  *string         `gorm:"type:char(36);index" json:"channel_id,omitempty"`
	RoomID     *string         `gorm:"type:char(36);index" json:"room_id,omitempty"`
	Status     string          `gorm:"type:varchar(16);not null;default:active;index" json:"status"`
	StartedAt  int64           `gorm:"not null;index" json:"started_at"`
	LastSeenAt int64           `gorm:"not null;index" json:"last_seen_at"`
	EndedAt    *int64          `gorm:"index" json:"ended_at,omitempty"`
	Metadata   json.RawMessage `gorm:"type:json" json:"metadata,omitempty"`
	CreatedAt  int64           `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt  int64           `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt  int64           `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameSession) TableName() string {
	return "game_sessions"
}

func (s *GameSession) BeforeCreate(_ *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}
