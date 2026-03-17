package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	ChannelOverwriteSubjectRole = "ROLE"
	ChannelOverwriteSubjectUser = "USER"
)

type ChannelMember struct {
	ID        string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	ChannelID string `gorm:"type:char(36);not null;index" json:"channel_id"`
	UserID    string `gorm:"type:char(36);not null;index" json:"user_id"`
}

func (ChannelMember) TableName() string {
	return "channel_members"
}

func (m *ChannelMember) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type ChannelPermissionOverwrite struct {
	ID          string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt   int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt   int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt   int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	ChannelID   string `gorm:"type:char(36);not null;index" json:"channel_id"`
	SubjectType string `gorm:"type:varchar(8);not null;index" json:"subject_type"`
	SubjectID   string `gorm:"type:char(36);not null;index" json:"subject_id"`
	AllowBits   int64  `gorm:"type:bigint;not null;default:0" json:"allow_bits"`
	DenyBits    int64  `gorm:"type:bigint;not null;default:0" json:"deny_bits"`
}

func (ChannelPermissionOverwrite) TableName() string {
	return "channel_permission_overwrites"
}

func (m *ChannelPermissionOverwrite) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}
