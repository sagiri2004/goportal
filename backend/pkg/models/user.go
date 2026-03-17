package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        string `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt int64  `gorm:"not null;autoCreateTime" json:"created_at"`
	UpdatedAt int64  `gorm:"not null;autoUpdateTime" json:"updated_at"`
	DeletedAt int64  `gorm:"not null;default:0;index" json:"deleted_at"`
	Username  string `gorm:"size:255;uniqueIndex;not null" json:"username"`
	Password  string `gorm:"not null" json:"-"`
	IsAdmin   bool   `gorm:"default:false" json:"is_admin"`
}

func (u *User) BeforeCreate(_ *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	return nil
}
