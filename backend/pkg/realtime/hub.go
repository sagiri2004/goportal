package realtime

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Hub struct {
	mu          sync.RWMutex
	connections map[string]map[*websocket.Conn]struct{}
	upgrader    websocket.Upgrader
}

type outboundEnvelope struct {
	Type      string          `json:"type"`
	EventID   string          `json:"event_id,omitempty"`
	EventType string          `json:"event_type,omitempty"`
	Payload   json.RawMessage `json:"payload,omitempty"`
	Metadata  json.RawMessage `json:"metadata,omitempty"`
	At        int64           `json:"at"`
}

func NewHub() *Hub {
	return &Hub{
		connections: make(map[string]map[*websocket.Conn]struct{}),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *Hub) HandleWS(c *gin.Context) {
	userID := strings.TrimSpace(c.Query("user_id"))
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing user identity"})
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	h.register(userID, conn)
	defer h.unregister(userID, conn)

	_ = conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	})

	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			if _, _, readErr := conn.ReadMessage(); readErr != nil {
				return
			}
		}
	}()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			_ = conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(5*time.Second))
		}
	}
}

func (h *Hub) SendToUser(userID, eventType, eventID string, payload, metadata json.RawMessage) bool {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return false
	}

	envelope := outboundEnvelope{
		Type:      "POPUP",
		EventID:   nonEmpty(eventID, uuid.NewString()),
		EventType: eventType,
		Payload:   payload,
		Metadata:  metadata,
		At:        time.Now().Unix(),
	}
	raw, err := json.Marshal(envelope)
	if err != nil {
		return false
	}

	h.mu.RLock()
	conns := h.connections[userID]
	if len(conns) == 0 {
		h.mu.RUnlock()
		return false
	}
	targets := make([]*websocket.Conn, 0, len(conns))
	for conn := range conns {
		targets = append(targets, conn)
	}
	h.mu.RUnlock()

	delivered := false
	for _, conn := range targets {
		_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if err := conn.WriteMessage(websocket.TextMessage, raw); err == nil {
			delivered = true
			continue
		}
		h.unregister(userID, conn)
		_ = conn.Close()
	}
	return delivered
}

func (h *Hub) register(userID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.connections[userID] == nil {
		h.connections[userID] = make(map[*websocket.Conn]struct{})
	}
	h.connections[userID][conn] = struct{}{}
}

func (h *Hub) unregister(userID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.connections[userID] == nil {
		return
	}
	delete(h.connections[userID], conn)
	if len(h.connections[userID]) == 0 {
		delete(h.connections, userID)
	}
}

func nonEmpty(value, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}
