package middlewares

import (
	"net/http"

	"goportal/pkg/apperr"

	"github.com/gin-gonic/gin"
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
			c.JSON(ae.HTTPCode, errorResponse{
				Status:  ae.HTTPCode,
				Code:    ae.Code,
				Message: ae.Message,
			})
		} else {
			c.JSON(http.StatusInternalServerError, errorResponse{
				Status:  http.StatusInternalServerError,
				Code:    "INTERNAL_ERROR",
				Message: "Lỗi máy chủ nội bộ",
			})
		}
	}
}
