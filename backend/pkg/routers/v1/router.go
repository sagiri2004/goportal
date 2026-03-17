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

	users := api.Group("/users")
	users.Use(middlewares.AuthMiddleware())
	{
		users.GET("/me", v1.User.Me)
		users.PATCH("/me", v1.User.UpdateMe)
	}

	friends := api.Group("/friends")
	friends.Use(middlewares.AuthMiddleware())
	{
		friends.GET("", v1.Social.ListFriends)
		friends.POST("/request", v1.Social.SendFriendRequest)
		friends.PATCH("/response", v1.Social.RespondFriendRequest)
		friends.PATCH("/block", v1.Social.BlockUser)
	}
}
