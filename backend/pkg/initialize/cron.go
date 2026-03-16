package initialize

import (
	"goportal/global"
	"goportal/pkg/cron"
)

func InitCron() {
	if !global.Config.Cron.Enabled {
		return
	}
	cron.StartCron()
}

