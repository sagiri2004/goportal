package ports

import (
	"context"

	"github.com/sagiri/goportal/notification/internal/domain"
)

type PresenceRepository interface {
	SetUserServer(ctx context.Context, userID, serverID string) error
	DeleteUser(ctx context.Context, userID string) error
	GetServerByUser(ctx context.Context, userID string) (string, error)
}

type SocketManager interface {
	SendToUser(userID string, msg domain.OutboundNotification) error
	RegisterUser(ctx context.Context, userID string) error
	UnregisterUser(ctx context.Context, userID string) error
}

type DeadLetterPublisher interface {
	Publish(ctx context.Context, msg domain.InboundNotification) error
}

type DistributedPublisher interface {
	PublishToServer(ctx context.Context, serverID string, msg domain.OutboundNotification) error
}
