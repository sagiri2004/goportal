package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/initialize"
	"go.uber.org/zap"
)

func main() {
	configPath := flag.String("config", "configs/config.yaml", "Path to config file (or dir containing config.yaml)")
	runMigrate := flag.Bool("migrate", false, "Run goose migrations before starting server")
	runSeed := flag.Bool("seed", false, "Run seeders before starting server")
	runWatermillTest := flag.Bool("watermill-test", false, "Publish a test event to verify watermill handlers")
	flag.Parse()

	if err := initialize.Run(*configPath, *runMigrate, *runSeed); err != nil {
		panic(err)
	}

	if err := initialize.InitAndRegisterWatermill(); err != nil {
		panic(err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	initialize.StartBackgroundWorkers(ctx, *runWatermillTest)

	addr := fmt.Sprintf(":%d", global.Config.Server.Port)
	httpServer := &http.Server{
		Addr:              addr,
		Handler:           global.Router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	initialize.RegisterGracefulShutdown(ctx, httpServer)

	global.Logger.Info("server starting", zap.String("addr", addr))
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}
