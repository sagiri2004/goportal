package initialize

import (
	"fmt"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-amqp/v3/pkg/amqp"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/sagiri2004/goportal/global"
	pkgglobal "github.com/sagiri2004/goportal/pkg/global"
)

func InitWatermill() error {
	if global.Config.RabbitMQ.URL == "" {
		return fmt.Errorf("rabbitmq.url is required")
	}

	logger := watermill.NewStdLogger(false, false)
	amqpConfig := amqp.NewDurablePubSubConfig(
		global.Config.RabbitMQ.URL,
		amqp.GenerateQueueNameTopicNameWithSuffix("backend-api"),
	)

	publisher, err := amqp.NewPublisher(amqpConfig, logger)
	if err != nil {
		return fmt.Errorf("init watermill publisher: %w", err)
	}

	subscriber, err := amqp.NewSubscriber(amqpConfig, logger)
	if err != nil {
		_ = publisher.Close()
		return fmt.Errorf("init watermill subscriber: %w", err)
	}

	router, err := message.NewRouter(message.RouterConfig{}, logger)
	if err != nil {
		_ = publisher.Close()
		_ = subscriber.Close()
		return fmt.Errorf("init watermill router: %w", err)
	}

	global.Publisher = publisher
	pkgglobal.Publisher = publisher
	global.Subscriber = subscriber
	global.WMRouter = router
	return nil
}
