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
	reviewRateLimitWindowSeconds = int64(60)
	reviewRateLimitCount         = int64(5)
	ratingRateLimitCount         = int64(20)
	reportRateLimitCount         = int64(10)
)

var allowedGameAssetExtensions = map[string]struct{}{
	".html": {}, ".js": {}, ".css": {}, ".json": {}, ".png": {}, ".jpg": {}, ".jpeg": {},
	".gif": {}, ".svg": {}, ".webp": {}, ".ico": {}, ".wasm": {}, ".map": {},
	".mp3": {}, ".ogg": {}, ".wav": {}, ".m4a": {}, ".txt": {}, ".woff": {}, ".woff2": {},
	".ttf": {}, ".otf": {},
}

type gameService struct {
	repo    repositories.GameRepository
	storage services.StorageService
}

func NewGameService(repo repositories.GameRepository, storage services.StorageService) services.GameService {
	return &gameService{
		repo:    repo,
		storage: storage,
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

	game := &models.UserGame{
		OwnerUserID:   actorID,
		SourceType:    sourceType,
		Title:         title,
		Slug:          slug,
		Description:   normalizeOptionalText(input.Description),
		Visibility:    visibility,
		Status:        models.GameStatusPublished,
		PublishState:  publishState,
		Category:      category,
		Tags:          tags,
		AgeRating:     ageRating,
		FeaturedScore: 0,
		CreatedBy:     actorID,
		ThumbnailURL:  normalizeOptionalText(input.ThumbnailURL),
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
