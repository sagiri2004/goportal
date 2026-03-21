package v1

import (
	"github.com/gin-gonic/gin"
	v1 "github.com/sagiri2004/goportal/pkg/controllers/v1"
	"github.com/sagiri2004/goportal/pkg/middlewares"
	"github.com/sagiri2004/goportal/pkg/models"
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
		servers.GET("", v1.Server.ListMine)
		servers.GET("/:id", v1.Server.GetByID)
		servers.PATCH("/:id", v1.Server.Update)
		servers.POST("", v1.Server.Create)
		servers.POST("/:id/join", v1.Server.JoinPublic)
		servers.POST("/:id/join-requests", v1.Server.CreateJoinRequest)
		servers.GET("/:id/join-requests", middlewares.RequireServerPermission(models.PermissionApproveMembers, "id"), v1.Server.ListJoinRequests)
		servers.PATCH("/:id/join-requests/:requestId", middlewares.RequireServerPermission(models.PermissionApproveMembers, "id"), v1.Server.ReviewJoinRequest)
		servers.GET("/:id/members", v1.Server.ListMembers)
		servers.POST("/:id/members", middlewares.RequireServerPermission(models.PermissionManageServer, "id"), v1.Server.AddMember)
		servers.PATCH("/:id/members/:userId/roles", v1.Server.UpdateMemberRoles)
		servers.POST("/:id/roles", middlewares.RequireServerPermission(models.PermissionManageRoles, "id"), v1.Server.CreateRole)
		servers.GET("/:id/roles", v1.Server.ListRoles)
		servers.PATCH("/:id/roles/:roleId", middlewares.RequireServerPermission(models.PermissionManageRoles, "id"), v1.Server.UpdateRole)
		servers.DELETE("/:id/roles/:roleId", middlewares.RequireServerPermission(models.PermissionManageRoles, "id"), v1.Server.DeleteRole)
		servers.POST("/:id/invites", middlewares.RequireServerPermission(models.PermissionCreateInvite, "id"), v1.Server.CreateInvite)
		servers.DELETE("/:id", v1.Server.Delete)
		servers.DELETE("/:id/members/:userId", v1.Server.KickMember)
		servers.POST("/:id/channels", middlewares.RequireServerPermission(models.PermissionManageChannels, "id"), v1.Channel.Create)
		servers.GET("/:id/channels", v1.Channel.ListByServer)
	}

	invites := api.Group("/invites")
	{
		invites.GET("/:code", v1.Server.GetInvite)
		invites.POST("/:code/join", middlewares.AuthMiddleware(), v1.Server.JoinByInvite)
	}

	channels := api.Group("/channels")
	channels.Use(middlewares.AuthMiddleware())
	{
		channels.GET("/:id", v1.Channel.GetByID)
		channels.GET("/:id/messages", middlewares.RequireChannelPermission(models.PermissionReadMessages, "id"), v1.Message.ListByChannel)
		channels.POST("/:id/voice/token", v1.Voice.GenerateToken)
		channels.GET("/:id/voice/participants", v1.Voice.ListParticipants)
		channels.POST("/:id/recording/start", middlewares.RequireChannelPermission(models.PermissionManageChannels, "id"), v1.Voice.StartRecording)
		channels.POST("/:id/recording/stop", middlewares.RequireChannelPermission(models.PermissionManageChannels, "id"), v1.Voice.StopRecording)
		channels.GET("/:id/recordings", v1.Voice.ListRecordings)
		channels.POST("/:id/stream/start", middlewares.RequireChannelPermission(models.PermissionManageChannels, "id"), v1.Voice.StartStream)
		channels.POST("/:id/stream/stop", middlewares.RequireChannelPermission(models.PermissionManageChannels, "id"), v1.Voice.StopStream)
		channels.PATCH("/:id/position", v1.Channel.UpdatePosition)
		channels.PATCH("/:id/privacy", v1.Channel.UpdatePrivacy)
		channels.GET("/:id/members", v1.Channel.ListMembers)
		channels.POST("/:id/members", v1.Channel.AddMember)
		channels.DELETE("/:id/members/:userId", v1.Channel.RemoveMember)
		channels.GET("/:id/overwrites", v1.Channel.ListOverwrites)
		channels.PUT("/:id/overwrites", v1.Channel.UpsertOverwrite)
		channels.DELETE("/:id/overwrites/:subjectType/:subjectId", v1.Channel.DeleteOverwrite)
	}

	messages := api.Group("/messages")
	messages.Use(middlewares.AuthMiddleware())
	{
		messages.POST("", middlewares.RequireChannelPermissionFromBody(models.PermissionSendMessages, "channel_id"), v1.Message.Create)
		messages.PATCH("/:id", v1.Message.Update)
		messages.DELETE("/:id", v1.Message.Delete)
		messages.POST("/:id/reactions", v1.Message.ToggleReaction)
	}

	upload := api.Group("/upload")
	upload.Use(middlewares.AuthMiddleware())
	{
		upload.POST("", v1.Upload.UploadFile)
	}

	webhooks := api.Group("/webhooks")
	{
		webhooks.POST("/livekit", v1.Voice.LiveKitWebhook)
	}
}
