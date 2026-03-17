package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Server struct {
	ID        string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	Name      string `gorm:"type:varchar(255);not null" json:"name"`
	OwnerID   string `gorm:"type:char(36);not null;index" json:"owner_id"`
}

func (Server) TableName() string {
	return "servers"
}

func (s *Server) BeforeCreate(_ *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

type ServerMember struct {
	ID        string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	ServerID  string `gorm:"type:char(36);not null;index" json:"server_id"`
	UserID    string `gorm:"type:char(36);not null;index" json:"user_id"`
}

func (ServerMember) TableName() string {
	return "server_members"
}

func (m *ServerMember) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}
