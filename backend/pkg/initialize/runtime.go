package initialize

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/notification"
	"github.com/sagiri2004/goportal/pkg/scripts"
	"go.uber.org/zap"
)

func InitAndRegisterWatermill() error {
	if err := InitWatermill(); err != nil {
		return err
	}
	if global.WMRouter != nil && global.Subscriber != nil {
		if err := notification.RegisterHandlers(global.WMRouter, global.Subscriber); err != nil {
			return err
		}
	}
	return nil
}

func StartBackgroundWorkers(ctx context.Context, runWatermillTest bool) {
	go func() {
		if global.WMRouter == nil {
			return
		}
		if err := global.WMRouter.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			global.Logger.Error("watermill router stopped with error", zap.Error(err))
		}
	}()

	if runWatermillTest {
		if err := scripts.PublishWatermillSmokeEvent(ctx); err != nil {
			global.Logger.Error("watermill smoke test publish failed", zap.Error(err))
		}
	}
}

func RegisterGracefulShutdown(ctx context.Context, httpServer *http.Server) {
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
}
