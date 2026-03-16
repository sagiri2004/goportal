package scripts

import (
	"fmt"

	"goportal/global"

	"github.com/pressly/goose/v3"
	"gorm.io/gorm"
)

// RunAppMigrate applies all pending goose migrations.
func RunAppMigrate(db *gorm.DB, migrationDir string) error {
	engine := global.Config.Database.Engine
	if engine == "" {
		engine = "sqlite3"
	}

	global.Logger.Debug(fmt.Sprintf("[+] Starting set dialect %s...", engine))
	if err := goose.SetDialect(engine); err != nil {
		return err
	}

	global.Logger.Debug("[+] Setting up database...")
	sqlDB, err := db.DB()
	if err != nil {
		global.Logger.Debug("[!] Connect db error")
		return err
	}

	if migrationDir == "" {
		migrationDir = global.Config.Database.MigrationDir
	}
	if err := goose.Up(sqlDB, migrationDir); err != nil {
		return err
	}
	return nil
}

