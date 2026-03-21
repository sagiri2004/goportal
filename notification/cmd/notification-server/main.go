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
	"github.com/redis/go-redis/v9"
	"github.com/sagiri/goportal/notification/internal/adapters/redis"
	"github.com/sagiri/goportal/notification/internal/adapters/watermill"
	"github.com/sagiri/goportal/notification/internal/adapters/websocket"
	"github.com/sagiri/goportal/notification/internal/config"
	"github.com/sagiri/goportal/notification/internal/domain"
	"github.com/sagiri/goportal/notification/internal/usecase"
	"github.com/sagiri/goportal/notification/pkg/logging"
	"golang.org/x/sync/errgroup"
)

func main() {
	logger := logging.New()
	if err := run(); err != nil {
		logger.Fatalf("notification server failed: %v", err)
	}
}

func run() error {
	logger := logging.New()
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	defer redisClient.Close()

	presenceRepo := redisadapter.NewPresenceRepository(redisClient)
	distBus := redisadapter.NewDistributedPubSub(redisClient)

	wsManager := websocketadapter.NewManager(
		cfg.ServerID,
		cfg.WSPingInterval,
		cfg.WSPongTimeout,
		cfg.WSWriteTimeout,
		presenceRepo,
	)

	wmLogger := watermill.NewStdLogger(false, false)
	amqpConfig := amqp.NewDurablePubSubConfig(cfg.RabbitMQURL, amqp.GenerateQueueNameTopicNameWithSuffix(cfg.ServerID))

	subscriber, err := amqp.NewSubscriber(amqpConfig, wmLogger)
	if err != nil {
		return fmt.Errorf("init amqp subscriber: %w", err)
	}
	defer subscriber.Close()

	publisher, err := amqp.NewPublisher(amqpConfig, wmLogger)
	if err != nil {
		return fmt.Errorf("init amqp publisher: %w", err)
	}
	defer publisher.Close()

	dlqPublisher := watermilladapter.NewDeadLetterPublisher(publisher, cfg.TopicDLQ)
	receiptPublisher := watermilladapter.NewDeliveryReceiptPublisher(publisher, cfg.TopicDeliveryReceipt)
	dispatcher := usecase.NewDispatchNotification(cfg.ServerID, presenceRepo, wsManager, distBus, dlqPublisher, receiptPublisher)

	router, err := watermilladapter.NewRouter(subscriber, dispatcher, cfg.TopicNotifications, wsManager)
	if err != nil {
		return fmt.Errorf("init watermill router: %w", err)
	}
	defer router.Close()

	mux := http.NewServeMux()
	mux.HandleFunc(cfg.WSPath, wsManager.HandleWS)

	httpServer := &http.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	group, groupCtx := errgroup.WithContext(ctx)

	group.Go(func() error {
		logger.Printf("websocket endpoint listening on %s%s", httpServer.Addr, cfg.WSPath)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("http server: %w", err)
		}
		return nil
	})

	group.Go(func() error {
		return distBus.SubscribeServer(groupCtx, cfg.ServerID, func(msg domain.OutboundNotification) error {
			err := wsManager.SendToUser(msg.UserID, msg)
			receiptType := domain.DeliveryTypeToClient
			errorMessage := ""
			if err != nil {
				receiptType = domain.DeliveryTypeFailed
				errorMessage = err.Error()
			}
			if msg.EventID != "" {
				_ = receiptPublisher.Publish(groupCtx, domain.DeliveryReceiptEvent{
					EventID:      msg.EventID,
					UserID:       msg.UserID,
					ServerID:     cfg.ServerID,
					DeliveryType: receiptType,
					DeliveredAt:  time.Now().Unix(),
					ErrorMessage: errorMessage,
				})
			}
			return err
		})
	})

	group.Go(func() error {
		logger.Printf("watermill consumer listening topic=%s delivery_receipt_topic=%s", cfg.TopicNotifications, cfg.TopicDeliveryReceipt)
		return router.Run(groupCtx)
	})

	group.Go(func() error {
		<-groupCtx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		wsManager.CloseAll()
		return httpServer.Shutdown(shutdownCtx)
	})

	if err := group.Wait(); err != nil && !errors.Is(err, context.Canceled) {
		return err
	}
	return nil
}
