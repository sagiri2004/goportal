package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	Username string `gorm:"size:255;uniqueIndex;not null" json:"username"`
	Password string `gorm:"not null" json:"-"`
	IsAdmin  bool   `gorm:"default:false" json:"is_admin"`
}
