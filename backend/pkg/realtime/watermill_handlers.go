package realtime

import (
	"encoding/json"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/sagiri2004/goportal/pkg/models"
)

const gameRoomRealtimeTopic = "game.room.events"

func RegisterWatermillHandlers(router *message.Router, subscriber message.Subscriber, gameHub *GameHub) {
	if router == nil || subscriber == nil || gameHub == nil {
		return
	}
	router.AddNoPublisherHandler(
		"consume_game_room_events_backend",
		gameRoomRealtimeTopic,
		subscriber,
		func(msg *message.Message) error {
			var event models.GameRoomRealtimeEvent
			if err := json.Unmarshal(msg.Payload, &event); err != nil {
				return nil
			}
			gameHub.BroadcastRoomEvent(msg.Context(), event)
			return nil
		},
	)
}
