package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	ChannelTypeText     = "TEXT"
	ChannelTypeVoice    = "VOICE"
	ChannelTypeCategory = "CATEGORY"
)

type ChannelType struct {
	Code        string `gorm:"type:varchar(32);primaryKey" json:"code"`
	Description string `gorm:"type:varchar(255);not null" json:"description"`
}

func (ChannelType) TableName() string {
	return "channel_types"
}

type Channel struct {
	ID        string  `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64   `gorm:"not null;default:0;index" json:"deleted_at"`
	ServerID  string  `gorm:"type:char(36);not null;index" json:"server_id"`
	ParentID  *string `gorm:"type:char(36);index" json:"parent_id,omitempty"`
	Type      string  `gorm:"type:varchar(32);not null;index" json:"type"`
	Name      string  `gorm:"type:varchar(255);not null" json:"name"`
	Position  int     `gorm:"not null;default:0" json:"position"`
}

func (Channel) TableName() string {
	return "channels"
}

func (c *Channel) BeforeCreate(_ *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	return nil
}
