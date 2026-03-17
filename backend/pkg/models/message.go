package models

import (
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Message struct {
	ID        string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	ChannelID string `gorm:"type:char(36);not null;index" json:"channel_id"`
	AuthorID  string `gorm:"type:char(36);not null;index" json:"author_id"`
	// JSON envelope: {"type":"text/plain","payload":"...","encoding":"utf-8"}
	Content  json.RawMessage `gorm:"type:json;not null" json:"content"`
	IsEdited bool            `gorm:"not null;default:false" json:"is_edited"`
	IsPinned bool            `gorm:"not null;default:false" json:"is_pinned"`
}

func (Message) TableName() string {
	return "messages"
}

func (m *Message) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type MessageContentEnvelope struct {
	Type     string          `json:"type"`
	Payload  json.RawMessage `json:"payload"`
	Encoding string          `json:"encoding"`
}
