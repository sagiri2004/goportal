package redisadapter

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

const presenceKeyPrefix = "user_presence:"

type PresenceRepository struct {
	client *redis.Client
}

func NewPresenceRepository(client *redis.Client) *PresenceRepository {
	return &PresenceRepository{client: client}
}

func (r *PresenceRepository) SetUserServer(ctx context.Context, userID, serverID string) error {
	return r.client.Set(ctx, presenceKeyPrefix+userID, serverID, 0).Err()
}

func (r *PresenceRepository) DeleteUser(ctx context.Context, userID string) error {
	return r.client.Del(ctx, presenceKeyPrefix+userID).Err()
}

func (r *PresenceRepository) GetServerByUser(ctx context.Context, userID string) (string, error) {
	val, err := r.client.Get(ctx, presenceKeyPrefix+userID).Result()
	if err == redis.Nil {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("redis get presence: %w", err)
	}
	return val, nil
}
