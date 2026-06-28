package routers

import (
	"fmt"
	"github.com/sagiri2004/goportal/pkg/middlewares"
	"github.com/sagiri2004/goportal/pkg/realtime"
	v1Router "github.com/sagiri2004/goportal/pkg/routers/v1"
	"os"
	"time"

	"github.com/sagiri2004/goportal/global"

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
	r.Static("/game-content", "./uploads/games")
	r.Static("/system-games", resolveStaticDir("system-games", "backend/system-games"))
	if global.RealtimeHub == nil {
		global.RealtimeHub = realtime.NewHub()
	}
	if global.GameHub == nil {
		global.GameHub = realtime.NewGameHub()
	}
	r.GET("/ws", global.RealtimeHub.HandleWS)
	r.GET("/ws/game", global.GameHub.HandleWS)

	api := r.Group("/api/v1")
	v1Router.RegisterRoutes(api)

	return r
}

func resolveStaticDir(candidates ...string) string {
	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate
		}
	}
	if len(candidates) == 0 {
		return "."
	}
	return candidates[0]
}
