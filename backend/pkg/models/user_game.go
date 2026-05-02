package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	GameVisibilityPublic  = "public"
	GameVisibilityPrivate = "private"
)

const (
	GameSourceTypeSystem    = "system"
	GameSourceTypeCommunity = "community"
)

const (
	GameStatusPublished = "published"
	GameStatusDisabled  = "disabled"
)

const (
	GamePublishStateDraft         = "draft"
	GamePublishStatePendingReview = "pending_review"
	GamePublishStatePublished     = "published"
	GamePublishStateRejected      = "rejected"
	GamePublishStateSuspended     = "suspended"
)

type UserGame struct {
	ID              string   `gorm:"type:char(36);primaryKey" json:"id"`
	OwnerUserID     string   `gorm:"type:char(36);not null;index" json:"owner_user_id"`
	SourceType      string   `gorm:"type:varchar(16);not null;default:community;index" json:"source_type"`
	Title           string   `gorm:"type:varchar(255);not null" json:"title"`
	Slug            string   `gorm:"type:varchar(255);not null;uniqueIndex" json:"slug"`
	Description     *string  `gorm:"type:text" json:"description,omitempty"`
	Visibility      string   `gorm:"type:varchar(16);not null;default:public;index" json:"visibility"`
	Status          string   `gorm:"type:varchar(16);not null;default:published;index" json:"status"`
	PublishState    string   `gorm:"type:varchar(24);not null;default:draft;index" json:"publish_state"`
	Category        *string  `gorm:"type:varchar(64)" json:"category,omitempty"`
	Tags            []string `gorm:"serializer:json" json:"tags,omitempty"`
	AgeRating       *string  `gorm:"type:varchar(24)" json:"age_rating,omitempty"`
	FeaturedScore   float64  `gorm:"not null;default:0" json:"featured_score"`
	CreatedBy       string   `gorm:"type:char(36);not null;index" json:"created_by"`
	ApprovedBy      *string  `gorm:"type:char(36)" json:"approved_by,omitempty"`
	ApprovedAt      *int64   `json:"approved_at,omitempty"`
	AvgRating       float64  `gorm:"not null;default:0" json:"avg_rating"`
	RatingCount     int64    `gorm:"not null;default:0" json:"rating_count"`
	LaunchCount     int64    `gorm:"not null;default:0" json:"launch_count"`
	TrendingScore   float64  `gorm:"not null;default:0;index" json:"trending_score"`
	ThumbnailURL    *string  `gorm:"type:text" json:"thumbnail_url,omitempty"`
	IconURL         *string  `gorm:"type:text" json:"icon_url,omitempty"`
	CapsuleImageURL *string  `gorm:"column:capsule_image_url;type:text" json:"capsule_image_url,omitempty"`
	HeroImageURL    *string  `gorm:"type:text" json:"hero_image_url,omitempty"`
	ScreenshotURLs  []string `gorm:"serializer:json" json:"screenshot_urls,omitempty"`
	TrailerURL      *string  `gorm:"type:text" json:"trailer_url,omitempty"`
	CreatedAt       int64    `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt       int64    `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt       int64    `gorm:"not null;default:0;index" json:"deleted_at"`
}

func (UserGame) TableName() string {
	return "user_games"
}

func (g *UserGame) BeforeCreate(_ *gorm.DB) error {
	if g.ID == "" {
		g.ID = uuid.NewString()
	}
	return nil
}
