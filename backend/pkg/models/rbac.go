package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	PermissionViewChannel        int64 = 1 << 0
	PermissionSendMessages       int64 = 1 << 1
	PermissionReadMessages       int64 = 1 << 2
	PermissionAdministrator      int64 = 1 << 3
	PermissionManageServer       int64 = 1 << 4
	PermissionCreateInvite       int64 = 1 << 5
	PermissionReadMessageHistory int64 = 1 << 6
	PermissionManageMessages     int64 = 1 << 7
	PermissionAttachFiles        int64 = 1 << 8
	PermissionEmbedLinks         int64 = 1 << 9
	PermissionAddReactions       int64 = 1 << 10
	PermissionManageChannels     int64 = 1 << 11
	PermissionManageRoles        int64 = 1 << 12
	PermissionKickMembers        int64 = 1 << 13
	PermissionBanMembers         int64 = 1 << 14
	PermissionApproveMembers     int64 = 1 << 15
)

type Permission struct {
	ID        string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	Name      string `gorm:"type:varchar(64);uniqueIndex;not null" json:"name"`
	Value     int64  `gorm:"type:bigint;uniqueIndex;not null" json:"value"`
}

func (Permission) TableName() string { return "permissions" }

func (m *Permission) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type Role struct {
	ID          string  `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt   int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt   int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt   int64   `gorm:"not null;default:0;index" json:"deleted_at"`
	ServerID    string  `gorm:"type:char(36);not null;index" json:"server_id"`
	Name        string  `gorm:"type:varchar(100);not null" json:"name"`
	IconURL     *string `gorm:"type:text" json:"icon_url,omitempty"`
	Color       string  `gorm:"type:char(7);not null;default:'#99AAB5'" json:"color"`
	Position    int     `gorm:"not null;default:0" json:"position"`
	Permissions int64   `gorm:"type:bigint;not null;default:0" json:"permissions"`
}

func (Role) TableName() string { return "roles" }

func (m *Role) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type RolePermission struct {
	ID           string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt    int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt    int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt    int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	RoleID       string `gorm:"type:char(36);not null;index" json:"role_id"`
	PermissionID string `gorm:"type:char(36);not null;index" json:"permission_id"`
}

func (RolePermission) TableName() string { return "role_permissions" }

func (m *RolePermission) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type ServerMemberRole struct {
	ID             string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt      int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt      int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt      int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	ServerMemberID string `gorm:"type:char(36);not null;index" json:"server_member_id"`
	RoleID         string `gorm:"type:char(36);not null;index" json:"role_id"`
}

func (ServerMemberRole) TableName() string { return "server_member_role" }

func (m *ServerMemberRole) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type ServerInvite struct {
	ID        string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	ServerID  string `gorm:"type:char(36);not null;index" json:"server_id"`
	InviterID string `gorm:"type:char(36);not null;index" json:"inviter_id"`
	Code      string `gorm:"type:varchar(32);not null;uniqueIndex" json:"code"`
	MaxUses   int    `gorm:"not null;default:0" json:"max_uses"`
	Uses      int    `gorm:"not null;default:0" json:"uses"`
	ExpiresAt *int64 `gorm:"type:bigint" json:"expires_at,omitempty"`
}

func (ServerInvite) TableName() string { return "server_invites" }

func (m *ServerInvite) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}
