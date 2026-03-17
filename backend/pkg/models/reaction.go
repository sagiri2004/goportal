package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Reaction struct {
	ID        string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	MessageID string `gorm:"type:char(36);not null;index:idx_reaction_message_user_emoji,priority:1;index" json:"message_id"`
	UserID    string `gorm:"type:char(36);not null;index:idx_reaction_message_user_emoji,priority:2;index" json:"user_id"`
	Emoji     string `gorm:"type:varchar(64);not null;index:idx_reaction_message_user_emoji,priority:3" json:"emoji"`
}

func (Reaction) TableName() string {
	return "message_reactions"
}

func (r *Reaction) BeforeCreate(_ *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}
