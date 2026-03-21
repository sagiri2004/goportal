package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	NotificationLevelAll          = "all"
	NotificationLevelMentionsOnly = "mentions_only"
	NotificationLevelNone         = "none"
)

type UserChannelRead struct {
	UserID      string `gorm:"type:char(36);primaryKey" json:"user_id"`
	ChannelID   string `gorm:"type:char(36);primaryKey" json:"channel_id"`
	LastReadAt  int64  `gorm:"not null;default:0" json:"last_read_at"`
	UnreadCount int64  `gorm:"not null;default:0" json:"unread_count"`
}

func (UserChannelRead) TableName() string {
	return "user_channel_reads"
}

type ChannelNotificationSetting struct {
	UserID     string `gorm:"type:char(36);primaryKey" json:"user_id"`
	ChannelID  string `gorm:"type:char(36);primaryKey" json:"channel_id"`
	Level      string `gorm:"type:varchar(32);not null;default:'all'" json:"level"`
	MutedUntil *int64 `gorm:"type:bigint" json:"muted_until,omitempty"`
}

func (ChannelNotificationSetting) TableName() string {
	return "channel_notification_settings"
}

type MessageMention struct {
	ID              string  `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt       int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt       int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt       int64   `gorm:"not null;default:0;index" json:"deleted_at"`
	MessageID       string  `gorm:"type:char(36);not null;index" json:"message_id"`
	MentionedUserID *string `gorm:"type:char(36);index" json:"mentioned_user_id,omitempty"`
	MentionType     string  `gorm:"type:varchar(32);not null" json:"mention_type"`
	ChannelID       *string `gorm:"type:char(36);index" json:"channel_id,omitempty"`
}

func (MessageMention) TableName() string {
	return "message_mentions"
}

func (m *MessageMention) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

const (
	MentionTypeEveryone = "everyone"
	MentionTypeHere     = "here"
	MentionTypeUser     = "user"
	MentionTypeChannel  = "channel"
)
