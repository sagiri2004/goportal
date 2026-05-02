package impl

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"gorm.io/gorm"
)

type gameRepository struct {
	db *gorm.DB
}

func NewGameRepository(db *gorm.DB) repositories.GameRepository {
	return &gameRepository{db: db}
}

func (r *gameRepository) CreateGame(ctx context.Context, game *models.UserGame) error {
	if err := r.db.WithContext(ctx).Create(game).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) UpdateGame(ctx context.Context, game *models.UserGame) error {
	if err := r.db.WithContext(ctx).Save(game).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) FindGameByID(ctx context.Context, id string) (*models.UserGame, error) {
	var game models.UserGame
	if err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at = 0", id).
		First(&game).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("GAME_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &game, nil
}

func (r *gameRepository) FindGameBySlug(ctx context.Context, slug string) (*models.UserGame, error) {
	var game models.UserGame
	if err := r.db.WithContext(ctx).
		Where("slug = ? AND deleted_at = 0", slug).
		First(&game).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("GAME_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &game, nil
}

func (r *gameRepository) ListPublishedGames(ctx context.Context) ([]models.UserGame, error) {
	var games []models.UserGame
	if err := r.db.WithContext(ctx).
		Where("deleted_at = 0 AND status = ? AND visibility = ?", models.GameStatusPublished, models.GameVisibilityPublic).
		Order("created_at DESC").
		Find(&games).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return games, nil
}

func (r *gameRepository) ListMarketGames(ctx context.Context, filter repositories.GameMarketFilter) ([]models.UserGame, error) {
	var games []models.UserGame
	query := r.db.WithContext(ctx).
		Where("deleted_at = 0 AND publish_state = ?", models.GamePublishStatePublished)

	if filter.SourceType != "" {
		query = query.Where("source_type = ?", filter.SourceType)
	}
	if filter.Category != "" {
		query = query.Where("category = ?", filter.Category)
	}
	if filter.Query != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(filter.Query)) + "%"
		query = query.Where(
			"(LOWER(title) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(COALESCE(description,'')) LIKE ?)",
			like, like, like,
		)
	}

	switch filter.Sort {
	case "top_rated":
		query = query.Order("avg_rating DESC, rating_count DESC, updated_at DESC")
	case "newest":
		query = query.Order("created_at DESC")
	case "most_played":
		query = query.Order("launch_count DESC, updated_at DESC")
	case "featured":
		query = query.Order("featured_score DESC, updated_at DESC")
	default:
		query = query.Order("trending_score DESC, updated_at DESC")
	}

	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	if err := query.Limit(limit).Offset(offset).Find(&games).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return games, nil
}

func (r *gameRepository) ListGamesByOwner(ctx context.Context, ownerID string) ([]models.UserGame, error) {
	var games []models.UserGame
	if err := r.db.WithContext(ctx).
		Where("deleted_at = 0 AND owner_user_id = ?", ownerID).
		Order("updated_at DESC").
		Find(&games).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return games, nil
}

func (r *gameRepository) ListGamesByPublishState(ctx context.Context, state string, limit, offset int) ([]models.UserGame, error) {
	var games []models.UserGame
	query := r.db.WithContext(ctx).
		Where("deleted_at = 0")
	if state != "" {
		query = query.Where("publish_state = ?", state)
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	if err := query.Order("updated_at DESC").Limit(limit).Offset(offset).Find(&games).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return games, nil
}

func (r *gameRepository) CreateBuild(ctx context.Context, build *models.UserGameBuild) error {
	if err := r.db.WithContext(ctx).Create(build).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) ListBuildsByGameID(ctx context.Context, gameID string) ([]models.UserGameBuild, error) {
	var builds []models.UserGameBuild
	if err := r.db.WithContext(ctx).
		Where("game_id = ? AND deleted_at = 0", gameID).
		Order("created_at DESC").
		Find(&builds).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return builds, nil
}

func (r *gameRepository) FindLatestReadyBuildByGameID(ctx context.Context, gameID string) (*models.UserGameBuild, error) {
	var build models.UserGameBuild
	if err := r.db.WithContext(ctx).
		Where("game_id = ? AND deleted_at = 0 AND status = ?", gameID, models.GameBuildStatusReady).
		Order("created_at DESC").
		First(&build).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("GAME_BUILD_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &build, nil
}

func (r *gameRepository) IncrementGameLaunch(ctx context.Context, gameID string) error {
	if err := r.db.WithContext(ctx).
		Model(&models.UserGame{}).
		Where("id = ? AND deleted_at = 0", gameID).
		Update("launch_count", gorm.Expr("launch_count + 1")).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) CreateRating(ctx context.Context, rating *models.GameRating) error {
	if err := r.db.WithContext(ctx).Create(rating).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) UpsertRating(ctx context.Context, rating *models.GameRating) error {
	var existing models.GameRating
	err := r.db.WithContext(ctx).
		Where("game_id = ? AND user_id = ? AND deleted_at = 0", rating.GameID, rating.UserID).
		First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return r.CreateRating(ctx, rating)
		}
		return apperr.E("DB_ERROR", err)
	}
	existing.Score = rating.Score
	if err := r.db.WithContext(ctx).Save(&existing).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	rating.ID = existing.ID
	rating.CreatedAt = existing.CreatedAt
	rating.UpdatedAt = existing.UpdatedAt
	return nil
}

func (r *gameRepository) GetRatingByGameAndUser(ctx context.Context, gameID, userID string) (*models.GameRating, error) {
	var rating models.GameRating
	if err := r.db.WithContext(ctx).
		Where("game_id = ? AND user_id = ? AND deleted_at = 0", gameID, userID).
		First(&rating).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("GAME_RATING_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &rating, nil
}

func (r *gameRepository) GetRatingAggregate(ctx context.Context, gameID string) (*repositories.GameRatingAggregate, error) {
	var row struct {
		AvgRating   float64
		RatingCount int64
	}
	if err := r.db.WithContext(ctx).
		Model(&models.GameRating{}).
		Select("COALESCE(AVG(score),0) AS avg_rating, COUNT(*) AS rating_count").
		Where("game_id = ? AND deleted_at = 0", gameID).
		Scan(&row).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return &repositories.GameRatingAggregate{
		AvgRating:   row.AvgRating,
		RatingCount: row.RatingCount,
	}, nil
}

func (r *gameRepository) CreateReview(ctx context.Context, review *models.GameReview) error {
	if err := r.db.WithContext(ctx).Create(review).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) ListReviews(ctx context.Context, filter repositories.GameReviewFilter) ([]models.GameReview, error) {
	var reviews []models.GameReview
	query := r.db.WithContext(ctx).
		Where("game_id = ? AND deleted_at = 0", filter.GameID)
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&reviews).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return reviews, nil
}

func (r *gameRepository) FindReviewByID(ctx context.Context, id string) (*models.GameReview, error) {
	var review models.GameReview
	if err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at = 0", id).
		First(&review).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("GAME_REVIEW_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &review, nil
}

func (r *gameRepository) UpdateReview(ctx context.Context, review *models.GameReview) error {
	if err := r.db.WithContext(ctx).Save(review).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) CreateReport(ctx context.Context, report *models.GameReport) error {
	if err := r.db.WithContext(ctx).Create(report).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) UpsertDailyMetrics(ctx context.Context, gameID string, deltaLaunch int64) error {
	dateValue := time.Now().UTC().Format("2006-01-02")

	var metric models.GameMetricsDaily
	err := r.db.WithContext(ctx).
		Where("game_id = ? AND metric_date = ? AND deleted_at = 0", gameID, dateValue).
		First(&metric).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			metric = models.GameMetricsDaily{
				GameID:      gameID,
				MetricDate:  dateValue,
				LaunchCount: max64(deltaLaunch, 0),
			}
			if err := r.db.WithContext(ctx).Create(&metric).Error; err != nil {
				return apperr.E("DB_ERROR", err)
			}
			return nil
		}
		return apperr.E("DB_ERROR", err)
	}

	if deltaLaunch > 0 {
		metric.LaunchCount += deltaLaunch
	}
	if err := r.db.WithContext(ctx).Save(&metric).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) ListTrendingRows(ctx context.Context, gameIDs []string) ([]repositories.GameTrendingRow, error) {
	rows := make([]repositories.GameTrendingRow, 0)
	if len(gameIDs) == 0 {
		return rows, nil
	}
	now := time.Now().UTC().Unix()
	last24h := now - 24*60*60

	if err := r.db.WithContext(ctx).
		Table("user_games g").
		Select(`
			g.id AS game_id,
			COALESCE(SUM(CASE WHEN m.metric_date >= DATE_SUB(UTC_DATE(), INTERVAL 1 DAY) THEN m.launch_count ELSE 0 END), 0) AS launches24h,
			COALESCE(SUM(CASE WHEN m.metric_date >= DATE_SUB(UTC_DATE(), INTERVAL 1 DAY) THEN m.unique_user_count ELSE 0 END), 0) AS unique_users24h,
			COALESCE((SELECT COUNT(*) FROM game_ratings r WHERE r.game_id = g.id AND r.deleted_at = 0 AND r.updated_at >= ?), 0) AS new_ratings24h,
			COALESCE((SELECT COUNT(*) FROM game_reviews rv WHERE rv.game_id = g.id AND rv.deleted_at = 0 AND rv.created_at >= ?), 0) AS new_reviews24h
		`, last24h, last24h).
		Joins("LEFT JOIN game_metrics_daily m ON m.game_id = g.id AND m.deleted_at = 0").
		Where("g.id IN ?", gameIDs).
		Group("g.id").
		Scan(&rows).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return rows, nil
}

func (r *gameRepository) UpsertCuration(ctx context.Context, curation *models.GameCuration) error {
	var existing models.GameCuration
	err := r.db.WithContext(ctx).
		Where("game_id = ? AND collection_key = ? AND deleted_at = 0", curation.GameID, curation.CollectionKey).
		First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := r.db.WithContext(ctx).Create(curation).Error; err != nil {
				return apperr.E("DB_ERROR", err)
			}
			return nil
		}
		return apperr.E("DB_ERROR", err)
	}

	existing.CuratedBy = curation.CuratedBy
	existing.Priority = curation.Priority
	existing.Note = curation.Note
	existing.StartsAt = curation.StartsAt
	existing.EndsAt = curation.EndsAt
	existing.IsActive = curation.IsActive
	if err := r.db.WithContext(ctx).Save(&existing).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	curation.ID = existing.ID
	curation.CreatedAt = existing.CreatedAt
	curation.UpdatedAt = existing.UpdatedAt
	return nil
}

func (r *gameRepository) ListActiveCurations(ctx context.Context, collectionKey string, limit int) ([]models.GameCuration, error) {
	var curations []models.GameCuration
	query := r.db.WithContext(ctx).
		Where("deleted_at = 0 AND is_active = 1")
	if collectionKey != "" {
		query = query.Where("collection_key = ?", collectionKey)
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if err := query.Order("priority DESC, updated_at DESC").Limit(limit).Find(&curations).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return curations, nil
}

func (r *gameRepository) CreateAuditLog(ctx context.Context, log *models.GameAuditLog) error {
	if err := r.db.WithContext(ctx).Create(log).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) CountRecentReviewsByUser(ctx context.Context, userID string, sinceUnix int64) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&models.GameReview{}).
		Where("user_id = ? AND deleted_at = 0 AND created_at >= ?", userID, sinceUnix).
		Count(&count).Error; err != nil {
		return 0, apperr.E("DB_ERROR", err)
	}
	return count, nil
}

func (r *gameRepository) CountRecentRatingsByUser(ctx context.Context, userID string, sinceUnix int64) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&models.GameRating{}).
		Where("user_id = ? AND deleted_at = 0 AND updated_at >= ?", userID, sinceUnix).
		Count(&count).Error; err != nil {
		return 0, apperr.E("DB_ERROR", err)
	}
	return count, nil
}

func (r *gameRepository) CountRecentReportsByUser(ctx context.Context, userID string, sinceUnix int64) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&models.GameReport{}).
		Where("reporter_user_id = ? AND deleted_at = 0 AND created_at >= ?", userID, sinceUnix).
		Count(&count).Error; err != nil {
		return 0, apperr.E("DB_ERROR", err)
	}
	return count, nil
}

func max64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
