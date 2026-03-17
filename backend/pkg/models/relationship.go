package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	RelationshipStatusPending  = "PENDING"
	RelationshipStatusAccepted = "ACCEPTED"
	RelationshipStatusDeclined = "DECLINED"
	RelationshipStatusBlocked  = "BLOCKED"
)

type RelationshipStatus struct {
	Code        string `gorm:"type:varchar(32);primaryKey" json:"code"`
	Description string `gorm:"type:varchar(255);not null" json:"description"`
}

func (RelationshipStatus) TableName() string {
	return "relationship_status"
}

type UserRelationship struct {
	ID          string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt   int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt   int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt   int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	RequesterID string `gorm:"type:char(36);not null;index" json:"requester_id"`
	AddresseeID string `gorm:"type:char(36);not null;index" json:"addressee_id"`
	Status      string `gorm:"type:varchar(32);not null;index" json:"status"`
}

func (UserRelationship) TableName() string {
	return "user_relationships"
}

func (r *UserRelationship) BeforeCreate(_ *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}
