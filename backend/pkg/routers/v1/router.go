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

	servers := api.Group("/servers")
	servers.Use(middlewares.AuthMiddleware())
	{
		servers.POST("", v1.Server.Create)
		servers.GET("/:id/members", v1.Server.ListMembers)
		servers.DELETE("/:id", v1.Server.Delete)
		servers.DELETE("/:id/members/:userId", v1.Server.KickMember)
		servers.POST("/:id/channels", v1.Channel.Create)
	}

	channels := api.Group("/channels")
	channels.Use(middlewares.AuthMiddleware())
	{
		channels.GET("/:id", v1.Channel.GetByID)
		channels.GET("/:id/messages", v1.Message.ListByChannel)
		channels.PATCH("/:id/position", v1.Channel.UpdatePosition)
	}

	messages := api.Group("/messages")
	messages.Use(middlewares.AuthMiddleware())
	{
		messages.POST("", v1.Message.Create)
		messages.PATCH("/:id", v1.Message.Update)
		messages.DELETE("/:id", v1.Message.Delete)
		messages.POST("/:id/reactions", v1.Message.ToggleReaction)
	}

	upload := api.Group("/upload")
	upload.Use(middlewares.AuthMiddleware())
	{
		upload.POST("", v1.Upload.UploadFile)
	}
}
