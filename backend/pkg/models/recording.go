package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	RecordingTypeRoomComposite = "room_composite"
	RecordingTypeTrack         = "track"
	RecordingTypeRTMP          = "rtmp"
)

const (
	RecordingStatusActive    = "active"
	RecordingStatusCompleted = "completed"
	RecordingStatusFailed    = "failed"
)

type Recording struct {
	ID              string  `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt       int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt       int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt       int64   `gorm:"not null;default:0;index" json:"deleted_at"`
	ChannelID       string  `gorm:"type:char(36);not null;index" json:"channel_id"`
	ServerID        string  `gorm:"type:char(36);not null;index" json:"server_id"`
	StartedBy       string  `gorm:"type:char(36);not null;index" json:"started_by"`
	EgressID        string  `gorm:"type:varchar(255);not null;index" json:"egress_id"`
	Type            string  `gorm:"type:varchar(32);not null;index" json:"type"`
	Status          string  `gorm:"type:varchar(32);not null;index" json:"status"`
	FileURL         *string `gorm:"type:text" json:"file_url,omitempty"`
	RTMPURL         *string `gorm:"type:text" json:"rtmp_url,omitempty"`
	DurationSeconds *int64  `gorm:"type:bigint" json:"duration_seconds,omitempty"`
	StartedAt       int64   `gorm:"not null;index" json:"started_at"`
	EndedAt         *int64  `gorm:"type:bigint;index" json:"ended_at,omitempty"`
}

func (Recording) TableName() string {
	return "recordings"
}

func (r *Recording) BeforeCreate(_ *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}
