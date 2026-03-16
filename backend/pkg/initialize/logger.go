package initialize

import (
	"goportal/global"
	customlogger "goportal/pkg/logger"
)

func InitLogger() {
	global.Logger = customlogger.NewLogger(global.Config.Logger)
}

