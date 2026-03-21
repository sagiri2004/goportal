package watermilladapter

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/google/uuid"
	websocketadapter "github.com/sagiri/goportal/notification/internal/adapters/websocket"
	"github.com/sagiri/goportal/notification/internal/domain"
	"github.com/sagiri/goportal/notification/internal/usecase"
)

type Router struct {
	router       *message.Router
	ws           *websocketadapter.Manager
	unreadMu     sync.Mutex
	unreadByUser map[string]map[string]int64
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
	wsManager *websocketadapter.Manager,
) (*Router, error) {
	wmLogger := watermill.NewStdLogger(false, false)
	r, err := message.NewRouter(message.RouterConfig{}, wmLogger)
	if err != nil {
		return nil, fmt.Errorf("create watermill router: %w", err)
	}

	rt := &Router{
		router:       r,
		ws:           wsManager,
		unreadByUser: map[string]map[string]int64{},
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
				"user_id":       in.UserID,
				"priority":      in.Priority,
				"event_id":      in.EventID,
				"payload_bytes": len(in.MessagePayload),
			})
			log.Printf("[notification] consume topic=%s event_id=%s user_id=%s payload_bytes=%d", topicNotifications, in.EventID, in.UserID, len(in.MessagePayload))
			return dispatcher.HandleInbound(context.Background(), in)
		},
	)

	rt.registerChatHandlers(subscriber)
	return rt, nil
}

func (r *Router) Run(ctx context.Context) error {
	return r.router.Run(ctx)
}

func (r *Router) Close() {
	if err := r.router.Close(); err != nil {
		log.Printf("watermill router close error: %v", err)
	}
}

func (r *Router) registerChatHandlers(subscriber message.Subscriber) {
	consume := func(handlerName, topic string, fn func(*message.Message) error) {
		r.router.AddNoPublisherHandler(handlerName, topic, subscriber, fn)
	}

	consume("consume_chat_message_created", "chat.message.created", r.handleChatMessageCreated)
	consume("consume_chat_message_updated", "chat.message.updated", r.forwardPayloadAsType("message.updated"))
	consume("consume_chat_message_deleted", "chat.message.deleted", r.forwardPayloadAsType("message.deleted"))
	consume("consume_chat_reaction_added", "chat.reaction.added", r.forwardPayloadAsType("reaction.added"))
	consume("consume_chat_reaction_removed", "chat.reaction.removed", r.forwardPayloadAsType("reaction.removed"))
}

func (r *Router) forwardPayloadAsType(outType string) func(*message.Message) error {
	return func(msg *message.Message) error {
		var payload map[string]any
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return nil
		}
		for _, userID := range r.ws.ListConnectedUsers() {
			rawPayload, _ := json.Marshal(payload)
			_ = r.ws.SendToUser(userID, domain.OutboundNotification{
				Type:      outType,
				UserID:    userID,
				Payload:   rawPayload,
				Priority:  "NORMAL",
				Timestamp: time.Now().UTC().Format(time.RFC3339),
				EventID:   uuid.NewString(),
			})
		}
		return nil
	}
}

func (r *Router) handleChatMessageCreated(msg *message.Message) error {
	var payload map[string]any
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		return nil
	}
	channelID, _ := payload["channel_id"].(string)
	messageID, _ := payload["message_id"].(string)
	content := payload["content"]
	author := payload["author"]
	mentionsRaw, _ := payload["mentions"].([]any)

	for _, userID := range r.ws.ListConnectedUsers() {
		focusedChannel := r.ws.GetFocusedChannel(userID)
		if focusedChannel == channelID {
			rawPayload, _ := json.Marshal(payload)
			_ = r.ws.SendToUser(userID, domain.OutboundNotification{
				Type:      "message.created",
				UserID:    userID,
				Payload:   rawPayload,
				Priority:  "NORMAL",
				Timestamp: time.Now().UTC().Format(time.RFC3339),
				EventID:   uuid.NewString(),
			})
		} else {
			count := r.incrementUnread(userID, channelID)
			rawPayload, _ := json.Marshal(map[string]any{
				"type":         "channel.unread",
				"channel_id":   channelID,
				"unread_count": count,
			})
			_ = r.ws.SendToUser(userID, domain.OutboundNotification{
				Type:      "channel.unread",
				UserID:    userID,
				Payload:   rawPayload,
				Priority:  "NORMAL",
				Timestamp: time.Now().UTC().Format(time.RFC3339),
				EventID:   uuid.NewString(),
			})
		}
		if isMentionTargetUser(userID, mentionsRaw) {
			preview := ""
			if c, ok := content.(map[string]any); ok {
				if p, ok := c["payload"].(string); ok {
					preview = trimPreview(p, 50)
				}
			}
			fromUsername := "unknown"
			if m, ok := author.(map[string]any); ok {
				if un, ok := m["username"].(string); ok && strings.TrimSpace(un) != "" {
					fromUsername = un
				}
			}
			rawMention, _ := json.Marshal(map[string]any{
				"type":          "mention",
				"channel_id":    channelID,
				"message_id":    messageID,
				"from_username": fromUsername,
				"preview":       preview,
			})
			_ = r.ws.SendToUser(userID, domain.OutboundNotification{
				Type:      "mention",
				UserID:    userID,
				Payload:   rawMention,
				Priority:  "HIGH",
				Timestamp: time.Now().UTC().Format(time.RFC3339),
				EventID:   uuid.NewString(),
			})
		}
	}
	return nil
}

func (r *Router) incrementUnread(userID, channelID string) int64 {
	r.unreadMu.Lock()
	defer r.unreadMu.Unlock()
	if r.unreadByUser[userID] == nil {
		r.unreadByUser[userID] = map[string]int64{}
	}
	r.unreadByUser[userID][channelID]++
	return r.unreadByUser[userID][channelID]
}

func trimPreview(text string, max int) string {
	runes := []rune(strings.TrimSpace(text))
	if len(runes) <= max {
		return string(runes)
	}
	return string(runes[:max])
}

func isMentionTargetUser(userID string, mentions []any) bool {
	for _, raw := range mentions {
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		mentionType, _ := item["mention_type"].(string)
		switch mentionType {
		case "everyone", "here":
			return true
		case "channel":
			return true
		case "user":
			if targetID, ok := item["mentioned_user_id"].(string); ok && targetID == userID {
				return true
			}
		}
	}
	return false
}
