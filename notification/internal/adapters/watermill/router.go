package watermilladapter

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/sagiri/goportal/notification/internal/domain"
	"github.com/sagiri/goportal/notification/internal/usecase"
)

type Router struct {
	router *message.Router
}

func debugLogNotifRouter(hypothesisID, location, message string, data map[string]any) {
	// #region agent log
	entry := map[string]any{
		"sessionId":    "6670b5",
		"runId":        "pre-fix",
		"hypothesisId": hypothesisID,
		"location":     location,
		"message":      message,
		"data":         data,
		"timestamp":    time.Now().UnixMilli(),
	}
	if b, err := json.Marshal(entry); err == nil {
		if f, err := os.OpenFile("/home/sagiri/Code/goportal/.cursor/debug-6670b5.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644); err == nil {
			_, _ = f.Write(append(b, '\n'))
			_ = f.Close()
		}
	}
	// #endregion
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
			var rawMap map[string]any
			_ = json.Unmarshal(msg.Payload, &rawMap)
			debugLogNotifRouter("H1", "notification/internal/adapters/watermill/router.go:61", "consume_raw_message", map[string]any{
				"payload_len":     len(msg.Payload),
				"has_user_id":     rawMap["user_id"] != nil,
				"has_target_user": rawMap["target_user_id"] != nil,
				"has_payload":     rawMap["payload"] != nil,
				"has_msg_payload": rawMap["message_payload"] != nil,
			})

			var in domain.InboundNotification
			if err := json.Unmarshal(msg.Payload, &in); err != nil {
				return fmt.Errorf("unmarshal inbound notification: %w", err)
			}
			// Accept both payload contracts:
			// - current notification schema: user_id + message_payload
			// - backend event schema: target_user_id + payload
			if in.UserID == "" {
				if v, ok := rawMap["user_id"].(string); ok {
					in.UserID = v
				}
			}
			if in.UserID == "" {
				if v, ok := rawMap["target_user_id"].(string); ok {
					in.UserID = v
				}
			}
			if len(in.MessagePayload) == 0 {
				if v, ok := rawMap["message_payload"]; ok {
					if b, err := json.Marshal(v); err == nil {
						in.MessagePayload = b
					}
				}
			}
			if len(in.MessagePayload) == 0 {
				if v, ok := rawMap["payload"]; ok {
					if b, err := json.Marshal(v); err == nil {
						in.MessagePayload = b
					}
				}
			}
			if in.EventID == "" {
				if v, ok := rawMap["event_id"].(string); ok {
					in.EventID = v
				}
			}
			if in.Priority == "" {
				if v, ok := rawMap["priority"].(string); ok {
					in.Priority = v
				}
			}
			debugLogNotifRouter("H2", "notification/internal/adapters/watermill/router.go:73", "after_unmarshal_inbound", map[string]any{
				"user_id":      in.UserID,
				"priority":     in.Priority,
				"event_id":     in.EventID,
				"payload_bytes": len(in.MessagePayload),
			})
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
