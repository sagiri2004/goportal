package v1

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/serializers"
	"github.com/sagiri2004/goportal/pkg/services"
)

type gameController struct{}

var Game = new(gameController)

func (ctrl *gameController) Create(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	var req serializers.CreateGameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}

	game, err := containers.GameService().CreateGame(c.Request.Context(), actorID, services.GameCreateInput{
		Title:          req.Title,
		Slug:           req.Slug,
		Description:    req.Description,
		Visibility:     req.Visibility,
		ThumbnailURL:   req.ThumbnailURL,
		IconURL:        req.IconURL,
		CapsuleURL:     req.CapsuleURL,
		HeroImageURL:   req.HeroImageURL,
		ScreenshotURLs: req.ScreenshotURLs,
		TrailerURL:     req.TrailerURL,
		Category:       req.Category,
		Tags:           req.Tags,
		AgeRating:      req.AgeRating,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Game created", serializers.NewUserGameResponse(game)))
}

func (ctrl *gameController) List(c *gin.Context) {
	items, err := containers.GameService().ListMarketGames(c.Request.Context(), services.GameMarketFilter{
		SourceType: strings.TrimSpace(c.Query("source_type")),
		Query:      strings.TrimSpace(c.Query("q")),
		Category:   strings.TrimSpace(c.Query("category")),
		Sort:       strings.TrimSpace(c.Query("sort")),
		Limit:      parseIntDefault(c.Query("limit"), 20),
		Offset:     parseIntDefault(c.Query("offset"), 0),
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.GameWithBuildResponse, 0, len(items))
	for _, item := range items {
		resp = append(resp, serializers.NewGameWithBuildResponse(item))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Games fetched", resp))
}

func (ctrl *gameController) Market(c *gin.Context) {
	ctrl.List(c)
}

func (ctrl *gameController) Trending(c *gin.Context) {
	items, err := containers.GameService().ListTrendingGames(
		c.Request.Context(),
		strings.TrimSpace(c.Query("source_type")),
		parseIntDefault(c.Query("limit"), 20),
	)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.GameWithBuildResponse, 0, len(items))
	for _, item := range items {
		resp = append(resp, serializers.NewGameWithBuildResponse(item))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Trending games fetched", resp))
}

func (ctrl *gameController) Search(c *gin.Context) {
	items, err := containers.GameService().SearchGames(
		c.Request.Context(),
		strings.TrimSpace(c.Query("q")),
		strings.TrimSpace(c.Query("source_type")),
		parseIntDefault(c.Query("limit"), 20),
		parseIntDefault(c.Query("offset"), 0),
	)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.GameWithBuildResponse, 0, len(items))
	for _, item := range items {
		resp = append(resp, serializers.NewGameWithBuildResponse(item))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Search results fetched", resp))
}

func (ctrl *gameController) GetByID(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		actorID = ""
	}
	item, err := containers.GameService().GetGameDetail(c.Request.Context(), actorID, c.Param("id"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Game fetched", serializers.NewGameWithBuildResponse(*item)))
}

func (ctrl *gameController) CreateBuild(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("MISSING_FIELDS", "File is required"))
		return
	}

	version := strings.TrimSpace(c.PostForm("version"))
	build, err := containers.GameService().CreateBuild(c.Request.Context(), actorID, services.GameBuildCreateInput{
		GameID:  c.Param("id"),
		Version: version,
		File:    fileHeader,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Game build uploaded", serializers.NewUserGameBuildResponse(build)))
}

func (ctrl *gameController) SubmitForReview(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	game, err := containers.GameService().SubmitForReview(c.Request.Context(), actorID, c.Param("id"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Game submitted for review", serializers.NewUserGameResponse(game)))
}

func (ctrl *gameController) ListMine(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	items, err := containers.GameService().ListMyGames(c.Request.Context(), actorID)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.GameWithBuildResponse, 0, len(items))
	for _, item := range items {
		resp = append(resp, serializers.NewGameWithBuildResponse(item))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "My games fetched", resp))
}

func (ctrl *gameController) Rate(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	var req serializers.CreateRatingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	rating, err := containers.GameService().RateGame(c.Request.Context(), actorID, services.GameRatingInput{
		GameID: c.Param("id"),
		Score:  req.Score,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Game rated", serializers.NewGameRatingResponse(rating)))
}

func (ctrl *gameController) AddReview(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	var req serializers.CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	review, err := containers.GameService().AddReview(c.Request.Context(), actorID, services.GameReviewInput{
		GameID:  c.Param("id"),
		Title:   req.Title,
		Content: req.Content,
		Score:   req.Score,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Review created", serializers.NewGameReviewResponse(review)))
}

func (ctrl *gameController) ListReviews(c *gin.Context) {
	actorID, _ := getCurrentUserID(c)
	reviews, err := containers.GameService().ListReviews(
		c.Request.Context(),
		actorID,
		c.Param("id"),
		c.Query("status"),
		parseIntDefault(c.Query("limit"), 20),
		parseIntDefault(c.Query("offset"), 0),
	)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.GameReviewResponse, 0, len(reviews))
	for i := range reviews {
		resp = append(resp, serializers.NewGameReviewResponse(&reviews[i]))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Reviews fetched", resp))
}

func (ctrl *gameController) Report(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	var req serializers.CreateReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	report, err := containers.GameService().ReportGame(c.Request.Context(), actorID, services.GameReportInput{
		GameID: c.Param("id"),
		Reason: req.Reason,
		Detail: req.Detail,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Report created", serializers.NewGameReportResponse(report)))
}

func (ctrl *gameController) AdminCreateSystemGame(c *gin.Context) {
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, serializers.Error("GAME_FORBIDDEN", "Admin role required"))
		return
	}
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	var req serializers.CreateGameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	game, err := containers.GameService().CreateSystemGame(c.Request.Context(), actorID, services.GameCreateInput{
		Title:          req.Title,
		Slug:           req.Slug,
		Description:    req.Description,
		Visibility:     req.Visibility,
		ThumbnailURL:   req.ThumbnailURL,
		IconURL:        req.IconURL,
		CapsuleURL:     req.CapsuleURL,
		HeroImageURL:   req.HeroImageURL,
		ScreenshotURLs: req.ScreenshotURLs,
		TrailerURL:     req.TrailerURL,
		Category:       req.Category,
		Tags:           req.Tags,
		AgeRating:      req.AgeRating,
		SourceType:     models.GameSourceTypeSystem,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "System game created", serializers.NewUserGameResponse(game)))
}

func (ctrl *gameController) AdminUpdatePublishState(c *gin.Context) {
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, serializers.Error("GAME_FORBIDDEN", "Admin role required"))
		return
	}
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	var req serializers.PublishStateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	game, err := containers.GameService().UpdatePublishState(c.Request.Context(), actorID, c.Param("id"), req.PublishState, req.Note)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Publish state updated", serializers.NewUserGameResponse(game)))
}

func (ctrl *gameController) AdminFeature(c *gin.Context) {
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, serializers.Error("GAME_FORBIDDEN", "Admin role required"))
		return
	}
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	var req serializers.FeatureGameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	curation, err := containers.GameService().FeatureGame(c.Request.Context(), actorID, services.GameCurationInput{
		GameID:        c.Param("id"),
		CollectionKey: req.CollectionKey,
		Priority:      req.Priority,
		Note:          req.Note,
		StartsAt:      req.StartsAt,
		EndsAt:        req.EndsAt,
		IsActive:      req.IsActive,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Game curated", serializers.NewGameCurationResponse(curation)))
}

func (ctrl *gameController) AdminReviewQueue(c *gin.Context) {
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, serializers.Error("GAME_FORBIDDEN", "Admin role required"))
		return
	}
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	items, err := containers.GameService().ListReviewQueue(
		c.Request.Context(),
		actorID,
		parseIntDefault(c.Query("limit"), 20),
		parseIntDefault(c.Query("offset"), 0),
	)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.GameWithBuildResponse, 0, len(items))
	for _, item := range items {
		resp = append(resp, serializers.NewGameWithBuildResponse(item))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Review queue fetched", resp))
}

func (ctrl *gameController) AdminModerateReview(c *gin.Context) {
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, serializers.Error("GAME_FORBIDDEN", "Admin role required"))
		return
	}
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	var req serializers.ModerateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	review, err := containers.GameService().ModerateReview(c.Request.Context(), actorID, c.Param("reviewId"), req.Status, req.Note)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Review moderated", serializers.NewGameReviewResponse(review)))
}

func (ctrl *gameController) PlaySession(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	session, err := containers.GameService().CreatePlaySession(c.Request.Context(), actorID, c.Param("id"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Play session created", session))
}

func (ctrl *gameController) StartSession(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	var req serializers.StartGameSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	metadata := json.RawMessage(nil)
	if req.Metadata != nil {
		raw, err := json.Marshal(req.Metadata)
		if err != nil {
			c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid metadata payload"))
			return
		}
		metadata = raw
	}
	session, err := containers.GameService().StartSession(c.Request.Context(), actorID, services.GameSessionStartInput{
		GameID:    c.Param("id"),
		ChannelID: req.ChannelID,
		RoomID:    req.RoomID,
		Metadata:  metadata,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Game session started", serializers.NewGameSessionResponse(session)))
}

func (ctrl *gameController) AddSessionEvent(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	var req serializers.CreateGameEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	payload := json.RawMessage(nil)
	if req.Payload != nil {
		raw, err := json.Marshal(req.Payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid payload"))
			return
		}
		payload = raw
	}
	event, err := containers.GameService().RecordEvent(c.Request.Context(), actorID, services.GameEventInput{
		GameID:           c.Param("id"),
		SessionID:        c.Param("sessionId"),
		EventType:        req.EventType,
		IdempotencyKey:   req.IdempotencyKey,
		Score:            req.Score,
		AchievementCode:  req.AchievementCode,
		AchievementTitle: req.AchievementTitle,
		Payload:          payload,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Game event stored", serializers.NewGameEventResponse(event)))
}

func (ctrl *gameController) ShareToChannel(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	var req serializers.ShareGameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	if err := containers.GameService().ShareToChannel(c.Request.Context(), actorID, services.GameShareInput{
		GameID:      c.Param("id"),
		ChannelID:   req.ChannelID,
		SessionID:   req.SessionID,
		EventID:     req.EventID,
		ShareType:   req.ShareType,
		RoomID:      req.RoomID,
		RoomName:    req.RoomName,
		Score:       req.Score,
		Achievement: req.Achievement,
		Comment:     req.Comment,
	}); err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Game content shared to channel", nil))
}

func (ctrl *gameController) CreateRoom(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	var req serializers.CreateGameRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	state, err := containers.GameService().CreateRoom(c.Request.Context(), actorID, services.GameRoomCreateInput{
		GameID:     c.Param("id"),
		ChannelID:  req.ChannelID,
		RoomName:   req.RoomName,
		MaxPlayers: req.MaxPlayers,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Game room created", serializers.NewGameRoomStateResponse(state)))
}

func (ctrl *gameController) ListOpenRooms(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	limit := parseIntDefault(c.Query("limit"), 20)
	offset := parseIntDefault(c.Query("offset"), 0)
	items, err := containers.GameService().ListOpenRooms(c.Request.Context(), actorID, services.GameRoomListFilter{
		GameID: c.Param("id"),
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.GameRoomStateResponse, 0, len(items))
	for i := range items {
		state := items[i]
		resp = append(resp, serializers.NewGameRoomStateResponse(&state))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Open rooms fetched", resp))
}

func (ctrl *gameController) JoinRoom(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	state, err := containers.GameService().JoinRoom(c.Request.Context(), actorID, c.Param("id"), c.Param("roomId"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Joined room", serializers.NewGameRoomStateResponse(state)))
}

func (ctrl *gameController) LeaveRoom(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	state, err := containers.GameService().LeaveRoom(c.Request.Context(), actorID, c.Param("id"), c.Param("roomId"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Left room", serializers.NewGameRoomStateResponse(state)))
}

func (ctrl *gameController) RoomState(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	state, err := containers.GameService().GetRoomState(c.Request.Context(), actorID, c.Param("id"), c.Param("roomId"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Room state fetched", serializers.NewGameRoomStateResponse(state)))
}

func (ctrl *gameController) respondError(c *gin.Context, err error) {
	_ = c.Error(err)
	if ae, ok := apperr.From(err); ok {
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
}

func parseIntDefault(value string, defaultValue int) int {
	n, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return defaultValue
	}
	return n
}

func isAdmin(c *gin.Context) bool {
	roleAny, ok := c.Get("role")
	if !ok {
		return false
	}
	role, ok := roleAny.(string)
	if !ok {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(role), "admin")
}
