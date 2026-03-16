package v1

import (
	"goportal/pkg/controllers/v1"
	"goportal/pkg/middlewares"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(api *gin.RouterGroup) {
	auth := api.Group("/auth")
	{
		auth.POST("/register", v1.Auth.Register)
		auth.POST("/login", v1.Auth.Login)
	}

	me := api.Group("/me")
	me.Use(middlewares.AuthMiddleware())
	{
		me.GET("", v1.User.Me)
	}
}
