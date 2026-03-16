package scripts

import (
	"goportal/global"
	"goportal/pkg/seeders"

	"gorm.io/gorm"
)

// RunSeeders runs base seeders after migrations.
func RunSeeders(db *gorm.DB) error {
	seeders.SeedAdmin(db, global.Logger)
	return nil
}

