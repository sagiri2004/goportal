package initialize

import (
	"context"

	"goportal/global"

	"github.com/redis/go-redis/v9"
)

func InitCache() {
	if global.Config.Redis.Addr == "" {
		return
	}

	global.RedisClient = redis.NewClient(&redis.Options{
		Addr:     global.Config.Redis.Addr,
		Password: global.Config.Redis.Password,
		DB:       global.Config.Redis.DB,
	})
	_ = global.RedisClient.Ping(context.Background()).Err()
}

