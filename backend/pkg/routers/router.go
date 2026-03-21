package routers

import (
	"fmt"
	"github.com/sagiri2004/goportal/pkg/middlewares"
	v1Router "github.com/sagiri2004/goportal/pkg/routers/v1"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func InitRouter() *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		if param.Method == "OPTIONS" {
			return ""
		}
		return fmt.Sprintf("[GIN] %s | %3d | %13v | %15s | %-7s %q\n",
			param.TimeStamp.Format("2006/01/02 - 15:04:05"),
			param.StatusCode,
			param.Latency.Truncate(time.Microsecond),
			param.ClientIP,
			param.Method,
			param.Path,
		)
	}))

	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.Use(middlewares.ErrorMiddleware())
	r.Static("/uploads", "./uploads")

	api := r.Group("/api/v1")
	v1Router.RegisterRoutes(api)

	return r
}
