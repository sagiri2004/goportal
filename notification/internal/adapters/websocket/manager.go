package websocketadapter

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/sagiri/goportal/notification/internal/domain"
	"github.com/sagiri/goportal/notification/internal/ports"
)

var (
	ErrConnectionNotFound = errors.New("websocket connection not found")
)

type Manager struct {
	serverID      string
	pingInterval  time.Duration
	pongTimeout   time.Duration
	writeTimeout  time.Duration
	upgrader      websocket.Upgrader
	presence      ports.PresenceRepository
	mu            sync.RWMutex
	connections   map[string]*websocket.Conn
}

func NewManager(
	serverID string,
	pingInterval, pongTimeout, writeTimeout time.Duration,
	presence ports.PresenceRepository,
) *Manager {
	return &Manager{
		serverID:     serverID,
		pingInterval: pingInterval,
		pongTimeout:  pongTimeout,
		writeTimeout: writeTimeout,
		presence:     presence,
		connections:  make(map[string]*websocket.Conn),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

func (m *Manager) HandleWS(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "missing user_id", http.StatusBadRequest)
		return
	}

	conn, err := m.upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "upgrade failed", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	if err = m.RegisterUser(ctx, userID); err != nil {
		_ = conn.Close()
		http.Error(w, "unable to register user", http.StatusInternalServerError)
		return
	}

	m.mu.Lock()
	m.connections[userID] = conn
	m.mu.Unlock()

	_ = m.SendToUser(userID, domain.OutboundNotification{
		Type:      "CONNECTED",
		UserID:    userID,
		Payload:   json.RawMessage(`{"status":"ok"}`),
		Priority:  "NORMAL",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})

	go m.readLoop(userID, conn)
	go m.pingLoop(userID, conn)
}

func (m *Manager) readLoop(userID string, conn *websocket.Conn) {
	defer m.disconnectUser(context.Background(), userID, conn)

	conn.SetReadLimit(1 << 20)
	_ = conn.SetReadDeadline(time.Now().Add(m.pongTimeout + m.pingInterval))
	conn.SetPongHandler(func(_ string) error {
		return conn.SetReadDeadline(time.Now().Add(m.pongTimeout + m.pingInterval))
	})

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (m *Manager) pingLoop(userID string, conn *websocket.Conn) {
	ticker := time.NewTicker(m.pingInterval)
	defer ticker.Stop()
	for range ticker.C {
		if err := conn.SetWriteDeadline(time.Now().Add(m.writeTimeout)); err != nil {
			return
		}
		if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
			_ = m.disconnectUser(context.Background(), userID, conn)
			return
		}
	}
}

func (m *Manager) SendToUser(userID string, msg domain.OutboundNotification) error {
	m.mu.RLock()
	conn, ok := m.connections[userID]
	m.mu.RUnlock()
	if !ok {
		return ErrConnectionNotFound
	}

	if err := conn.SetWriteDeadline(time.Now().Add(m.writeTimeout)); err != nil {
		return err
	}
	return conn.WriteJSON(msg)
}

func (m *Manager) RegisterUser(ctx context.Context, userID string) error {
	return m.presence.SetUserServer(ctx, userID, m.serverID)
}

func (m *Manager) UnregisterUser(ctx context.Context, userID string) error {
	return m.presence.DeleteUser(ctx, userID)
}

func (m *Manager) disconnectUser(ctx context.Context, userID string, conn *websocket.Conn) error {
	m.mu.Lock()
	existing, ok := m.connections[userID]
	if ok && existing == conn {
		delete(m.connections, userID)
	}
	m.mu.Unlock()

	_ = conn.Close()
	return m.UnregisterUser(ctx, userID)
}

func (m *Manager) CloseAll() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for userID, conn := range m.connections {
		_ = conn.Close()
		delete(m.connections, userID)
	}
}
