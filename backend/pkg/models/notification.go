package models

import (
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Notification struct {
	ID                  string          `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt           int64           `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt           int64           `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt           int64           `gorm:"not null;default:0;index" json:"deleted_at"`
	EventID             string          `gorm:"type:char(36);not null;uniqueIndex" json:"event_id"`
	UserID              string          `gorm:"type:char(36);not null;index" json:"user_id"`
	SourceType          string          `gorm:"type:varchar(32);not null;index" json:"source_type"`
	EventType           string          `gorm:"type:varchar(32);not null;index" json:"event_type"`
	Priority            string          `gorm:"type:varchar(16);not null;default:NORMAL;index" json:"priority"`
	Payload             json.RawMessage `gorm:"type:json;not null" json:"payload"`
	Metadata            json.RawMessage `gorm:"type:json" json:"metadata,omitempty"`
	DeliveryStatus      string          `gorm:"type:varchar(32);not null;default:PENDING;index" json:"delivery_status"`
	DeliveredToServerAt *int64          `gorm:"index" json:"delivered_to_server_at,omitempty"`
	DeliveredToClientAt *int64          `gorm:"index" json:"delivered_to_client_at,omitempty"`
	LastError           string          `gorm:"type:text" json:"last_error,omitempty"`
}

func (Notification) TableName() string {
	return "notifications"
}

func (n *Notification) BeforeCreate(_ *gorm.DB) error {
	if n.ID == "" {
		n.ID = uuid.NewString()
	}
	return nil
}
