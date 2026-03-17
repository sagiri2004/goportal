package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/sagiri/goportal/notification/internal/domain"
	"github.com/sagiri/goportal/notification/internal/ports"
)

type DispatchNotification struct {
	serverID   string
	presence   ports.PresenceRepository
	sockets    ports.SocketManager
	remotePub  ports.DistributedPublisher
	dlqPub     ports.DeadLetterPublisher
}

func debugLogDispatch(hypothesisID, location, message string, data map[string]any) {
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

func NewDispatchNotification(
	serverID string,
	presence ports.PresenceRepository,
	sockets ports.SocketManager,
	remotePub ports.DistributedPublisher,
	dlqPub ports.DeadLetterPublisher,
) *DispatchNotification {
	return &DispatchNotification{
		serverID:  serverID,
		presence:  presence,
		sockets:   sockets,
		remotePub: remotePub,
		dlqPub:    dlqPub,
	}
}

func (u *DispatchNotification) HandleInbound(ctx context.Context, in domain.InboundNotification) error {
	debugLogDispatch("H3", "notification/internal/usecase/dispatch_notification.go:63", "handle_inbound_entry", map[string]any{
		"user_id":      in.UserID,
		"event_id":     in.EventID,
		"priority":     in.Priority,
		"payload_bytes": len(in.MessagePayload),
	})

	if in.UserID == "" {
		return errors.New("inbound notification missing user_id")
	}
	if len(in.MessagePayload) == 0 {
		return errors.New("inbound notification missing message_payload")
	}

	out := domain.OutboundNotification{
		Type:      "POPUP",
		UserID:    in.UserID,
		Payload:   in.MessagePayload,
		Priority:  in.Priority,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		EventID:   in.EventID,
	}

	serverID, err := u.presence.GetServerByUser(ctx, in.UserID)
	if err != nil {
		return fmt.Errorf("lookup presence: %w", err)
	}
	debugLogDispatch("H4", "notification/internal/usecase/dispatch_notification.go:87", "presence_lookup_result", map[string]any{
		"user_id":               in.UserID,
		"resolved_server_id":    serverID,
		"current_notification_node": u.serverID,
	})
	if serverID == "" {
		if u.dlqPub == nil {
			return nil
		}
		return u.dlqPub.Publish(ctx, in)
	}

	if serverID == u.serverID {
		return u.sockets.SendToUser(in.UserID, out)
	}
	return u.remotePub.PublishToServer(ctx, serverID, out)
}
