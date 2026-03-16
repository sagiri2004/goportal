package middlewares

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/sagiri2004/goportal/global"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type rateLimitEntry struct {
	hits      int
	resetTime time.Time
}

type inMemoryStore struct {
	mu      sync.Mutex
	entries map[string]*rateLimitEntry
}

var memStore = &inMemoryStore{
	entries: make(map[string]*rateLimitEntry),
}

func rateLimitKey(c *gin.Context) string {
	path := c.FullPath()
	if path == "" {
		path = c.Request.URL.Path
	}
	userID, exists := c.Get("user_id")
	if exists {
		return fmt.Sprintf("throttle:%v:%s", userID, path)
	}
	return fmt.Sprintf("throttle:%s:%s", c.ClientIP(), path)
}

func RateLimitMiddleware(limit int, window time.Duration) gin.HandlerFunc {
	if global.RedisClient != nil {
		return redisRateLimit(limit, window)
	}
	return inMemoryRateLimit(limit, window)
}

func redisRateLimit(limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := rateLimitKey(c)
		ctx := c.Request.Context()

		pipe := global.RedisClient.Pipeline()
		incrCmd := pipe.Incr(ctx, key)
		pipe.Expire(ctx, key, window)
		_, err := pipe.Exec(ctx)

		if err != nil && err != redis.Nil {
			c.Next()
			return
		}

		count := int(incrCmd.Val())
		if count > limit {
			c.JSON(http.StatusTooManyRequests, gin.H{"status": 429, "message": "Too many requests, please try again later"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func inMemoryRateLimit(limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := rateLimitKey(c)

		memStore.mu.Lock()
		entry, exists := memStore.entries[key]
		now := time.Now()

		if !exists || now.After(entry.resetTime) {
			memStore.entries[key] = &rateLimitEntry{
				hits:      1,
				resetTime: now.Add(window),
			}
			memStore.mu.Unlock()
			c.Next()
			return
		}

		entry.hits++
		if entry.hits > limit {
			memStore.mu.Unlock()
			c.JSON(http.StatusTooManyRequests, gin.H{"status": 429, "message": "Too many requests, please try again later"})
			c.Abort()
			return
		}
		memStore.mu.Unlock()

		c.Next()
	}
}
