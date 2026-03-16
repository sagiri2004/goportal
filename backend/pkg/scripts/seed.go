package scripts

import (
	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/seeders"

	"gorm.io/gorm"
)

// RunSeeders runs base seeders after migrations.
func RunSeeders(db *gorm.DB) error {
	seeders.SeedAdmin(db, global.Logger)
	return nil
}
