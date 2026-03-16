package initialize

import (
	"goportal/global"
	"goportal/pkg/routers"
)

func InitRouters() {
	global.Router = routers.InitRouter()
}

