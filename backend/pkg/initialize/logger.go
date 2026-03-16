package initialize

import (
	"github.com/sagiri2004/goportal/global"
	customlogger "github.com/sagiri2004/goportal/pkg/logger"
)

func InitLogger() {
	global.Logger = customlogger.NewLogger(global.Config.Logger)
}
