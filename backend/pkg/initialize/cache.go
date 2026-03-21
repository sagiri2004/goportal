package initialize

import (
	"context"

	"github.com/sagiri2004/goportal/global"

	"github.com/redis/go-redis/v9"
)

func InitCache() {
	addr := global.Config.Redis.Addr
	if addr == "" {
		addr = global.Config.Redis.Address
	}
	if addr == "" {
		return
	}

	global.RedisClient = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: global.Config.Redis.Password,
		DB:       global.Config.Redis.DB,
	})
	_ = global.RedisClient.Ping(context.Background()).Err()
}
