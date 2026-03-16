package initialize

import (
	"fmt"

	"goportal/global"
	"goportal/pkg/scripts"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func InitDatabase(runMigrate bool, runSeed bool) error {
	engine := global.Config.Database.Engine
	if engine == "" {
		engine = "sqlite3"
	}

	switch engine {
	case "sqlite3":
		db, err := gorm.Open(sqlite.Open(global.Config.Database.DSN), &gorm.Config{})
		if err != nil {
			return err
		}
		global.DB = db
	default:
		return fmt.Errorf("unsupported database engine: %s", engine)
	}

	if runMigrate {
		if err := scripts.RunAppMigrate(global.DB, global.Config.Database.MigrationDir); err != nil {
			return err
		}
	}

	if runSeed {
		if err := scripts.RunSeeders(global.DB); err != nil {
			return err
		}
	}

	return nil
}

