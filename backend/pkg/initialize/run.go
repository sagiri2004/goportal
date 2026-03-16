package initialize

import "goportal/global"

func Run(configPath string, runMigrate bool, runSeed bool) error {
	global.ConfigPath = configPath
	if err := LoadConfig(configPath); err != nil {
		return err
	}

	InitLogger()

	if err := InitDatabase(runMigrate, runSeed); err != nil {
		return err
	}

	InitCache()
	InitRouters()
	InitCron()

	return nil
}

