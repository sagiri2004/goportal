package realtime

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/sagiri2004/goportal/pkg/models"
)

type gameConnection struct {
	userID     string
	conn       *websocket.Conn
	subscribed map[string]struct{}
	mu         sync.RWMutex
}

type GameHub struct {
	mu          sync.RWMutex
	connections map[*gameConnection]struct{}
	upgrader    websocket.Upgrader
}

func NewGameHub() *GameHub {
	return &GameHub{
		connections: make(map[*gameConnection]struct{}),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *GameHub) HandleWS(c *gin.Context) {
	userID := strings.TrimSpace(c.Query("user_id"))
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing user_id"})
		return
	}
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &gameConnection{
		userID:     userID,
		conn:       conn,
		subscribed: make(map[string]struct{}),
	}
	h.register(client)
	defer h.unregister(client)

	for {
		_, raw, readErr := conn.ReadMessage()
		if readErr != nil {
			return
		}
		h.handleClientMessage(client, raw)
	}
}

func (h *GameHub) BroadcastRoomEvent(_ context.Context, event models.GameRoomRealtimeEvent) {
	raw, err := json.Marshal(event)
	if err != nil {
		return
	}
	msg := map[string]any{
		"type":      "game.room.event",
		"event_id":  event.EventID,
		"timestamp": event.OccurredAt,
		"payload":   json.RawMessage(raw),
	}
	packet, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.RLock()
	targets := make([]*gameConnection, 0, len(h.connections))
	for c := range h.connections {
		targets = append(targets, c)
	}
	h.mu.RUnlock()

	for _, client := range targets {
		if !h.shouldDeliver(client, event) {
			continue
		}
		_ = client.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if err := client.conn.WriteMessage(websocket.TextMessage, packet); err != nil {
			h.unregister(client)
			_ = client.conn.Close()
		}
	}
}

func (h *GameHub) handleClientMessage(client *gameConnection, raw []byte) {
	var msg struct {
		Type         string          `json:"type"`
		RoomID       string          `json:"room_id"`
		GameID       string          `json:"game_id"`
		StateVersion int64           `json:"state_version"`
		RoomStatus   string          `json:"room_status"`
		ChannelID    *string         `json:"channel_id"`
		State        json.RawMessage `json:"state"`
	}
	if err := json.Unmarshal(raw, &msg); err != nil {
		return
	}
	switch strings.TrimSpace(msg.Type) {
	case "subscribe.room":
		roomID := strings.TrimSpace(msg.RoomID)
		if roomID == "" {
			return
		}
		client.mu.Lock()
		client.subscribed[roomID] = struct{}{}
		client.mu.Unlock()
	case "unsubscribe.room":
		roomID := strings.TrimSpace(msg.RoomID)
		if roomID == "" {
			return
		}
		client.mu.Lock()
		delete(client.subscribed, roomID)
		client.mu.Unlock()
	case "publish.state":
		roomID := strings.TrimSpace(msg.RoomID)
		gameID := strings.TrimSpace(msg.GameID)
		if roomID == "" || gameID == "" {
			return
		}
		roomStatus := strings.TrimSpace(strings.ToLower(msg.RoomStatus))
		if roomStatus == "" {
			roomStatus = "open"
		}
		event := models.GameRoomRealtimeEvent{
			EventID:       uuid.NewString(),
			EventType:     "GAME_ROOM_STATE_UPDATED",
			OccurredAt:    time.Now().UTC().Format(time.RFC3339),
			GameID:        gameID,
			RoomID:        roomID,
			ActorUserID:   client.userID,
			MemberUserIDs: []string{client.userID},
			ChannelID:     msg.ChannelID,
			RoomStatus:    roomStatus,
			StateVersion:  msg.StateVersion,
			State:         msg.State,
		}
		h.BroadcastRoomEvent(context.Background(), event)
	}
}

func (h *GameHub) shouldDeliver(client *gameConnection, event models.GameRoomRealtimeEvent) bool {
	if strings.TrimSpace(event.RoomID) == "" {
		return false
	}
	if len(event.MemberUserIDs) > 0 {
		for _, id := range event.MemberUserIDs {
			if strings.TrimSpace(id) == client.userID {
				return true
			}
		}
	}
	client.mu.RLock()
	_, ok := client.subscribed[event.RoomID]
	client.mu.RUnlock()
	return ok
}

func (h *GameHub) register(client *gameConnection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.connections[client] = struct{}{}
}

func (h *GameHub) unregister(client *gameConnection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.connections, client)
}
