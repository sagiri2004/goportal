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
	connections map[string]map[*clientConnection]struct{}
	upgrader    websocket.Upgrader
}

type clientConnection struct {
	conn *websocket.Conn
	mu   sync.Mutex
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
		connections: make(map[string]map[*clientConnection]struct{}),
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

	client := &clientConnection{conn: conn}
	h.register(userID, client)
	defer h.unregister(userID, client)

	_ = client.writeJSON(outboundEnvelope{
		Type:      "CONNECTED",
		EventID:   uuid.NewString(),
		EventType: "CONNECTED",
		At:        time.Now().Unix(),
	})

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
			_ = client.writeControl(websocket.PingMessage, nil, time.Now().Add(5*time.Second))
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
	targets := make([]*clientConnection, 0, len(conns))
	for client := range conns {
		targets = append(targets, client)
	}
	h.mu.RUnlock()

	delivered := false
	for _, client := range targets {
		if err := client.writeMessage(websocket.TextMessage, raw, time.Now().Add(5*time.Second)); err == nil {
			delivered = true
			continue
		}
		h.unregister(userID, client)
		_ = client.conn.Close()
	}
	return delivered
}

func (h *Hub) register(userID string, client *clientConnection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.connections[userID] == nil {
		h.connections[userID] = make(map[*clientConnection]struct{})
	}
	h.connections[userID][client] = struct{}{}
}

func (h *Hub) unregister(userID string, client *clientConnection) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.connections[userID] == nil {
		return
	}
	delete(h.connections[userID], client)
	if len(h.connections[userID]) == 0 {
		delete(h.connections, userID)
	}
}

func (c *clientConnection) writeJSON(value any) error {
	raw, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.writeMessage(websocket.TextMessage, raw, time.Now().Add(5*time.Second))
}

func (c *clientConnection) writeMessage(messageType int, data []byte, deadline time.Time) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	_ = c.conn.SetWriteDeadline(deadline)
	return c.conn.WriteMessage(messageType, data)
}

func (c *clientConnection) writeControl(messageType int, data []byte, deadline time.Time) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.WriteControl(messageType, data, deadline)
}

func nonEmpty(value, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}
