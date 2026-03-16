package v1

import (
	"github.com/gin-gonic/gin"
	v1 "github.com/sagiri2004/goportal/pkg/controllers/v1"
	"github.com/sagiri2004/goportal/pkg/middlewares"
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
