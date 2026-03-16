package middlewares

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/sagiri2004/goportal/global"
)

type cachedResponse struct {
	Status int               `json:"status"`
	Header map[string]string `json:"header"`
	Body   []byte            `json:"body"`
}

type responseRecorder struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (r *responseRecorder) Write(data []byte) (int, error) {
	r.body.Write(data)
	return r.ResponseWriter.Write(data)
}

func CacheMiddleware(ttl time.Duration, keyFunc func(*gin.Context) string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if global.RedisClient == nil || ttl <= 0 || c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		key := keyFunc(c)
		if key == "" {
			c.Next()
			return
		}

		ctx := c.Request.Context()
		cacheKey := "cache:" + key

		// Try to fetch from cache
		if data, err := global.RedisClient.Get(ctx, cacheKey).Bytes(); err == nil && len(data) > 0 {
			var resp cachedResponse
			if err := json.Unmarshal(data, &resp); err == nil {
				for k, v := range resp.Header {
					c.Writer.Header().Set(k, v)
				}
				c.Status(resp.Status)
				_, _ = c.Writer.Write(resp.Body)
				c.Abort()
				return
			}
		}

		// Wrap response writer to capture output
		rec := &responseRecorder{
			ResponseWriter: c.Writer,
			body:           &bytes.Buffer{},
		}
		c.Writer = rec

		c.Next()

		status := rec.Status()
		if status != http.StatusOK {
			return
		}

		resp := cachedResponse{
			Status: status,
			Header: map[string]string{},
			Body:   rec.body.Bytes(),
		}

		// Store minimal headers (e.g., Content-Type)
		if ct := rec.Header().Get("Content-Type"); ct != "" {
			resp.Header["Content-Type"] = ct
		}

		if encoded, err := json.Marshal(resp); err == nil {
			_ = global.RedisClient.Set(ctx, cacheKey, encoded, ttl).Err()
		}
	}
}
