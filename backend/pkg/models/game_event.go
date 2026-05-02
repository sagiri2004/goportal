package models

import (
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	GameEventTypeScore       = "score"
	GameEventTypeAchievement = "achievement"
	GameEventTypeState       = "state"
	GameEventTypeSessionEnd  = "session_end"
)

type GameEvent struct {
	ID               string          `gorm:"type:char(36);primaryKey" json:"id"`
	GameID           string          `gorm:"type:char(36);not null;index" json:"game_id"`
	SessionID        string          `gorm:"type:char(36);not null;index" json:"session_id"`
	UserID           string          `gorm:"type:char(36);not null;index" json:"user_id"`
	EventType        string          `gorm:"type:varchar(32);not null;index" json:"event_type"`
	IdempotencyKey   *string         `gorm:"type:varchar(128);index" json:"idempotency_key,omitempty"`
	Score            *int            `json:"score,omitempty"`
	AchievementCode  *string         `gorm:"type:varchar(128)" json:"achievement_code,omitempty"`
	AchievementTitle *string         `gorm:"type:varchar(255)" json:"achievement_title,omitempty"`
	Payload          json.RawMessage `gorm:"type:json" json:"payload,omitempty"`
	CreatedAt        int64           `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt        int64           `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt        int64           `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameEvent) TableName() string {
	return "game_events"
}

func (e *GameEvent) BeforeCreate(_ *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	return nil
}
