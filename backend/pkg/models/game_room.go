package models

import (
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	GameRoomStatusOpen   = "open"
	GameRoomStatusClosed = "closed"
)

const (
	GameRoomMemberRoleHost   = "host"
	GameRoomMemberRolePlayer = "player"
)

const (
	GameRoomMemberStatusJoined = "joined"
	GameRoomMemberStatusLeft   = "left"
)

type GameRoom struct {
	ID           string          `gorm:"type:char(36);primaryKey" json:"id"`
	GameID       string          `gorm:"type:char(36);not null;index" json:"game_id"`
	ChannelID    *string         `gorm:"type:char(36);index" json:"channel_id,omitempty"`
	HostUserID   string          `gorm:"type:char(36);not null;index" json:"host_user_id"`
	RoomCode     string          `gorm:"type:varchar(32);not null;uniqueIndex" json:"room_code"`
	RoomName     *string         `gorm:"type:varchar(255)" json:"room_name,omitempty"`
	Status       string          `gorm:"type:varchar(16);not null;default:open;index" json:"status"`
	MaxPlayers   int             `gorm:"not null;default:8" json:"max_players"`
	CurrentState json.RawMessage `gorm:"type:json" json:"current_state,omitempty"`
	StateVersion int64           `gorm:"not null;default:1" json:"state_version"`
	ExpiresAt    int64           `gorm:"not null;index" json:"expires_at"`
	LastActiveAt int64           `gorm:"not null;index" json:"last_active_at"`
	CreatedAt    int64           `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt    int64           `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt    int64           `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameRoom) TableName() string {
	return "game_rooms"
}

func (r *GameRoom) BeforeCreate(_ *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}

type GameRoomMember struct {
	ID         string `gorm:"type:char(36);primaryKey" json:"id"`
	RoomID     string `gorm:"type:char(36);not null;index" json:"room_id"`
	UserID     string `gorm:"type:char(36);not null;index" json:"user_id"`
	Role       string `gorm:"type:varchar(16);not null;default:player" json:"role"`
	Status     string `gorm:"type:varchar(16);not null;default:joined;index" json:"status"`
	JoinedAt   int64  `gorm:"not null;index" json:"joined_at"`
	LeftAt     *int64 `gorm:"index" json:"left_at,omitempty"`
	LastSeenAt int64  `gorm:"not null;index" json:"last_seen_at"`
	CreatedAt  int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt  int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt  int64  `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameRoomMember) TableName() string {
	return "game_room_members"
}

func (m *GameRoomMember) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}
