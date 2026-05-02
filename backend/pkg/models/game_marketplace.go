package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	GameReviewStatusVisible = "visible"
	GameReviewStatusHidden  = "hidden"
	GameReviewStatusFlagged = "flagged"
)

const (
	GameReportStatusOpen      = "open"
	GameReportStatusResolved  = "resolved"
	GameReportStatusDismissed = "dismissed"
)

type GameRating struct {
	ID        string `gorm:"type:char(36);primaryKey" json:"id"`
	GameID    string `gorm:"type:char(36);not null;index" json:"game_id"`
	UserID    string `gorm:"type:char(36);not null;index" json:"user_id"`
	Score     int    `gorm:"not null" json:"score"`
	CreatedAt int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64  `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameRating) TableName() string {
	return "game_ratings"
}

func (r *GameRating) BeforeCreate(_ *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}

type GameReview struct {
	ID             string  `gorm:"type:char(36);primaryKey" json:"id"`
	GameID         string  `gorm:"type:char(36);not null;index" json:"game_id"`
	UserID         string  `gorm:"type:char(36);not null;index" json:"user_id"`
	Title          *string `gorm:"type:varchar(255)" json:"title,omitempty"`
	Content        string  `gorm:"type:text;not null" json:"content"`
	RatingScore    *int    `json:"rating_score,omitempty"`
	Status         string  `gorm:"type:varchar(24);not null;default:visible;index" json:"status"`
	ModeratedBy    *string `gorm:"type:char(36)" json:"moderated_by,omitempty"`
	ModeratedAt    *int64  `json:"moderated_at,omitempty"`
	ModerationNote *string `gorm:"type:text" json:"moderation_note,omitempty"`
	HelpfulCount   int64   `gorm:"not null;default:0" json:"helpful_count"`
	CreatedAt      int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt      int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt      int64   `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameReview) TableName() string {
	return "game_reviews"
}

func (r *GameReview) BeforeCreate(_ *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}

type GameReviewVote struct {
	ID        string `gorm:"type:char(36);primaryKey" json:"id"`
	ReviewID  string `gorm:"type:char(36);not null;index" json:"review_id"`
	UserID    string `gorm:"type:char(36);not null;index" json:"user_id"`
	VoteType  string `gorm:"type:varchar(16);not null" json:"vote_type"`
	CreatedAt int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64  `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameReviewVote) TableName() string {
	return "game_review_votes"
}

func (v *GameReviewVote) BeforeCreate(_ *gorm.DB) error {
	if v.ID == "" {
		v.ID = uuid.NewString()
	}
	return nil
}

type GameReport struct {
	ID             string  `gorm:"type:char(36);primaryKey" json:"id"`
	GameID         string  `gorm:"type:char(36);not null;index" json:"game_id"`
	ReporterUserID string  `gorm:"type:char(36);not null;index" json:"reporter_user_id"`
	Reason         string  `gorm:"type:varchar(64);not null" json:"reason"`
	Detail         *string `gorm:"type:text" json:"detail,omitempty"`
	Status         string  `gorm:"type:varchar(24);not null;default:open;index" json:"status"`
	ResolvedBy     *string `gorm:"type:char(36)" json:"resolved_by,omitempty"`
	ResolvedAt     *int64  `json:"resolved_at,omitempty"`
	ResolutionNote *string `gorm:"type:text" json:"resolution_note,omitempty"`
	CreatedAt      int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt      int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt      int64   `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameReport) TableName() string {
	return "game_reports"
}

func (r *GameReport) BeforeCreate(_ *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}

type GameMetricsDaily struct {
	ID              string `gorm:"type:char(36);primaryKey" json:"id"`
	GameID          string `gorm:"type:char(36);not null;index" json:"game_id"`
	MetricDate      string `gorm:"type:date;not null;index" json:"metric_date"`
	ViewCount       int64  `gorm:"not null;default:0" json:"view_count"`
	LaunchCount     int64  `gorm:"not null;default:0" json:"launch_count"`
	InstallCount    int64  `gorm:"not null;default:0" json:"install_count"`
	BookmarkCount   int64  `gorm:"not null;default:0" json:"bookmark_count"`
	UniqueUserCount int64  `gorm:"not null;default:0" json:"unique_user_count"`
	CreatedAt       int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt       int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt       int64  `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameMetricsDaily) TableName() string {
	return "game_metrics_daily"
}

func (m *GameMetricsDaily) BeforeCreate(_ *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type GameCuration struct {
	ID            string  `gorm:"type:char(36);primaryKey" json:"id"`
	GameID        string  `gorm:"type:char(36);not null;index" json:"game_id"`
	CuratedBy     string  `gorm:"type:char(36);not null;index" json:"curated_by"`
	CollectionKey string  `gorm:"type:varchar(64);not null;index" json:"collection_key"`
	Priority      int     `gorm:"not null;default:0" json:"priority"`
	Note          *string `gorm:"type:text" json:"note,omitempty"`
	StartsAt      *int64  `json:"starts_at,omitempty"`
	EndsAt        *int64  `json:"ends_at,omitempty"`
	IsActive      bool    `gorm:"not null;default:true" json:"is_active"`
	CreatedAt     int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt     int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt     int64   `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameCuration) TableName() string {
	return "game_curations"
}

func (c *GameCuration) BeforeCreate(_ *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	return nil
}

type GameAuditLog struct {
	ID          string  `gorm:"type:char(36);primaryKey" json:"id"`
	GameID      string  `gorm:"type:char(36);not null;index" json:"game_id"`
	ActorUserID string  `gorm:"type:char(36);not null;index" json:"actor_user_id"`
	Action      string  `gorm:"type:varchar(64);not null" json:"action"`
	Payload     *string `gorm:"type:json" json:"payload,omitempty"`
	CreatedAt   int64   `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt   int64   `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt   int64   `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (GameAuditLog) TableName() string {
	return "game_audit_logs"
}

func (l *GameAuditLog) BeforeCreate(_ *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.NewString()
	}
	return nil
}
