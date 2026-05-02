package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-amqp/v3/pkg/amqp"
	watermilladapter "github.com/sagiri/goportal/game-realtime/internal/adapters/watermill"
	websocketadapter "github.com/sagiri/goportal/game-realtime/internal/adapters/websocket"
	"github.com/sagiri/goportal/game-realtime/internal/config"
	"github.com/sagiri/goportal/game-realtime/pkg/logging"
	"golang.org/x/sync/errgroup"
)

func main() {
	logger := logging.New()
	if err := run(); err != nil {
		logger.Fatalf("server failed: %v", err)
	}
}

func run() error {
	logger := logging.New()
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	wmLogger := watermill.NewStdLogger(false, false)
	amqpConfig := amqp.NewDurablePubSubConfig(cfg.RabbitMQURL, amqp.GenerateQueueNameTopicNameWithSuffix("game-realtime"))
	subscriber, err := amqp.NewSubscriber(amqpConfig, wmLogger)
	if err != nil {
		return fmt.Errorf("init amqp subscriber: %w", err)
	}
	defer subscriber.Close()

	wsManager := websocketadapter.NewManager(cfg.JWTSecret)
	router, err := watermilladapter.NewRouter(subscriber, cfg.TopicGameRoom, wsManager)
	if err != nil {
		return err
	}
	defer router.Close()

	mux := http.NewServeMux()
	mux.HandleFunc(cfg.WSPath, wsManager.HandleWS(cfg.WSWriteTimeout))
	server := &http.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	group, groupCtx := errgroup.WithContext(ctx)
	group.Go(func() error {
		logger.Printf("websocket endpoint listening on %s%s", server.Addr, cfg.WSPath)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	})
	group.Go(func() error {
		logger.Printf("consume topic=%s", cfg.TopicGameRoom)
		return router.Run(groupCtx)
	})
	group.Go(func() error {
		<-groupCtx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		wsManager.CloseAll()
		return server.Shutdown(shutdownCtx)
	})
	if err := group.Wait(); err != nil && !errors.Is(err, context.Canceled) {
		return err
	}
	return nil
}
