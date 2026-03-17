package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Server struct {
	ID            string  `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt     int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt     int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt     int64   `gorm:"not null;default:0;index" json:"deleted_at"`
	Name          string  `gorm:"type:varchar(255);not null" json:"name"`
	OwnerID       string  `gorm:"type:char(36);not null;index" json:"owner_id"`
	IsPublic      bool    `gorm:"not null;default:false" json:"is_public"`
	DefaultRoleID *string `gorm:"type:char(36)" json:"default_role_id,omitempty"`
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
	Status    string `gorm:"type:varchar(16);not null;default:'active';index" json:"status"`
}

func (ServerMember) TableName() string {
	return "server_members"
}

func (m *ServerMember) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	if m.Status == "" {
		m.Status = ServerMemberStatusActive
	}
	return nil
}

const (
	ServerMemberStatusPending  = "pending"
	ServerMemberStatusActive   = "active"
	ServerMemberStatusRejected = "rejected"
	ServerMemberStatusKicked   = "kicked"
)

type ServerJoinRequest struct {
	ID           string  `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt    int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt    int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt    int64   `gorm:"not null;default:0;index" json:"deleted_at"`
	ServerID     string  `gorm:"type:char(36);not null;index" json:"server_id"`
	UserID       string  `gorm:"type:char(36);not null;index" json:"user_id"`
	Status       string  `gorm:"type:varchar(16);not null;default:'pending';index" json:"status"`
	ReviewedBy   *string `gorm:"type:char(36)" json:"reviewed_by,omitempty"`
	ReviewedAt   *int64  `gorm:"type:bigint" json:"reviewed_at,omitempty"`
	DecisionNote string  `gorm:"type:varchar(255);default:''" json:"decision_note,omitempty"`
}

func (ServerJoinRequest) TableName() string {
	return "server_join_requests"
}

func (m *ServerJoinRequest) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	if m.Status == "" {
		m.Status = ServerMemberStatusPending
	}
	return nil
}
