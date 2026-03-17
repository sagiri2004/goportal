package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MessageAttachment struct {
	ID        string  `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64   `gorm:"not null;default:0;index" json:"deleted_at"`
	MessageID *string `gorm:"type:char(36);index" json:"message_id,omitempty"`
	FileURL   string  `gorm:"type:text;not null" json:"file_url"`
	FileType  string  `gorm:"type:varchar(255);not null" json:"file_type"`
	FileSize  int64   `gorm:"not null" json:"file_size"`
	FileName  string  `gorm:"type:varchar(255);not null" json:"file_name"`
}

func (MessageAttachment) TableName() string {
	return "message_attachments"
}

func (a *MessageAttachment) BeforeCreate(_ *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}
