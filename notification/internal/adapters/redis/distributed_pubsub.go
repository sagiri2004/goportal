package redisadapter

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
	"github.com/sagiri/goportal/notification/internal/domain"
)

const serverChannelPrefix = "notify:"

type DistributedPubSub struct {
	client *redis.Client
}

func NewDistributedPubSub(client *redis.Client) *DistributedPubSub {
	return &DistributedPubSub{client: client}
}

func (b *DistributedPubSub) PublishToServer(ctx context.Context, serverID string, msg domain.OutboundNotification) error {
	raw, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal distributed message: %w", err)
	}
	return b.client.Publish(ctx, serverChannelPrefix+serverID, raw).Err()
}

func (b *DistributedPubSub) SubscribeServer(ctx context.Context, serverID string, handler func(domain.OutboundNotification) error) error {
	sub := b.client.Subscribe(ctx, serverChannelPrefix+serverID)
	defer sub.Close()

	ch := sub.Channel()
	for {
		select {
		case <-ctx.Done():
			return nil
		case m, ok := <-ch:
			if !ok {
				return nil
			}
			var out domain.OutboundNotification
			if err := json.Unmarshal([]byte(m.Payload), &out); err != nil {
				continue
			}
			if err := handler(out); err != nil {
				continue
			}
		}
	}
}
