package middlewares

import (
	"net/http"
	"runtime/debug"

	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/apperr"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func ErrorMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) == 0 {
			return
		}

		lastErr := c.Errors.Last().Err

		type errorResponse struct {
			Status  int    `json:"status"`
			Code    string `json:"code"`
			Message string `json:"message"`
		}

		if ae, ok := apperr.From(lastErr); ok {
			logErrorContext(c, ae.HTTPCode, ae.Code, ae.Message, ae.Err, len(c.Errors) > 1)
			if c.Writer.Written() {
				return
			}
			c.JSON(ae.HTTPCode, errorResponse{
				Status:  ae.HTTPCode,
				Code:    ae.Code,
				Message: ae.Message,
			})
		} else {
			logErrorContext(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Lỗi máy chủ nội bộ", lastErr, len(c.Errors) > 1)
			if c.Writer.Written() {
				return
			}
			c.JSON(http.StatusInternalServerError, errorResponse{
				Status:  http.StatusInternalServerError,
				Code:    "INTERNAL_ERROR",
				Message: "Lỗi máy chủ nội bộ",
			})
		}
	}
}

func logErrorContext(c *gin.Context, statusCode int, code, message string, cause error, hasMultipleErrors bool) {
	if global.Logger == nil {
		return
	}

	fields := []zap.Field{
		zap.Int("status", statusCode),
		zap.String("code", code),
		zap.String("message", message),
		zap.String("method", c.Request.Method),
		zap.String("path", c.Request.URL.Path),
		zap.String("query", c.Request.URL.RawQuery),
		zap.String("client_ip", c.ClientIP()),
		zap.String("user_agent", c.Request.UserAgent()),
		zap.Int("error_count", len(c.Errors)),
		zap.String("errors", c.Errors.String()),
	}

	if requestID := c.GetHeader("X-Request-ID"); requestID != "" {
		fields = append(fields, zap.String("request_id", requestID))
	}

	if cause != nil {
		fields = append(fields, zap.Error(cause))
	}

	if hasMultipleErrors {
		fields = append(fields, zap.Bool("has_multiple_errors", true))
	}

	if statusCode >= http.StatusInternalServerError {
		fields = append(fields, zap.ByteString("stack", debug.Stack()))
	}

	global.Logger.Error("request failed", fields...)
}
