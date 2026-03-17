package watermilladapter

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/sagiri/goportal/notification/internal/domain"
	"github.com/sagiri/goportal/notification/internal/usecase"
)

type Router struct {
	router *message.Router
}

func NewRouter(
	subscriber message.Subscriber,
	dispatcher *usecase.DispatchNotification,
	topicNotifications string,
) (*Router, error) {
	wmLogger := watermill.NewStdLogger(false, false)
	r, err := message.NewRouter(message.RouterConfig{}, wmLogger)
	if err != nil {
		return nil, fmt.Errorf("create watermill router: %w", err)
	}

	r.AddNoPublisherHandler(
		"consume_notifications",
		topicNotifications,
		subscriber,
		func(msg *message.Message) error {
			var in domain.InboundNotification
			if err := json.Unmarshal(msg.Payload, &in); err != nil {
				return fmt.Errorf("unmarshal inbound notification: %w", err)
			}
			return dispatcher.HandleInbound(context.Background(), in)
		},
	)

	return &Router{router: r}, nil
}

func (r *Router) Run(ctx context.Context) error {
	return r.router.Run(ctx)
}

func (r *Router) Close() {
	if err := r.router.Close(); err != nil {
		log.Printf("watermill router close error: %v", err)
	}
}
