package initialize

import (
	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/cron"
)

func InitCron() {
	if !global.Config.Cron.Enabled {
		return
	}
	cron.StartCron()
}
