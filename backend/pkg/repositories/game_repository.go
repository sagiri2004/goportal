package repositories

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type GameMarketFilter struct {
	SourceType string
	Query      string
	Category   string
	Sort       string
	Limit      int
	Offset     int
}

type GameReviewFilter struct {
	GameID string
	Status string
	Limit  int
	Offset int
}

type GameRatingAggregate struct {
	AvgRating   float64
	RatingCount int64
}

type GameTrendingRow struct {
	GameID         string
	Launches24h    int64
	UniqueUsers24h int64
	NewRatings24h  int64
	NewReviews24h  int64
}

type GameRoomMemberFilter struct {
	RoomID     string
	OnlyJoined bool
	UserID     string
	Limit      int
	Offset     int
}

type GameRepository interface {
	CreateGame(ctx context.Context, game *models.UserGame) error
	UpdateGame(ctx context.Context, game *models.UserGame) error
	FindGameByID(ctx context.Context, id string) (*models.UserGame, error)
	FindGameBySlug(ctx context.Context, slug string) (*models.UserGame, error)
	ListPublishedGames(ctx context.Context) ([]models.UserGame, error)
	ListMarketGames(ctx context.Context, filter GameMarketFilter) ([]models.UserGame, error)
	ListGamesByOwner(ctx context.Context, ownerID string) ([]models.UserGame, error)
	ListGamesByPublishState(ctx context.Context, state string, limit, offset int) ([]models.UserGame, error)
	CreateBuild(ctx context.Context, build *models.UserGameBuild) error
	ListBuildsByGameID(ctx context.Context, gameID string) ([]models.UserGameBuild, error)
	FindLatestReadyBuildByGameID(ctx context.Context, gameID string) (*models.UserGameBuild, error)
	IncrementGameLaunch(ctx context.Context, gameID string) error

	CreateRating(ctx context.Context, rating *models.GameRating) error
	UpsertRating(ctx context.Context, rating *models.GameRating) error
	GetRatingByGameAndUser(ctx context.Context, gameID, userID string) (*models.GameRating, error)
	GetRatingAggregate(ctx context.Context, gameID string) (*GameRatingAggregate, error)

	CreateReview(ctx context.Context, review *models.GameReview) error
	ListReviews(ctx context.Context, filter GameReviewFilter) ([]models.GameReview, error)
	FindReviewByID(ctx context.Context, id string) (*models.GameReview, error)
	UpdateReview(ctx context.Context, review *models.GameReview) error

	CreateReport(ctx context.Context, report *models.GameReport) error

	UpsertDailyMetrics(ctx context.Context, gameID string, deltaLaunch int64) error
	ListTrendingRows(ctx context.Context, gameIDs []string) ([]GameTrendingRow, error)

	UpsertCuration(ctx context.Context, curation *models.GameCuration) error
	ListActiveCurations(ctx context.Context, collectionKey string, limit int) ([]models.GameCuration, error)

	CreateAuditLog(ctx context.Context, log *models.GameAuditLog) error
	CountRecentReviewsByUser(ctx context.Context, userID string, sinceUnix int64) (int64, error)
	CountRecentRatingsByUser(ctx context.Context, userID string, sinceUnix int64) (int64, error)
	CountRecentReportsByUser(ctx context.Context, userID string, sinceUnix int64) (int64, error)

	CreateSession(ctx context.Context, session *models.GameSession) error
	FindSessionByID(ctx context.Context, sessionID string) (*models.GameSession, error)
	UpdateSession(ctx context.Context, session *models.GameSession) error

	CreateEvent(ctx context.Context, event *models.GameEvent) error
	FindEventByID(ctx context.Context, eventID string) (*models.GameEvent, error)
	FindEventByIdempotency(ctx context.Context, sessionID, idempotencyKey string) (*models.GameEvent, error)

	CreateRoom(ctx context.Context, room *models.GameRoom) error
	FindRoomByID(ctx context.Context, roomID string) (*models.GameRoom, error)
	UpdateRoom(ctx context.Context, room *models.GameRoom) error
	CloseExpiredRooms(ctx context.Context, nowUnix int64) error

	UpsertRoomMember(ctx context.Context, member *models.GameRoomMember) error
	SetRoomMemberLeft(ctx context.Context, roomID, userID string, leftAt int64) error
	ListRoomMembers(ctx context.Context, filter GameRoomMemberFilter) ([]models.GameRoomMember, error)
	CountActiveRoomMembers(ctx context.Context, roomID string) (int64, error)
}
