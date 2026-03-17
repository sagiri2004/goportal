package usecase

import (
	"context"
	"errors"
	"fmt"
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
