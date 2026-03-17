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
	"github.com/sagiri2004/goportal/pkg/notification"
	"github.com/sagiri2004/goportal/pkg/scripts"
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

	if err := initialize.InitWatermill(); err != nil {
		panic(err)
	}
	if global.WMRouter != nil && global.Subscriber != nil {
		if err := notification.RegisterHandlers(global.WMRouter, global.Subscriber); err != nil {
			panic(err)
		}
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		if global.WMRouter == nil {
			return
		}
		if err := global.WMRouter.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			global.Logger.Error("watermill router stopped with error", zap.Error(err))
		}
	}()

	if *runWatermillTest {
		if err := scripts.PublishWatermillSmokeEvent(ctx); err != nil {
			global.Logger.Error("watermill smoke test publish failed", zap.Error(err))
		}
	}

	addr := fmt.Sprintf(":%d", global.Config.Server.Port)
	httpServer := &http.Server{
		Addr:              addr,
		Handler:           global.Router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if global.WMRouter != nil {
			_ = global.WMRouter.Close()
		}
		if global.Publisher != nil {
			_ = global.Publisher.Close()
		}
		if global.Subscriber != nil {
			_ = global.Subscriber.Close()
		}
		_ = httpServer.Shutdown(shutdownCtx)
	}()

	global.Logger.Info("server starting", zap.String("addr", addr))
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}
