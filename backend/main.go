package main

import (
	"flag"
	"fmt"

	"goportal/global"
	"goportal/pkg/initialize"
	"go.uber.org/zap"
)

func main() {
	configPath := flag.String("config", "configs/config.yaml", "Path to config file (or dir containing config.yaml)")
	runMigrate := flag.Bool("migrate", false, "Run goose migrations before starting server")
	runSeed := flag.Bool("seed", false, "Run seeders before starting server")
	flag.Parse()

	if err := initialize.Run(*configPath, *runMigrate, *runSeed); err != nil {
		panic(err)
	}

	addr := fmt.Sprintf(":%d", global.Config.Server.Port)
	global.Logger.Info("server starting", zap.String("addr", addr))
	if err := global.Router.Run(addr); err != nil {
		panic(err)
	}
}
