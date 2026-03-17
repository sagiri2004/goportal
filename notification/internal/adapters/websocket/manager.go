package websocketadapter

import (
	"context"
	"encoding/json"
	"errors"
	"log"
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
	serverID     string
	pingInterval time.Duration
	pongTimeout  time.Duration
	writeTimeout time.Duration
	upgrader     websocket.Upgrader
	presence     ports.PresenceRepository
	mu           sync.RWMutex
	connections  map[string]*websocket.Conn
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
		log.Printf("[notification] websocket upgrade failed user_id=%s err=%v", userID, err)
		http.Error(w, "upgrade failed", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	if err = m.RegisterUser(ctx, userID); err != nil {
		log.Printf("[notification] register presence failed user_id=%s err=%v", userID, err)
		_ = conn.Close()
		http.Error(w, "unable to register user", http.StatusInternalServerError)
		return
	}

	m.mu.Lock()
	m.connections[userID] = conn
	m.mu.Unlock()
	log.Printf("[notification] websocket connected user_id=%s server_id=%s", userID, m.serverID)

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
			log.Printf("[notification] websocket read loop closed user_id=%s err=%v", userID, err)
			return
		}
	}
}

func (m *Manager) pingLoop(userID string, conn *websocket.Conn) {
	ticker := time.NewTicker(m.pingInterval)
	defer ticker.Stop()
	for range ticker.C {
		if err := conn.SetWriteDeadline(time.Now().Add(m.writeTimeout)); err != nil {
			log.Printf("[notification] ping set deadline failed user_id=%s err=%v", userID, err)
			return
		}
		if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
			log.Printf("[notification] ping failed user_id=%s err=%v", userID, err)
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
		log.Printf("[notification] send skipped no connection user_id=%s event_id=%s", userID, msg.EventID)
		return ErrConnectionNotFound
	}

	if err := conn.SetWriteDeadline(time.Now().Add(m.writeTimeout)); err != nil {
		log.Printf("[notification] send set deadline failed user_id=%s event_id=%s err=%v", userID, msg.EventID, err)
		return err
	}
	if err := conn.WriteJSON(msg); err != nil {
		log.Printf("[notification] send failed user_id=%s event_id=%s err=%v", userID, msg.EventID, err)
		return err
	}
	log.Printf("[notification] send success user_id=%s event_id=%s type=%s", userID, msg.EventID, msg.Type)
	return nil
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
	log.Printf("[notification] websocket disconnected user_id=%s server_id=%s", userID, m.serverID)
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
