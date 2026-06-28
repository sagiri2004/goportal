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
		servers.POST("/:id/tournaments", middlewares.RequireServerPermission(models.PermissionManageChannels, "id"), v1.Tournament.Create)
		servers.GET("/:id/tournaments", v1.Tournament.ListByServer)
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
		channels.POST("/:id/livestream/token", v1.Voice.GenerateLivestreamToken)
		channels.GET("/:id/livestream/state", v1.Voice.GetLivestreamState)
		channels.GET("/:id/voice/participants", v1.Voice.ListParticipants)
		channels.POST("/:id/recording/start", v1.Voice.StartRecording)
		channels.POST("/:id/recording/stop", v1.Voice.StopRecording)
		channels.GET("/:id/recordings", v1.Voice.ListRecordings)
		channels.POST("/:id/stream/start", v1.Voice.StartStream)
		channels.POST("/:id/stream/stop", v1.Voice.StopStream)
		channels.PATCH("/:id/position", v1.Channel.UpdatePosition)
		channels.PATCH("/:id/privacy", v1.Channel.UpdatePrivacy)
		channels.GET("/:id/members", v1.Channel.ListMembers)
		channels.POST("/:id/members", v1.Channel.AddMember)
		channels.DELETE("/:id/members/:userId", v1.Channel.RemoveMember)
		channels.GET("/:id/overwrites", v1.Channel.ListOverwrites)
		channels.PUT("/:id/overwrites", v1.Channel.UpsertOverwrite)
		channels.DELETE("/:id/overwrites/:subjectType/:subjectId", v1.Channel.DeleteOverwrite)
		channels.POST("/:id/read", middlewares.RequireChannelPermission(models.PermissionReadMessages, "id"), v1.Channel.MarkRead)
		channels.GET("/:id/notification-settings", v1.Channel.GetNotificationSetting)
		channels.PUT("/:id/notification-settings", v1.Channel.UpdateNotificationSetting)
	}

	messages := api.Group("/messages")
	messages.Use(middlewares.AuthMiddleware())
	{
		messages.POST("", middlewares.RequireChannelPermissionFromBody(models.PermissionSendMessages, "channel_id"), v1.Message.Create)
		messages.PATCH("/:id", v1.Message.Update)
		messages.DELETE("/:id", v1.Message.Delete)
		messages.POST("/:id/reactions", v1.Message.ToggleReaction)
		messages.DELETE("/:id/reactions/:emoji", v1.Message.RemoveReaction)
	}

	upload := api.Group("/upload")
	upload.Use(middlewares.AuthMiddleware())
	{
		upload.POST("", v1.Upload.UploadFile)
	}

	games := api.Group("/games")
	{
		games.GET("", v1.Game.List)
		games.GET("/market", v1.Game.Market)
		games.GET("/trending", v1.Game.Trending)
		games.GET("/search", v1.Game.Search)
		games.GET("/me", middlewares.AuthMiddleware(), v1.Game.ListMine)
		games.GET("/:id", v1.Game.GetByID)
		games.GET("/:id/reviews", v1.Game.ListReviews)
	}

	gamesAuth := api.Group("/games")
	gamesAuth.Use(middlewares.AuthMiddleware())
	{
		gamesAuth.POST("", v1.Game.Create)
		gamesAuth.POST("/:id/builds", v1.Game.CreateBuild)
		gamesAuth.POST("/:id/session/start", v1.Game.StartSession)
		gamesAuth.POST("/:id/sessions/:sessionId/events", v1.Game.AddSessionEvent)
		gamesAuth.POST("/:id/scores", v1.Game.SubmitScore)
		gamesAuth.GET("/:id/leaderboards/:leaderboardId", v1.Game.Leaderboard)
		gamesAuth.POST("/:id/share", v1.Game.ShareToChannel)
		gamesAuth.POST("/:id/rooms", v1.Game.CreateRoom)
		gamesAuth.GET("/:id/rooms/open", v1.Game.ListOpenRooms)
		gamesAuth.POST("/:id/rooms/:roomId/join", v1.Game.JoinRoom)
		gamesAuth.POST("/:id/rooms/:roomId/leave", v1.Game.LeaveRoom)
		gamesAuth.GET("/:id/rooms/:roomId/state", v1.Game.RoomState)
		gamesAuth.POST("/:id/submit-review", v1.Game.SubmitForReview)
		gamesAuth.POST("/:id/ratings", v1.Game.Rate)
		gamesAuth.POST("/:id/reviews", v1.Game.AddReview)
		gamesAuth.POST("/:id/reports", v1.Game.Report)
		gamesAuth.GET("/:id/play-session", v1.Game.PlaySession)
	}

	admin := api.Group("/admin")
	admin.Use(middlewares.AuthMiddleware())
	{
		adminGames := admin.Group("/games")
		adminGames.POST("/system", v1.Game.AdminCreateSystemGame)
		adminGames.PATCH("/:id/publish-state", v1.Game.AdminUpdatePublishState)
		adminGames.POST("/:id/feature", v1.Game.AdminFeature)
		adminGames.GET("/review-queue", v1.Game.AdminReviewQueue)

		adminReviews := admin.Group("/reviews")
		adminReviews.PATCH("/:reviewId/moderate", v1.Game.AdminModerateReview)
	}

	tournaments := api.Group("/tournaments")
	tournaments.Use(middlewares.AuthMiddleware())
	{
		tournaments.GET("/:id", v1.Tournament.GetByID)
		tournaments.PATCH("/:id", v1.Tournament.Update)
		tournaments.DELETE("/:id", v1.Tournament.Delete)
		tournaments.PATCH("/:id/status", v1.Tournament.UpdateStatus)
		tournaments.POST("/:id/participants", v1.Tournament.RegisterParticipant)
		tournaments.DELETE("/:id/participants/me", v1.Tournament.CancelMyRegistration)
		tournaments.POST("/:id/participants/:participantId/checkin", v1.Tournament.CheckInParticipant)
		tournaments.DELETE("/:id/participants/:participantId", v1.Tournament.RemoveParticipant)
		tournaments.PATCH("/:id/participants/:participantId/seed", v1.Tournament.UpdateParticipantSeed)
		tournaments.POST("/:id/participants/bulk", v1.Tournament.BulkParticipants)
		tournaments.POST("/:id/teams", v1.Tournament.CreateTeam)
		tournaments.GET("/:id/teams", v1.Tournament.ListTeams)
		tournaments.POST("/:id/teams/:teamId/members", v1.Tournament.AddTeamMember)
		tournaments.DELETE("/:id/teams/:teamId/members/:userId", v1.Tournament.RemoveTeamMember)
		tournaments.DELETE("/:id/teams/:teamId", v1.Tournament.DeleteTeam)
		tournaments.GET("/:id/bracket", v1.Tournament.GetBracket)
		tournaments.GET("/:id/matches", v1.Tournament.ListMatches)
		tournaments.GET("/:id/matches/:matchId", v1.Tournament.GetMatch)
		tournaments.PATCH("/:id/matches/:matchId/status", v1.Tournament.UpdateMatchStatus)
		tournaments.POST("/:id/matches/:matchId/result", v1.Tournament.ReportMatchResult)
		tournaments.POST("/:id/matches/:matchId/dispute", v1.Tournament.DisputeMatch)
		tournaments.PATCH("/:id/matches/:matchId/override", v1.Tournament.OverrideMatch)
		tournaments.POST("/:id/matches/:matchId/start", v1.Tournament.StartMatch)
		tournaments.POST("/:id/matches/:matchId/live/close", v1.Tournament.CloseMatchLive)
		tournaments.POST("/:id/matches/:matchId/observer-token", v1.Tournament.GenerateObserverTokens)
		tournaments.GET("/:id/standings", v1.Tournament.Standings)
		tournaments.GET("/:id/participants/:participantId/matches", v1.Tournament.ParticipantMatches)
		tournaments.POST("/:id/roles/ensure", v1.Tournament.EnsureRoles)
		tournaments.GET("/:id/roles/bindings", v1.Tournament.ListRoleBindings)
		tournaments.POST("/:id/roles/bindings", v1.Tournament.BindRole)
		tournaments.DELETE("/:id/roles/:roleCode/bindings/:userId", v1.Tournament.UnbindRole)
		tournaments.POST("/:id/match-workspaces/provision", v1.Tournament.ProvisionMatchWorkspace)
		tournaments.GET("/:id/match-workspaces", v1.Tournament.ListMatchWorkspaces)
	}

	usersHistory := api.Group("/users")
	usersHistory.Use(middlewares.AuthMiddleware())
	{
		usersHistory.GET("/:id/tournaments", v1.Tournament.UserHistory)
	}

	webhooks := api.Group("/webhooks")
	{
		webhooks.POST("/livekit", v1.Voice.LiveKitWebhook)
	}
}
