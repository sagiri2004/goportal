package watermilladapter

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	websocketadapter "github.com/sagiri/goportal/game-realtime/internal/adapters/websocket"
	"github.com/sagiri/goportal/game-realtime/internal/domain"
)

type Router struct {
	router *message.Router
}

func NewRouter(
	subscriber message.Subscriber,
	topicGameRoomEvents string,
	ws *websocketadapter.Manager,
) (*Router, error) {
	logger := watermill.NewStdLogger(false, false)
	r, err := message.NewRouter(message.RouterConfig{}, logger)
	if err != nil {
		return nil, fmt.Errorf("create watermill router: %w", err)
	}
	r.AddNoPublisherHandler(
		"consume_game_room_events",
		topicGameRoomEvents,
		subscriber,
		func(msg *message.Message) error {
			var event domain.GameRoomRealtimeEvent
			if err := json.Unmarshal(msg.Payload, &event); err != nil {
				return nil
			}
			ws.BroadcastRoomEvent(context.Background(), event)
			return nil
		},
	)
	return &Router{router: r}, nil
}

func (r *Router) Run(ctx context.Context) error {
	return r.router.Run(ctx)
}

func (r *Router) Close() {
	if r.router != nil {
		_ = r.router.Close()
	}
}
