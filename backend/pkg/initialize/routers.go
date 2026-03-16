package initialize

import (
	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/routers"
)

func InitRouters() {
	global.Router = routers.InitRouter()
}
