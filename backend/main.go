package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/initialize"
	"github.com/sagiri2004/goportal/pkg/scripts"
	"go.uber.org/zap"
)

func main() {
	configPath := flag.String("config", "configs/config.yaml", "Path to config file (or dir containing config.yaml)")
	runMigrate := flag.Bool("migrate", false, "Run goose migrations before starting server")
	runSeed := flag.Bool("seed", false, "Run seeders before starting server")
	runWatermillTest := flag.Bool("watermill-test", false, "Publish a test event to verify watermill handlers")
	runCleanupRuntime := flag.Bool("cleanup-runtime", false, "Cleanup legacy tournament runtime data (channels/workspaces/role bindings)")
	noServe := flag.Bool("no-serve", false, "Run one-shot setup tasks and exit without starting HTTP server")
	flag.Parse()

	if err := initialize.Run(*configPath, *runMigrate, *runSeed); err != nil {
		panic(err)
	}
	if *runCleanupRuntime {
		if err := scripts.CleanupLegacyRuntimeData(global.DB); err != nil {
			panic(err)
		}
		global.Logger.Info("legacy runtime data cleaned")
	}
	if *noServe {
		return
	}

	if err := initialize.InitAndRegisterWatermill(); err != nil {
		panic(err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	initialize.StartBackgroundWorkers(ctx, *runWatermillTest)

	addr := fmt.Sprintf(":%d", global.Config.Server.Port)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		global.Logger.Error("server port is already in use", zap.String("addr", addr), zap.Error(err))
		return
	}
	_ = ln.Close()

	httpServer := &http.Server{
		Addr:              addr,
		Handler:           global.Router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	initialize.RegisterGracefulShutdown(ctx, httpServer)

	global.Logger.Info("server starting", zap.String("addr", addr))
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		global.Logger.Error("server exited with error", zap.Error(err))
	}
}
