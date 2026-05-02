package impl

import (
	"archive/zip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/google/uuid"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

const (
	gamesStorageDir              = "uploads/games"
	maxExtractedFiles            = 2000
	maxExtractedTotal            = int64(300 * 1024 * 1024)
	maxGameScreenshots           = 8
	defaultRoomTTLSeconds        = int64(60 * 60)
	maxRoomPlayers               = 8
	reviewRateLimitWindowSeconds = int64(60)
	reviewRateLimitCount         = int64(5)
	ratingRateLimitCount         = int64(20)
	reportRateLimitCount         = int64(10)
	gameRoomRealtimeTopic        = "game.room.events"
)

var allowedGameAssetExtensions = map[string]struct{}{
	".html": {}, ".js": {}, ".css": {}, ".json": {}, ".png": {}, ".jpg": {}, ".jpeg": {},
	".gif": {}, ".svg": {}, ".webp": {}, ".ico": {}, ".wasm": {}, ".map": {},
	".mp3": {}, ".ogg": {}, ".wav": {}, ".m4a": {}, ".txt": {}, ".woff": {}, ".woff2": {},
	".ttf": {}, ".otf": {},
}

type gameService struct {
	repo       repositories.GameRepository
	storage    services.StorageService
	messageSvc services.MessageService
	notifySvc  services.NotificationService
	publisher  message.Publisher
}

func NewGameService(
	repo repositories.GameRepository,
	storage services.StorageService,
	messageSvc services.MessageService,
	notifySvc services.NotificationService,
	publisher message.Publisher,
) services.GameService {
	return &gameService{
		repo:       repo,
		storage:    storage,
		messageSvc: messageSvc,
		notifySvc:  notifySvc,
		publisher:  publisher,
	}
}

func (s *gameService) CreateGame(ctx context.Context, actorID string, input services.GameCreateInput) (*models.UserGame, error) {
	input.SourceType = models.GameSourceTypeCommunity
	return s.createGameInternal(ctx, actorID, input)
}

func (s *gameService) CreateSystemGame(ctx context.Context, actorID string, input services.GameCreateInput) (*models.UserGame, error) {
	input.SourceType = models.GameSourceTypeSystem
	return s.createGameInternal(ctx, actorID, input)
}

func (s *gameService) createGameInternal(ctx context.Context, actorID string, input services.GameCreateInput) (*models.UserGame, error) {
	title := strings.TrimSpace(input.Title)
	slug := sanitizeSlug(input.Slug)
	if title == "" || slug == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	visibility := strings.TrimSpace(input.Visibility)
	if visibility == "" {
		visibility = models.GameVisibilityPublic
	}
	if visibility != models.GameVisibilityPublic && visibility != models.GameVisibilityPrivate {
		return nil, apperr.E("INVALID_ACTION", nil)
	}

	sourceType := strings.TrimSpace(input.SourceType)
	if sourceType == "" {
		sourceType = models.GameSourceTypeCommunity
	}
	if sourceType != models.GameSourceTypeCommunity && sourceType != models.GameSourceTypeSystem {
		return nil, apperr.E("INVALID_ACTION", nil)
	}

	publishState := models.GamePublishStateDraft
	if sourceType == models.GameSourceTypeSystem {
		publishState = models.GamePublishStatePublished
	}

	category := normalizeOptionalText(input.Category)
	ageRating := normalizeOptionalText(input.AgeRating)
	tags := normalizeTags(input.Tags)
	iconURL := normalizeOptionalText(input.IconURL)
	capsuleURL := normalizeOptionalText(input.CapsuleURL)
	heroImageURL := normalizeOptionalText(input.HeroImageURL)
	trailerURL := normalizeOptionalText(input.TrailerURL)
	screenshotURLs := normalizeMediaURLs(input.ScreenshotURLs, maxGameScreenshots)
	thumbnailURL := normalizeOptionalText(input.ThumbnailURL)
	if thumbnailURL == nil {
		thumbnailURL = capsuleURL
	}

	if sourceType == models.GameSourceTypeCommunity {
		if iconURL == nil || capsuleURL == nil || heroImageURL == nil || len(screenshotURLs) == 0 {
			return nil, apperr.E("GAME_ASSET_REQUIRED", nil)
		}
	}

	game := &models.UserGame{
		OwnerUserID:     actorID,
		SourceType:      sourceType,
		Title:           title,
		Slug:            slug,
		Description:     normalizeOptionalText(input.Description),
		Visibility:      visibility,
		Status:          models.GameStatusPublished,
		PublishState:    publishState,
		Category:        category,
		Tags:            tags,
		AgeRating:       ageRating,
		FeaturedScore:   0,
		CreatedBy:       actorID,
		ThumbnailURL:    thumbnailURL,
		IconURL:         iconURL,
		CapsuleImageURL: capsuleURL,
		HeroImageURL:    heroImageURL,
		ScreenshotURLs:  screenshotURLs,
		TrailerURL:      trailerURL,
	}
	if sourceType == models.GameSourceTypeSystem {
		now := time.Now().Unix()
		game.ApprovedBy = &actorID
		game.ApprovedAt = &now
	}
	if err := s.repo.CreateGame(ctx, game); err != nil {
		return nil, err
	}
	return game, nil
}

func (s *gameService) ListPublishedGames(ctx context.Context) ([]services.GameWithBuild, error) {
	return s.ListMarketGames(ctx, services.GameMarketFilter{
		Sort:   "trending",
		Limit:  50,
		Offset: 0,
	})
}

func (s *gameService) ListMarketGames(ctx context.Context, filter services.GameMarketFilter) ([]services.GameWithBuild, error) {
	games, err := s.repo.ListMarketGames(ctx, repositories.GameMarketFilter{
		SourceType: strings.TrimSpace(filter.SourceType),
		Query:      strings.TrimSpace(filter.Query),
		Category:   strings.TrimSpace(filter.Category),
		Sort:       normalizeSort(filter.Sort),
		Limit:      filter.Limit,
		Offset:     filter.Offset,
	})
	if err != nil {
		return nil, err
	}
	return s.attachLatestBuilds(ctx, games), nil
}

func (s *gameService) ListTrendingGames(ctx context.Context, sourceType string, limit int) ([]services.GameWithBuild, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	games, err := s.repo.ListMarketGames(ctx, repositories.GameMarketFilter{
		SourceType: strings.TrimSpace(sourceType),
		Sort:       "trending",
		Limit:      200,
		Offset:     0,
	})
	if err != nil {
		return nil, err
	}
	if len(games) == 0 {
		return []services.GameWithBuild{}, nil
	}

	gameIDs := make([]string, 0, len(games))
	for _, g := range games {
		gameIDs = append(gameIDs, g.ID)
	}
	rows, err := s.repo.ListTrendingRows(ctx, gameIDs)
	if err != nil {
		return nil, err
	}
	rowByID := make(map[string]repositories.GameTrendingRow, len(rows))
	for _, row := range rows {
		rowByID[row.GameID] = row
	}
	for i := range games {
		row := rowByID[games[i].ID]
		score := calculateTrendingScore(row, games[i].FeaturedScore)
		games[i].TrendingScore = score
	}
	sort.SliceStable(games, func(i, j int) bool {
		if games[i].TrendingScore == games[j].TrendingScore {
			return games[i].UpdatedAt > games[j].UpdatedAt
		}
		return games[i].TrendingScore > games[j].TrendingScore
	})
	if len(games) > limit {
		games = games[:limit]
	}
	return s.attachLatestBuilds(ctx, games), nil
}

func (s *gameService) SearchGames(ctx context.Context, query, sourceType string, limit, offset int) ([]services.GameWithBuild, error) {
	return s.ListMarketGames(ctx, services.GameMarketFilter{
		SourceType: sourceType,
		Query:      query,
		Sort:       "trending",
		Limit:      limit,
		Offset:     offset,
	})
}

func (s *gameService) ListMyGames(ctx context.Context, actorID string) ([]services.GameWithBuild, error) {
	games, err := s.repo.ListGamesByOwner(ctx, actorID)
	if err != nil {
		return nil, err
	}
	return s.attachLatestBuilds(ctx, games), nil
}

func (s *gameService) GetGameDetail(ctx context.Context, actorID, gameID string) (*services.GameWithBuild, error) {
	game, err := s.repo.FindGameByID(ctx, gameID)
	if err != nil {
		return nil, err
	}
	if game.Status != models.GameStatusPublished {
		return nil, apperr.E("GAME_NOT_AVAILABLE", nil)
	}
	if game.PublishState != models.GamePublishStatePublished && game.OwnerUserID != actorID {
		return nil, apperr.E("GAME_NOT_AVAILABLE", nil)
	}
	if game.Visibility == models.GameVisibilityPrivate && game.OwnerUserID != actorID {
		return nil, apperr.E("GAME_FORBIDDEN", nil)
	}
	build, _ := s.repo.FindLatestReadyBuildByGameID(ctx, gameID)
	return &services.GameWithBuild{Game: *game, Build: build}, nil
}

func (s *gameService) CreateBuild(ctx context.Context, actorID string, input services.GameBuildCreateInput) (*models.UserGameBuild, error) {
	game, err := s.repo.FindGameByID(ctx, input.GameID)
	if err != nil {
		return nil, err
	}
	if game.OwnerUserID != actorID {
		return nil, apperr.E("GAME_FORBIDDEN", nil)
	}
	if input.File == nil {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	version := strings.TrimSpace(input.Version)
	if version == "" {
		version = "v1"
	}

	uploaded, err := s.storage.Upload(ctx, input.File, services.UploadOptions{
		MediaType: services.MediaTypeGameBundle,
	})
	if err != nil {
		return nil, err
	}

	checksum, err := computeSHA256(input.File)
	if err != nil {
		return nil, apperr.E("UPLOAD_FAILED", err)
	}

	build := &models.UserGameBuild{
		ID:            uuid.NewString(),
		GameID:        game.ID,
		Version:       version,
		StorageZipURL: uploaded.URL,
		PlayBasePath:  "/game-content/" + game.ID,
		EntryFile:     "index.html",
		FileSize:      uploaded.FileSize,
		Status:        models.GameBuildStatusReady,
		Checksum:      &checksum,
	}
	if err := s.extractBundle(input.File, game.ID, build.ID); err != nil {
		build.Status = models.GameBuildStatusFailed
		msg := err.Error()
		build.ErrorMessage = &msg
		_ = s.repo.CreateBuild(ctx, build)
		return nil, err
	}
	build.PlayBasePath = "/game-content/" + game.ID + "/" + build.ID
	if err := s.repo.CreateBuild(ctx, build); err != nil {
		return nil, err
	}
	return build, nil
}

func (s *gameService) SubmitForReview(ctx context.Context, actorID, gameID string) (*models.UserGame, error) {
	game, err := s.repo.FindGameByID(ctx, gameID)
	if err != nil {
		return nil, err
	}
	if game.OwnerUserID != actorID {
		return nil, apperr.E("GAME_FORBIDDEN", nil)
	}
	if game.SourceType != models.GameSourceTypeCommunity {
		return nil, apperr.E("INVALID_ACTION", nil)
	}

	build, err := s.repo.FindLatestReadyBuildByGameID(ctx, gameID)
	if err != nil || build == nil {
		return nil, apperr.E("GAME_BUILD_NOT_FOUND", nil)
	}

	game.PublishState = models.GamePublishStatePendingReview
	if err := s.repo.UpdateGame(ctx, game); err != nil {
		return nil, err
	}
	_ = s.appendAuditLog(ctx, game.ID, actorID, "submit_review", map[string]any{
		"publish_state": game.PublishState,
	})
	return game, nil
}

func (s *gameService) UpdatePublishState(ctx context.Context, actorID, gameID, publishState, note string) (*models.UserGame, error) {
	game, err := s.repo.FindGameByID(ctx, gameID)
	if err != nil {
		return nil, err
	}
	switch publishState {
	case models.GamePublishStateDraft,
		models.GamePublishStatePendingReview,
		models.GamePublishStatePublished,
		models.GamePublishStateRejected,
		models.GamePublishStateSuspended:
	default:
		return nil, apperr.E("INVALID_ACTION", nil)
	}

	game.PublishState = publishState
	if publishState == models.GamePublishStatePublished {
		now := time.Now().Unix()
		game.ApprovedBy = &actorID
		game.ApprovedAt = &now
	}
	if err := s.repo.UpdateGame(ctx, game); err != nil {
		return nil, err
	}
	_ = s.appendAuditLog(ctx, game.ID, actorID, "publish_state_update", map[string]any{
		"publish_state": publishState,
		"note":          strings.TrimSpace(note),
	})
	return game, nil
}

func (s *gameService) FeatureGame(ctx context.Context, actorID string, input services.GameCurationInput) (*models.GameCuration, error) {
	game, err := s.repo.FindGameByID(ctx, input.GameID)
	if err != nil {
		return nil, err
	}
	if game.PublishState != models.GamePublishStatePublished {
		return nil, apperr.E("GAME_NOT_AVAILABLE", nil)
	}

	collection := strings.TrimSpace(strings.ToLower(input.CollectionKey))
	if collection == "" {
		collection = "featured"
	}
	curation := &models.GameCuration{
		GameID:        game.ID,
		CuratedBy:     actorID,
		CollectionKey: collection,
		Priority:      input.Priority,
		Note:          normalizeOptionalText(input.Note),
		StartsAt:      input.StartsAt,
		EndsAt:        input.EndsAt,
		IsActive:      input.IsActive,
	}
	if err := s.repo.UpsertCuration(ctx, curation); err != nil {
		return nil, err
	}
	game.FeaturedScore = float64(input.Priority)
	if err := s.repo.UpdateGame(ctx, game); err != nil {
		return nil, err
	}
	_ = s.appendAuditLog(ctx, game.ID, actorID, "feature_game", map[string]any{
		"collection_key": collection,
		"priority":       input.Priority,
	})
	return curation, nil
}

func (s *gameService) ListReviewQueue(ctx context.Context, actorID string, limit, offset int) ([]services.GameWithBuild, error) {
	games, err := s.repo.ListGamesByPublishState(ctx, models.GamePublishStatePendingReview, limit, offset)
	if err != nil {
		return nil, err
	}
	return s.attachLatestBuilds(ctx, games), nil
}

func (s *gameService) ModerateReview(ctx context.Context, actorID, reviewID, status, note string) (*models.GameReview, error) {
	review, err := s.repo.FindReviewByID(ctx, reviewID)
	if err != nil {
		return nil, err
	}
	switch status {
	case models.GameReviewStatusVisible, models.GameReviewStatusHidden, models.GameReviewStatusFlagged:
	default:
		return nil, apperr.E("INVALID_ACTION", nil)
	}
	review.Status = status
	review.ModeratedBy = &actorID
	now := time.Now().Unix()
	review.ModeratedAt = &now
	n := strings.TrimSpace(note)
	if n != "" {
		review.ModerationNote = &n
	}
	if err := s.repo.UpdateReview(ctx, review); err != nil {
		return nil, err
	}
	_ = s.appendAuditLog(ctx, review.GameID, actorID, "moderate_review", map[string]any{
		"review_id": review.ID,
		"status":    status,
		"note":      n,
	})
	return review, nil
}

func (s *gameService) RateGame(ctx context.Context, actorID string, input services.GameRatingInput) (*models.GameRating, error) {
	if input.Score < 1 || input.Score > 5 {
		return nil, apperr.E("INVALID_ACTION", nil)
	}
	if _, err := s.repo.FindGameByID(ctx, input.GameID); err != nil {
		return nil, err
	}
	if err := s.assertRateLimitRating(ctx, actorID); err != nil {
		return nil, err
	}
	rating := &models.GameRating{
		GameID: input.GameID,
		UserID: actorID,
		Score:  input.Score,
	}
	if err := s.repo.UpsertRating(ctx, rating); err != nil {
		return nil, err
	}
	if err := s.refreshGameRatingAggregate(ctx, input.GameID); err != nil {
		return nil, err
	}
	return rating, nil
}

func (s *gameService) AddReview(ctx context.Context, actorID string, input services.GameReviewInput) (*models.GameReview, error) {
	if _, err := s.repo.FindGameByID(ctx, input.GameID); err != nil {
		return nil, err
	}
	content := strings.TrimSpace(input.Content)
	if content == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if err := s.assertRateLimitReview(ctx, actorID); err != nil {
		return nil, err
	}
	review := &models.GameReview{
		GameID:      input.GameID,
		UserID:      actorID,
		Title:       normalizeOptionalText(input.Title),
		Content:     content,
		RatingScore: input.Score,
		Status:      models.GameReviewStatusVisible,
	}
	if review.RatingScore != nil && (*review.RatingScore < 1 || *review.RatingScore > 5) {
		return nil, apperr.E("INVALID_ACTION", nil)
	}
	if err := s.repo.CreateReview(ctx, review); err != nil {
		return nil, err
	}
	if review.RatingScore != nil {
		if _, err := s.RateGame(ctx, actorID, services.GameRatingInput{
			GameID: input.GameID,
			Score:  *review.RatingScore,
		}); err != nil {
			return nil, err
		}
	}
	return review, nil
}

func (s *gameService) ListReviews(ctx context.Context, actorID, gameID, status string, limit, offset int) ([]models.GameReview, error) {
	filterStatus := strings.TrimSpace(status)
	if filterStatus == "" {
		filterStatus = models.GameReviewStatusVisible
	}
	return s.repo.ListReviews(ctx, repositories.GameReviewFilter{
		GameID: gameID,
		Status: filterStatus,
		Limit:  limit,
		Offset: offset,
	})
}

func (s *gameService) ReportGame(ctx context.Context, actorID string, input services.GameReportInput) (*models.GameReport, error) {
	if _, err := s.repo.FindGameByID(ctx, input.GameID); err != nil {
		return nil, err
	}
	reason := strings.TrimSpace(strings.ToLower(input.Reason))
	if reason == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if err := s.assertRateLimitReport(ctx, actorID); err != nil {
		return nil, err
	}
	report := &models.GameReport{
		GameID:         input.GameID,
		ReporterUserID: actorID,
		Reason:         reason,
		Detail:         normalizeOptionalText(input.Detail),
		Status:         models.GameReportStatusOpen,
	}
	if err := s.repo.CreateReport(ctx, report); err != nil {
		return nil, err
	}
	return report, nil
}

func (s *gameService) CreatePlaySession(ctx context.Context, actorID, gameID string) (*services.GamePlaySession, error) {
	game, err := s.repo.FindGameByID(ctx, gameID)
	if err != nil {
		return nil, err
	}
	if game.Status != models.GameStatusPublished {
		return nil, apperr.E("GAME_NOT_AVAILABLE", nil)
	}
	if game.Visibility == models.GameVisibilityPrivate && game.OwnerUserID != actorID {
		return nil, apperr.E("GAME_FORBIDDEN", nil)
	}
	build, err := s.repo.FindLatestReadyBuildByGameID(ctx, game.ID)
	if err != nil {
		return nil, err
	}
	_ = s.repo.IncrementGameLaunch(ctx, game.ID)
	_ = s.repo.UpsertDailyMetrics(ctx, game.ID, 1)
	_ = s.refreshGameTrending(ctx, game.ID)

	return &services.GamePlaySession{
		PlayURL:   build.PlayBasePath + "/" + build.EntryFile,
		Title:     game.Title,
		Version:   build.Version,
		GameID:    game.ID,
		EntryFile: build.EntryFile,
	}, nil
}

func (s *gameService) StartSession(ctx context.Context, actorID string, input services.GameSessionStartInput) (*models.GameSession, error) {
	game, err := s.repo.FindGameByID(ctx, strings.TrimSpace(input.GameID))
	if err != nil {
		return nil, err
	}
	if err := assertGameVisibleForActor(game, actorID); err != nil {
		return nil, err
	}
	now := time.Now().Unix()
	session := &models.GameSession{
		GameID:     game.ID,
		UserID:     actorID,
		ChannelID:  input.ChannelID,
		RoomID:     input.RoomID,
		Status:     models.GameSessionStatusActive,
		StartedAt:  now,
		LastSeenAt: now,
		Metadata:   input.Metadata,
	}
	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (s *gameService) RecordEvent(ctx context.Context, actorID string, input services.GameEventInput) (*models.GameEvent, error) {
	session, err := s.repo.FindSessionByID(ctx, strings.TrimSpace(input.SessionID))
	if err != nil {
		return nil, err
	}
	if session.UserID != actorID || session.GameID != strings.TrimSpace(input.GameID) {
		return nil, apperr.E("GAME_FORBIDDEN", nil)
	}
	if session.Status != models.GameSessionStatusActive {
		return nil, apperr.E("GAME_SESSION_EXPIRED", nil)
	}

	eventType := strings.TrimSpace(strings.ToLower(input.EventType))
	switch eventType {
	case models.GameEventTypeScore, models.GameEventTypeAchievement, models.GameEventTypeState, models.GameEventTypeSessionEnd:
	default:
		return nil, apperr.E("GAME_EVENT_TYPE_INVALID", nil)
	}

	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if idempotencyKey != "" {
		existing, err := s.repo.FindEventByIdempotency(ctx, session.ID, idempotencyKey)
		if err == nil && existing != nil {
			return existing, nil
		}
		if ae, ok := apperr.From(err); ok && ae.Code != "GAME_EVENT_NOT_FOUND" {
			return nil, err
		}
	}

	event := &models.GameEvent{
		GameID:           session.GameID,
		SessionID:        session.ID,
		UserID:           actorID,
		EventType:        eventType,
		Score:            input.Score,
		AchievementCode:  normalizeOptionalText(input.AchievementCode),
		AchievementTitle: normalizeOptionalText(input.AchievementTitle),
		Payload:          input.Payload,
	}
	if idempotencyKey != "" {
		event.IdempotencyKey = &idempotencyKey
	}
	if err := s.repo.CreateEvent(ctx, event); err != nil {
		return nil, err
	}

	now := time.Now().Unix()
	session.LastSeenAt = now
	if eventType == models.GameEventTypeSessionEnd {
		session.Status = models.GameSessionStatusEnded
		session.EndedAt = &now
	}
	_ = s.repo.UpdateSession(ctx, session)

	if eventType == models.GameEventTypeState {
		s.handleRoomStateSnapshot(ctx, actorID, event)
	}
	return event, nil
}

func (s *gameService) ShareToChannel(ctx context.Context, actorID string, input services.GameShareInput) error {
	if s.messageSvc == nil {
		return apperr.E("INTERNAL_ERROR", nil)
	}
	game, err := s.repo.FindGameByID(ctx, strings.TrimSpace(input.GameID))
	if err != nil {
		return err
	}
	if err := assertGameVisibleForActor(game, actorID); err != nil {
		return err
	}
	channelID := strings.TrimSpace(input.ChannelID)
	if channelID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}

	shareType := strings.TrimSpace(strings.ToLower(input.ShareType))
	if shareType == "" {
		shareType = "game"
	}
	payload := map[string]any{
		"share_type":     shareType,
		"game_id":        game.ID,
		"title":          game.Title,
		"thumbnail_url":  game.ThumbnailURL,
		"hero_image_url": game.HeroImageURL,
		"play_url":       "/games/" + game.ID + "/play",
		"details_url":    "/games/" + game.ID,
	}
	if input.Score != nil {
		payload["score"] = *input.Score
	}
	if v := normalizeOptionalText(input.Achievement); v != nil {
		payload["achievement"] = *v
	}
	if v := normalizeOptionalText(input.Comment); v != nil {
		payload["comment"] = *v
	}
	if input.SessionID != nil {
		payload["session_id"] = strings.TrimSpace(*input.SessionID)
	}
	if input.EventID != nil {
		payload["event_id"] = strings.TrimSpace(*input.EventID)
	}
	contentRaw, err := json.Marshal(payload)
	if err != nil {
		return apperr.E("INTERNAL_ERROR", err)
	}
	_, err = s.messageSvc.CreateMessage(ctx, services.CreateMessageInput{
		ChannelID:      channelID,
		AuthorID:       actorID,
		ContentType:    "game/share",
		ContentPayload: contentRaw,
		Encoding:       "utf-8",
	})
	return err
}

func (s *gameService) CreateRoom(ctx context.Context, actorID string, input services.GameRoomCreateInput) (*services.GameRoomResponse, error) {
	game, err := s.repo.FindGameByID(ctx, strings.TrimSpace(input.GameID))
	if err != nil {
		return nil, err
	}
	if err := assertGameVisibleForActor(game, actorID); err != nil {
		return nil, err
	}
	now := time.Now().Unix()
	_ = s.repo.CloseExpiredRooms(ctx, now)

	maxPlayers := input.MaxPlayers
	if maxPlayers <= 1 || maxPlayers > maxRoomPlayers {
		maxPlayers = maxRoomPlayers
	}
	room := &models.GameRoom{
		GameID:       game.ID,
		ChannelID:    input.ChannelID,
		HostUserID:   actorID,
		RoomCode:     strings.ToUpper(uuid.NewString()[:8]),
		RoomName:     normalizeOptionalText(input.RoomName),
		Status:       models.GameRoomStatusOpen,
		MaxPlayers:   maxPlayers,
		StateVersion: 1,
		ExpiresAt:    now + defaultRoomTTLSeconds,
		LastActiveAt: now,
	}
	if err := s.repo.CreateRoom(ctx, room); err != nil {
		return nil, err
	}
	member := &models.GameRoomMember{
		RoomID:     room.ID,
		UserID:     actorID,
		Role:       models.GameRoomMemberRoleHost,
		Status:     models.GameRoomMemberStatusJoined,
		JoinedAt:   now,
		LastSeenAt: now,
	}
	if err := s.repo.UpsertRoomMember(ctx, member); err != nil {
		return nil, err
	}
	s.emitRoomMemberEvent(ctx, room, []models.GameRoomMember{*member}, "GAME_ROOM_CREATED", actorID)
	return &services.GameRoomResponse{Room: *room, Members: []models.GameRoomMember{*member}}, nil
}

func (s *gameService) JoinRoom(ctx context.Context, actorID, gameID, roomID string) (*services.GameRoomResponse, error) {
	now := time.Now().Unix()
	_ = s.repo.CloseExpiredRooms(ctx, now)

	room, err := s.repo.FindRoomByID(ctx, strings.TrimSpace(roomID))
	if err != nil {
		return nil, err
	}
	if room.GameID != strings.TrimSpace(gameID) {
		return nil, apperr.E("GAME_ROOM_NOT_FOUND", nil)
	}
	if room.Status != models.GameRoomStatusOpen || room.ExpiresAt <= now {
		return nil, apperr.E("GAME_ROOM_CLOSED", nil)
	}

	activeCount, err := s.repo.CountActiveRoomMembers(ctx, room.ID)
	if err != nil {
		return nil, err
	}
	existingMembers, err := s.repo.ListRoomMembers(ctx, repositories.GameRoomMemberFilter{
		RoomID:     room.ID,
		OnlyJoined: true,
		UserID:     actorID,
		Limit:      1,
	})
	if err != nil {
		return nil, err
	}
	alreadyJoined := len(existingMembers) > 0
	if !alreadyJoined && activeCount >= int64(room.MaxPlayers) {
		return nil, apperr.E("GAME_ROOM_FULL", nil)
	}

	member := &models.GameRoomMember{
		RoomID:     room.ID,
		UserID:     actorID,
		Role:       models.GameRoomMemberRolePlayer,
		Status:     models.GameRoomMemberStatusJoined,
		JoinedAt:   now,
		LastSeenAt: now,
	}
	if actorID == room.HostUserID {
		member.Role = models.GameRoomMemberRoleHost
	}
	if err := s.repo.UpsertRoomMember(ctx, member); err != nil {
		return nil, err
	}

	room.LastActiveAt = now
	room.ExpiresAt = now + defaultRoomTTLSeconds
	if err := s.repo.UpdateRoom(ctx, room); err != nil {
		return nil, err
	}
	members, err := s.repo.ListRoomMembers(ctx, repositories.GameRoomMemberFilter{
		RoomID:     room.ID,
		OnlyJoined: true,
		Limit:      100,
	})
	if err != nil {
		return nil, err
	}
	s.emitRoomMemberEvent(ctx, room, members, "GAME_ROOM_MEMBER_JOINED", actorID)
	return &services.GameRoomResponse{Room: *room, Members: members}, nil
}

func (s *gameService) LeaveRoom(ctx context.Context, actorID, gameID, roomID string) (*services.GameRoomResponse, error) {
	now := time.Now().Unix()
	room, err := s.repo.FindRoomByID(ctx, strings.TrimSpace(roomID))
	if err != nil {
		return nil, err
	}
	if room.GameID != strings.TrimSpace(gameID) {
		return nil, apperr.E("GAME_ROOM_NOT_FOUND", nil)
	}
	if err := s.repo.SetRoomMemberLeft(ctx, room.ID, actorID, now); err != nil {
		return nil, err
	}
	members, err := s.repo.ListRoomMembers(ctx, repositories.GameRoomMemberFilter{
		RoomID:     room.ID,
		OnlyJoined: true,
		Limit:      100,
	})
	if err != nil {
		return nil, err
	}
	room.LastActiveAt = now
	room.ExpiresAt = now + defaultRoomTTLSeconds
	if len(members) == 0 {
		room.Status = models.GameRoomStatusClosed
	}
	if err := s.repo.UpdateRoom(ctx, room); err != nil {
		return nil, err
	}
	s.emitRoomMemberEvent(ctx, room, members, "GAME_ROOM_MEMBER_LEFT", actorID)
	return &services.GameRoomResponse{Room: *room, Members: members}, nil
}

func (s *gameService) GetRoomState(ctx context.Context, actorID, gameID, roomID string) (*services.GameRoomResponse, error) {
	room, err := s.repo.FindRoomByID(ctx, strings.TrimSpace(roomID))
	if err != nil {
		return nil, err
	}
	if room.GameID != strings.TrimSpace(gameID) {
		return nil, apperr.E("GAME_ROOM_NOT_FOUND", nil)
	}
	membership, err := s.repo.ListRoomMembers(ctx, repositories.GameRoomMemberFilter{
		RoomID:     room.ID,
		OnlyJoined: true,
		UserID:     actorID,
		Limit:      1,
	})
	if err != nil {
		return nil, err
	}
	if len(membership) == 0 {
		return nil, apperr.E("GAME_FORBIDDEN", nil)
	}
	members, err := s.repo.ListRoomMembers(ctx, repositories.GameRoomMemberFilter{
		RoomID:     room.ID,
		OnlyJoined: true,
		Limit:      100,
	})
	if err != nil {
		return nil, err
	}
	return &services.GameRoomResponse{Room: *room, Members: members}, nil
}

func (s *gameService) extractBundle(fileHeader *multipart.FileHeader, gameID, buildID string) error {
	zipFile, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer zipFile.Close()

	tmp, err := os.CreateTemp("", "goportal-game-*.zip")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	defer func() { _ = os.Remove(tmpPath) }()
	if _, err := io.Copy(tmp, zipFile); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}

	reader, err := zip.OpenReader(tmpPath)
	if err != nil {
		return apperr.E("GAME_BUNDLE_INVALID_ZIP", err)
	}
	defer reader.Close()

	targetDir := filepath.Join(gamesStorageDir, gameID, buildID)
	if err := os.RemoveAll(targetDir); err != nil {
		return err
	}
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return err
	}

	fileCount := 0
	var totalSize int64
	indexFound := false

	for _, f := range reader.File {
		name := strings.ReplaceAll(f.Name, "\\", "/")
		cleanName := filepath.Clean(name)
		if cleanName == "." || strings.HasPrefix(cleanName, "..") {
			return apperr.E("GAME_BUNDLE_INVALID_PATH", nil)
		}
		if strings.Contains(cleanName, "../") {
			return apperr.E("GAME_BUNDLE_INVALID_PATH", nil)
		}
		destPath := filepath.Join(targetDir, cleanName)
		if !strings.HasPrefix(destPath, filepath.Clean(targetDir)+string(filepath.Separator)) && filepath.Clean(destPath) != filepath.Clean(targetDir) {
			return apperr.E("GAME_BUNDLE_INVALID_PATH", nil)
		}
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(destPath, 0o755); err != nil {
				return err
			}
			continue
		}

		if f.Mode()&os.ModeSymlink != 0 {
			return apperr.E("GAME_BUNDLE_INVALID_PATH", nil)
		}

		ext := strings.ToLower(filepath.Ext(cleanName))
		if _, ok := allowedGameAssetExtensions[ext]; !ok {
			return apperr.E("GAME_BUNDLE_FILE_TYPE_NOT_ALLOWED", nil)
		}

		fileCount++
		if fileCount > maxExtractedFiles {
			return apperr.E("GAME_BUNDLE_TOO_LARGE", nil)
		}
		totalSize += int64(f.UncompressedSize64)
		if totalSize > maxExtractedTotal {
			return apperr.E("GAME_BUNDLE_TOO_LARGE", nil)
		}

		if err := os.MkdirAll(filepath.Dir(destPath), 0o755); err != nil {
			return err
		}
		dst, err := os.Create(destPath)
		if err != nil {
			return err
		}
		src, err := f.Open()
		if err != nil {
			_ = dst.Close()
			return err
		}
		if _, err := io.Copy(dst, src); err != nil {
			_ = src.Close()
			_ = dst.Close()
			return err
		}
		_ = src.Close()
		_ = dst.Close()

		if strings.EqualFold(cleanName, "index.html") {
			indexFound = true
		}
	}

	if !indexFound {
		return apperr.E("GAME_BUNDLE_MISSING_INDEX", nil)
	}
	return nil
}

func (s *gameService) attachLatestBuilds(ctx context.Context, games []models.UserGame) []services.GameWithBuild {
	result := make([]services.GameWithBuild, 0, len(games))
	for i := range games {
		build, err := s.repo.FindLatestReadyBuildByGameID(ctx, games[i].ID)
		if err != nil {
			continue
		}
		result = append(result, services.GameWithBuild{
			Game:  games[i],
			Build: build,
		})
	}
	return result
}

func normalizeSort(sortValue string) string {
	switch strings.TrimSpace(sortValue) {
	case "top_rated", "newest", "most_played", "featured", "trending":
		return strings.TrimSpace(sortValue)
	default:
		return "trending"
	}
}

func normalizeTags(tags []string) []string {
	if len(tags) == 0 {
		return nil
	}
	out := make([]string, 0, len(tags))
	seen := map[string]struct{}{}
	for _, raw := range tags {
		v := strings.TrimSpace(strings.ToLower(raw))
		if v == "" {
			continue
		}
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	return out
}

func normalizeMediaURLs(values []string, maxItems int) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, raw := range values {
		v := strings.TrimSpace(raw)
		if v == "" {
			continue
		}
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
		if maxItems > 0 && len(out) >= maxItems {
			break
		}
	}
	return out
}

func normalizeOptionalText(value *string) *string {
	if value == nil {
		return nil
	}
	v := strings.TrimSpace(*value)
	if v == "" {
		return nil
	}
	return &v
}

func calculateTrendingScore(row repositories.GameTrendingRow, featured float64) float64 {
	return float64(row.Launches24h)*1.0 +
		float64(row.UniqueUsers24h)*1.8 +
		float64(row.NewRatings24h)*2.5 +
		float64(row.NewReviews24h)*3.2 +
		featured*4.0
}

func (s *gameService) refreshGameRatingAggregate(ctx context.Context, gameID string) error {
	agg, err := s.repo.GetRatingAggregate(ctx, gameID)
	if err != nil {
		return err
	}
	game, err := s.repo.FindGameByID(ctx, gameID)
	if err != nil {
		return err
	}
	game.AvgRating = agg.AvgRating
	game.RatingCount = agg.RatingCount
	return s.repo.UpdateGame(ctx, game)
}

func (s *gameService) refreshGameTrending(ctx context.Context, gameID string) error {
	rows, err := s.repo.ListTrendingRows(ctx, []string{gameID})
	if err != nil || len(rows) == 0 {
		return err
	}
	game, err := s.repo.FindGameByID(ctx, gameID)
	if err != nil {
		return err
	}
	game.TrendingScore = calculateTrendingScore(rows[0], game.FeaturedScore)
	return s.repo.UpdateGame(ctx, game)
}

func (s *gameService) assertRateLimitReview(ctx context.Context, userID string) error {
	since := time.Now().Unix() - reviewRateLimitWindowSeconds
	count, err := s.repo.CountRecentReviewsByUser(ctx, userID, since)
	if err != nil {
		return err
	}
	if count >= reviewRateLimitCount {
		return apperr.E("RATE_LIMITED", nil)
	}
	return nil
}

func (s *gameService) assertRateLimitRating(ctx context.Context, userID string) error {
	since := time.Now().Unix() - reviewRateLimitWindowSeconds
	count, err := s.repo.CountRecentRatingsByUser(ctx, userID, since)
	if err != nil {
		return err
	}
	if count >= ratingRateLimitCount {
		return apperr.E("RATE_LIMITED", nil)
	}
	return nil
}

func (s *gameService) assertRateLimitReport(ctx context.Context, userID string) error {
	since := time.Now().Unix() - reviewRateLimitWindowSeconds
	count, err := s.repo.CountRecentReportsByUser(ctx, userID, since)
	if err != nil {
		return err
	}
	if count >= reportRateLimitCount {
		return apperr.E("RATE_LIMITED", nil)
	}
	return nil
}

func (s *gameService) appendAuditLog(ctx context.Context, gameID, actorID, action string, payload map[string]any) error {
	rawPayload := ""
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		rawPayload = string(b)
	}
	log := &models.GameAuditLog{
		GameID:      gameID,
		ActorUserID: actorID,
		Action:      action,
	}
	if rawPayload != "" {
		log.Payload = &rawPayload
	}
	return s.repo.CreateAuditLog(ctx, log)
}

func assertGameVisibleForActor(game *models.UserGame, actorID string) error {
	if game == nil {
		return apperr.E("GAME_NOT_FOUND", nil)
	}
	if game.Status != models.GameStatusPublished {
		return apperr.E("GAME_NOT_AVAILABLE", nil)
	}
	if game.PublishState != models.GamePublishStatePublished && game.OwnerUserID != actorID {
		return apperr.E("GAME_NOT_AVAILABLE", nil)
	}
	if game.Visibility == models.GameVisibilityPrivate && game.OwnerUserID != actorID {
		return apperr.E("GAME_FORBIDDEN", nil)
	}
	return nil
}

func (s *gameService) handleRoomStateSnapshot(ctx context.Context, actorID string, event *models.GameEvent) {
	if event == nil || len(event.Payload) == 0 {
		return
	}
	var payload struct {
		RoomID       string          `json:"room_id"`
		State        json.RawMessage `json:"state"`
		StateVersion *int64          `json:"state_version"`
	}
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return
	}
	roomID := strings.TrimSpace(payload.RoomID)
	if roomID == "" {
		return
	}
	room, err := s.repo.FindRoomByID(ctx, roomID)
	if err != nil || room.GameID != event.GameID {
		return
	}
	membership, err := s.repo.ListRoomMembers(ctx, repositories.GameRoomMemberFilter{
		RoomID:     room.ID,
		OnlyJoined: true,
		UserID:     actorID,
		Limit:      1,
	})
	if err != nil || len(membership) == 0 {
		return
	}
	now := time.Now().Unix()
	room.LastActiveAt = now
	room.ExpiresAt = now + defaultRoomTTLSeconds
	if len(payload.State) > 0 {
		room.CurrentState = payload.State
	}
	if payload.StateVersion != nil && *payload.StateVersion > room.StateVersion {
		room.StateVersion = *payload.StateVersion
	} else {
		room.StateVersion += 1
	}
	if err := s.repo.UpdateRoom(ctx, room); err != nil {
		return
	}
	members, err := s.repo.ListRoomMembers(ctx, repositories.GameRoomMemberFilter{
		RoomID:     room.ID,
		OnlyJoined: true,
		Limit:      100,
	})
	if err != nil {
		return
	}
	s.emitRoomMemberEvent(ctx, room, members, "GAME_ROOM_STATE_UPDATED", actorID)
}

func (s *gameService) emitRoomMemberEvent(
	ctx context.Context,
	room *models.GameRoom,
	members []models.GameRoomMember,
	eventType string,
	actorID string,
) {
	if room == nil || len(members) == 0 {
		return
	}
	memberIDs := make([]string, 0, len(members))
	for _, member := range members {
		memberIDs = append(memberIDs, member.UserID)
	}
	payload, err := json.Marshal(map[string]any{
		"event_type":    eventType,
		"game_id":       room.GameID,
		"room_id":       room.ID,
		"actor_user_id": actorID,
		"channel_id":    room.ChannelID,
		"room_status":   room.Status,
		"state_version": room.StateVersion,
		"state":         room.CurrentState,
	})
	if err != nil {
		return
	}
	if s.notifySvc != nil {
		for _, member := range members {
			_, _ = s.notifySvc.Dispatch(
				ctx,
				member.UserID,
				"game_room",
				eventType,
				models.NotificationPriorityNormal,
				"game_service",
				payload,
				nil,
			)
		}
	}
	if s.publisher != nil {
		roomEvent := models.GameRoomRealtimeEvent{
			EventID:       uuid.NewString(),
			EventType:     eventType,
			OccurredAt:    time.Now().UTC().Format(time.RFC3339),
			GameID:        room.GameID,
			RoomID:        room.ID,
			ActorUserID:   actorID,
			MemberUserIDs: memberIDs,
			ChannelID:     room.ChannelID,
			RoomStatus:    room.Status,
			StateVersion:  room.StateVersion,
			State:         room.CurrentState,
		}
		raw, err := json.Marshal(roomEvent)
		if err != nil {
			return
		}
		msg := message.NewMessage(roomEvent.EventID, raw)
		msg.SetContext(ctx)
		_ = s.publisher.Publish(gameRoomRealtimeTopic, msg)
	}
}

func sanitizeSlug(raw string) string {
	raw = strings.ToLower(strings.TrimSpace(raw))
	raw = strings.ReplaceAll(raw, "_", "-")
	var out strings.Builder
	lastDash := false
	for _, r := range raw {
		switch {
		case r >= 'a' && r <= 'z':
			out.WriteRune(r)
			lastDash = false
		case r >= '0' && r <= '9':
			out.WriteRune(r)
			lastDash = false
		case r == '-':
			if !lastDash {
				out.WriteRune('-')
				lastDash = true
			}
		default:
			if !lastDash {
				out.WriteRune('-')
				lastDash = true
			}
		}
	}
	return strings.Trim(out.String(), "-")
}

func computeSHA256(fileHeader *multipart.FileHeader) (string, error) {
	f, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(hasher.Sum(nil)), nil
}
