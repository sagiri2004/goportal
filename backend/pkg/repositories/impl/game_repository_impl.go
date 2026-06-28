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

func (r *gameRepository) CreateSession(ctx context.Context, session *models.GameSession) error {
	if err := r.db.WithContext(ctx).Create(session).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) FindSessionByID(ctx context.Context, sessionID string) (*models.GameSession, error) {
	var session models.GameSession
	if err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at = 0", sessionID).
		First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("GAME_SESSION_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &session, nil
}

func (r *gameRepository) UpdateSession(ctx context.Context, session *models.GameSession) error {
	if err := r.db.WithContext(ctx).Save(session).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) CreateEvent(ctx context.Context, event *models.GameEvent) error {
	if err := r.db.WithContext(ctx).Create(event).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) FindEventByID(ctx context.Context, eventID string) (*models.GameEvent, error) {
	var event models.GameEvent
	if err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at = 0", eventID).
		First(&event).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("GAME_EVENT_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &event, nil
}

func (r *gameRepository) FindEventByIdempotency(ctx context.Context, sessionID, idempotencyKey string) (*models.GameEvent, error) {
	var event models.GameEvent
	if err := r.db.WithContext(ctx).
		Where("session_id = ? AND idempotency_key = ? AND deleted_at = 0", sessionID, idempotencyKey).
		First(&event).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("GAME_EVENT_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &event, nil
}

func (r *gameRepository) CreateScoreEntry(ctx context.Context, entry *models.GameScoreEntry) error {
	if err := r.db.WithContext(ctx).Create(entry).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) UpsertLeaderboardEntry(ctx context.Context, entry *models.GameLeaderboardEntry) error {
	var existing models.GameLeaderboardEntry
	query := r.db.WithContext(ctx).
		Where("game_id = ? AND leaderboard_id = ? AND scope = ? AND user_id = ? AND deleted_at = 0", entry.GameID, entry.LeaderboardID, entry.Scope, entry.UserID)
	if entry.ServerID == nil || *entry.ServerID == "" {
		query = query.Where("server_id IS NULL")
	} else {
		query = query.Where("server_id = ?", *entry.ServerID)
	}
	err := query.First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := r.db.WithContext(ctx).Create(entry).Error; err != nil {
				return apperr.E("DB_ERROR", err)
			}
			return nil
		}
		return apperr.E("DB_ERROR", err)
	}
	if entry.BestScore < existing.BestScore {
		*entry = existing
		return nil
	}
	if entry.BestScore == existing.BestScore && entry.AchievedAt >= existing.AchievedAt {
		*entry = existing
		return nil
	}
	existing.BestScore = entry.BestScore
	existing.BestScoreEntryID = entry.BestScoreEntryID
	existing.Metadata = entry.Metadata
	existing.AchievedAt = entry.AchievedAt
	if err := r.db.WithContext(ctx).Save(&existing).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	*entry = existing
	return nil
}

type leaderboardScanRow struct {
	Rank             int64
	ID               string
	GameID           string
	LeaderboardID    string
	Scope            string
	ServerID         *string
	UserID           string
	BestScore        int64
	BestScoreEntryID string
	Metadata         []byte
	AchievedAt       int64
	CreatedAt        int64
	UpdatedAt        int64
	DeletedAt        int64
	Username         string
	AvatarURL        *string
}

func (r *gameRepository) ListLeaderboard(ctx context.Context, filter repositories.GameLeaderboardFilter) ([]repositories.GameLeaderboardRow, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	query, args := leaderboardWhereSQL(filter)
	args = append(args, limit, offset)
	rows := []leaderboardScanRow{}
	if err := r.db.WithContext(ctx).Raw(`
SELECT ranked.*, u.username, u.avatar_url
FROM (
  SELECT e.*, RANK() OVER (ORDER BY e.best_score DESC, e.achieved_at ASC) AS rank
  FROM game_leaderboard_entries e
  WHERE `+query+`
) ranked
INNER JOIN users u ON u.id = ranked.user_id
ORDER BY ranked.rank ASC
LIMIT ? OFFSET ?`, args...).Scan(&rows).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return mapLeaderboardRows(rows), nil
}

func (r *gameRepository) FindLeaderboardEntry(ctx context.Context, gameID, leaderboardID, scope string, serverID *string, userID string) (*repositories.GameLeaderboardRow, error) {
	filter := repositories.GameLeaderboardFilter{
		GameID:        gameID,
		LeaderboardID: leaderboardID,
		Scope:         scope,
		ServerID:      serverID,
	}
	query, args := leaderboardWhereSQL(filter)
	args = append(args, userID)
	rows := []leaderboardScanRow{}
	if err := r.db.WithContext(ctx).Raw(`
SELECT ranked.*, u.username, u.avatar_url
FROM (
  SELECT e.*, RANK() OVER (ORDER BY e.best_score DESC, e.achieved_at ASC) AS rank
  FROM game_leaderboard_entries e
  WHERE `+query+`
) ranked
INNER JOIN users u ON u.id = ranked.user_id
WHERE ranked.user_id = ?
LIMIT 1`, args...).Scan(&rows).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	if len(rows) == 0 {
		return nil, apperr.E("GAME_LEADERBOARD_ENTRY_NOT_FOUND", gorm.ErrRecordNotFound)
	}
	mapped := mapLeaderboardRows(rows)
	return &mapped[0], nil
}

func leaderboardWhereSQL(filter repositories.GameLeaderboardFilter) (string, []any) {
	leaderboardID := strings.TrimSpace(filter.LeaderboardID)
	if leaderboardID == "" {
		leaderboardID = "default"
	}
	scope := strings.TrimSpace(filter.Scope)
	if scope == "" {
		scope = models.GameLeaderboardScopeGlobal
	}
	query := "e.deleted_at = 0 AND e.game_id = ? AND e.leaderboard_id = ? AND e.scope = ?"
	args := []any{filter.GameID, leaderboardID, scope}
	if scope == models.GameLeaderboardScopeServer {
		if filter.ServerID == nil || strings.TrimSpace(*filter.ServerID) == "" {
			query += " AND e.server_id IS NULL"
		} else {
			query += " AND e.server_id = ?"
			args = append(args, strings.TrimSpace(*filter.ServerID))
		}
	} else {
		query += " AND e.server_id IS NULL"
	}
	return query, args
}

func mapLeaderboardRows(rows []leaderboardScanRow) []repositories.GameLeaderboardRow {
	out := make([]repositories.GameLeaderboardRow, 0, len(rows))
	for i := range rows {
		row := rows[i]
		out = append(out, repositories.GameLeaderboardRow{
			Rank: row.Rank,
			Entry: models.GameLeaderboardEntry{
				ID:               row.ID,
				GameID:           row.GameID,
				LeaderboardID:    row.LeaderboardID,
				Scope:            row.Scope,
				ServerID:         row.ServerID,
				UserID:           row.UserID,
				BestScore:        row.BestScore,
				BestScoreEntryID: row.BestScoreEntryID,
				Metadata:         row.Metadata,
				AchievedAt:       row.AchievedAt,
				CreatedAt:        row.CreatedAt,
				UpdatedAt:        row.UpdatedAt,
				DeletedAt:        row.DeletedAt,
			},
			Username:  row.Username,
			AvatarURL: row.AvatarURL,
		})
	}
	return out
}

func (r *gameRepository) CreateRoom(ctx context.Context, room *models.GameRoom) error {
	if err := r.db.WithContext(ctx).Create(room).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) FindRoomByID(ctx context.Context, roomID string) (*models.GameRoom, error) {
	var room models.GameRoom
	if err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at = 0", roomID).
		First(&room).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.E("GAME_ROOM_NOT_FOUND", err)
		}
		return nil, apperr.E("DB_ERROR", err)
	}
	return &room, nil
}

func (r *gameRepository) ListOpenRoomsByGameID(ctx context.Context, gameID string, limit, offset int) ([]models.GameRoom, error) {
	rooms := make([]models.GameRoom, 0)
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	now := time.Now().Unix()
	if err := r.db.WithContext(ctx).
		Where("game_id = ? AND deleted_at = 0 AND status = ? AND expires_at > ?", gameID, models.GameRoomStatusOpen, now).
		Order("last_active_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&rooms).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return rooms, nil
}

func (r *gameRepository) UpdateRoom(ctx context.Context, room *models.GameRoom) error {
	if err := r.db.WithContext(ctx).Save(room).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) CloseExpiredRooms(ctx context.Context, nowUnix int64) error {
	if err := r.db.WithContext(ctx).
		Model(&models.GameRoom{}).
		Where("deleted_at = 0 AND status = ? AND expires_at <= ?", models.GameRoomStatusOpen, nowUnix).
		Updates(map[string]any{
			"status":         models.GameRoomStatusClosed,
			"last_active_at": nowUnix,
		}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) CloseOpenRoomsWithoutMembers(ctx context.Context, nowUnix int64) error {
	if err := r.db.WithContext(ctx).
		Model(&models.GameRoom{}).
		Where("deleted_at = 0 AND status = ?", models.GameRoomStatusOpen).
		Where("NOT EXISTS (?)",
			r.db.WithContext(ctx).
				Model(&models.GameRoomMember{}).
				Select("1").
				Where("game_room_members.room_id = game_rooms.id").
				Where("game_room_members.deleted_at = 0").
				Where("game_room_members.status = ?", models.GameRoomMemberStatusJoined),
		).
		Updates(map[string]any{
			"status":         models.GameRoomStatusClosed,
			"last_active_at": nowUnix,
		}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) UpsertRoomMember(ctx context.Context, member *models.GameRoomMember) error {
	var existing models.GameRoomMember
	err := r.db.WithContext(ctx).
		Where("room_id = ? AND user_id = ? AND deleted_at = 0", member.RoomID, member.UserID).
		First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := r.db.WithContext(ctx).Create(member).Error; err != nil {
				return apperr.E("DB_ERROR", err)
			}
			return nil
		}
		return apperr.E("DB_ERROR", err)
	}
	existing.Status = member.Status
	existing.Role = member.Role
	existing.LeftAt = member.LeftAt
	existing.LastSeenAt = member.LastSeenAt
	if member.JoinedAt > 0 {
		existing.JoinedAt = member.JoinedAt
	}
	if err := r.db.WithContext(ctx).Save(&existing).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	member.ID = existing.ID
	member.CreatedAt = existing.CreatedAt
	member.UpdatedAt = existing.UpdatedAt
	return nil
}

func (r *gameRepository) SetRoomMemberLeft(ctx context.Context, roomID, userID string, leftAt int64) error {
	if err := r.db.WithContext(ctx).
		Model(&models.GameRoomMember{}).
		Where("room_id = ? AND user_id = ? AND deleted_at = 0", roomID, userID).
		Updates(map[string]any{
			"status":       models.GameRoomMemberStatusLeft,
			"left_at":      leftAt,
			"last_seen_at": leftAt,
		}).Error; err != nil {
		return apperr.E("DB_ERROR", err)
	}
	return nil
}

func (r *gameRepository) ListRoomMembers(ctx context.Context, filter repositories.GameRoomMemberFilter) ([]models.GameRoomMember, error) {
	members := make([]models.GameRoomMember, 0)
	query := r.db.WithContext(ctx).
		Where("room_id = ? AND deleted_at = 0", filter.RoomID)
	if filter.OnlyJoined {
		query = query.Where("status = ?", models.GameRoomMemberStatusJoined)
	}
	if filter.UserID != "" {
		query = query.Where("user_id = ?", filter.UserID)
	}
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 100
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	if err := query.Order("joined_at ASC").Limit(limit).Offset(offset).Find(&members).Error; err != nil {
		return nil, apperr.E("DB_ERROR", err)
	}
	return members, nil
}

func (r *gameRepository) CountActiveRoomMembers(ctx context.Context, roomID string) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&models.GameRoomMember{}).
		Where("room_id = ? AND deleted_at = 0 AND status = ?", roomID, models.GameRoomMemberStatusJoined).
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
