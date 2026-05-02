package v1

import (
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
		Title:        req.Title,
		Slug:         req.Slug,
		Description:  req.Description,
		Visibility:   req.Visibility,
		ThumbnailURL: req.ThumbnailURL,
		Category:     req.Category,
		Tags:         req.Tags,
		AgeRating:    req.AgeRating,
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
		Title:        req.Title,
		Slug:         req.Slug,
		Description:  req.Description,
		Visibility:   req.Visibility,
		ThumbnailURL: req.ThumbnailURL,
		Category:     req.Category,
		Tags:         req.Tags,
		AgeRating:    req.AgeRating,
		SourceType:   models.GameSourceTypeSystem,
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

func (ctrl *gameController) respondError(c *gin.Context, err error) {
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
