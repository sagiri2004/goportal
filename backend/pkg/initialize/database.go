package initialize

import (
	"fmt"

	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/scripts"
	"gorm.io/driver/mysql"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func InitDatabase(runMigrate bool, runSeed bool) error {
	engine := global.Config.Database.Engine
	gormLogger := logger.Default.LogMode(logger.Silent)
	if engine == "" {
		engine = "sqlite3"
	}

	switch engine {
	case "sqlite3":
		db, err := gorm.Open(sqlite.Open(global.Config.Database.DSN), &gorm.Config{
			Logger: gormLogger,
		})
		if err != nil {
			return err
		}
		global.DB = db
	case "mysql":
		db, err := gorm.Open(mysql.Open(global.Config.Database.DSN), &gorm.Config{
			Logger: gormLogger,
		})
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
