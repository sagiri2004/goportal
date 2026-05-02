package websocketadapter

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/sagiri/goportal/game-realtime/internal/domain"
)

type claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

type connection struct {
	userID      string
	conn        *websocket.Conn
	mu          sync.Mutex
	subscribed  map[string]struct{}
	writeTimout time.Duration
}

type Manager struct {
	upgrader websocket.Upgrader
	secret   []byte
	mu       sync.RWMutex
	users    map[string]map[*connection]struct{}
}

func NewManager(secret string) *Manager {
	return &Manager{
		upgrader: websocket.Upgrader{
			CheckOrigin: func(_ *http.Request) bool { return true },
		},
		secret: []byte(secret),
		users:  make(map[string]map[*connection]struct{}),
	}
}

func (m *Manager) HandleWS(writeTimeout time.Duration) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := m.extractUserID(r)
		if !ok || strings.TrimSpace(userID) == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		conn, err := m.upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		c := &connection{
			userID:      userID,
			conn:        conn,
			subscribed:  map[string]struct{}{},
			writeTimout: writeTimeout,
		}
		m.add(c)
		_ = c.write(domain.OutboundEnvelope{
			Type:      "CONNECTED",
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Payload:   json.RawMessage(`{"ok":true}`),
		})
		go m.readLoop(c)
	}
}

func (m *Manager) BroadcastRoomEvent(ctx context.Context, event domain.GameRoomRealtimeEvent) {
	raw, err := json.Marshal(event)
	if err != nil {
		return
	}
	envelope := domain.OutboundEnvelope{
		Type:      "game.room.event",
		EventID:   event.EventID,
		Timestamp: event.OccurredAt,
		Payload:   raw,
	}
	for _, userID := range event.MemberUserIDs {
		for _, client := range m.clientsForUser(userID) {
			if !client.isSubscribed(event.RoomID) && strings.TrimSpace(event.RoomID) != "" {
				continue
			}
			select {
			case <-ctx.Done():
				return
			default:
				_ = client.write(envelope)
			}
		}
	}
}

func (m *Manager) CloseAll() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, clients := range m.users {
		for client := range clients {
			_ = client.conn.Close()
		}
	}
	m.users = map[string]map[*connection]struct{}{}
}

func (m *Manager) readLoop(c *connection) {
	defer m.remove(c)
	for {
		_, payload, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		var msg struct {
			Type   string          `json:"type"`
			RoomID string          `json:"room_id"`
			Data   json.RawMessage `json:"data"`
		}
		if err := json.Unmarshal(payload, &msg); err != nil {
			continue
		}
		switch strings.TrimSpace(msg.Type) {
		case "subscribe.room":
			if roomID := strings.TrimSpace(msg.RoomID); roomID != "" {
				c.mu.Lock()
				c.subscribed[roomID] = struct{}{}
				c.mu.Unlock()
			}
		case "unsubscribe.room":
			if roomID := strings.TrimSpace(msg.RoomID); roomID != "" {
				c.mu.Lock()
				delete(c.subscribed, roomID)
				c.mu.Unlock()
			}
		}
	}
}

func (m *Manager) extractUserID(r *http.Request) (string, bool) {
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		auth := strings.TrimSpace(r.Header.Get("Authorization"))
		if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
			token = strings.TrimSpace(auth[7:])
		}
	}
	if token == "" {
		return "", false
	}
	parsed, err := jwt.ParseWithClaims(token, &claims{}, func(token *jwt.Token) (interface{}, error) {
		return m.secret, nil
	})
	if err != nil || !parsed.Valid {
		return "", false
	}
	cl, ok := parsed.Claims.(*claims)
	if !ok {
		return "", false
	}
	return strings.TrimSpace(cl.UserID), true
}

func (m *Manager) add(c *connection) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.users[c.userID] == nil {
		m.users[c.userID] = map[*connection]struct{}{}
	}
	m.users[c.userID][c] = struct{}{}
}

func (m *Manager) remove(c *connection) {
	m.mu.Lock()
	defer m.mu.Unlock()
	clients := m.users[c.userID]
	if clients != nil {
		delete(clients, c)
	}
	if len(clients) == 0 {
		delete(m.users, c.userID)
	}
	_ = c.conn.Close()
}

func (m *Manager) clientsForUser(userID string) []*connection {
	m.mu.RLock()
	defer m.mu.RUnlock()
	clients := m.users[userID]
	if len(clients) == 0 {
		return nil
	}
	result := make([]*connection, 0, len(clients))
	for client := range clients {
		result = append(result, client)
	}
	return result
}

func (c *connection) isSubscribed(roomID string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.subscribed) == 0 {
		return true
	}
	_, ok := c.subscribed[roomID]
	return ok
}

func (c *connection) write(payload domain.OutboundEnvelope) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	_ = c.conn.SetWriteDeadline(time.Now().Add(c.writeTimout))
	return c.conn.WriteMessage(websocket.TextMessage, raw)
}
