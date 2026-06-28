package services

import (
	"context"
	"encoding/json"
	"mime/multipart"

	"github.com/sagiri2004/goportal/pkg/models"
)

type GameCreateInput struct {
	Title          string
	Slug           string
	Description    *string
	Visibility     string
	ThumbnailURL   *string
	IconURL        *string
	CapsuleURL     *string
	HeroImageURL   *string
	ScreenshotURLs []string
	TrailerURL     *string
	SourceType     string
	Category       *string
	Tags           []string
	AgeRating      *string
}

type GameBuildCreateInput struct {
	GameID  string
	Version string
	File    *multipart.FileHeader
}

type GamePlaySession struct {
	PlayURL   string `json:"play_url"`
	Title     string `json:"title"`
	Version   string `json:"version"`
	GameID    string `json:"game_id"`
	EntryFile string `json:"entry_file"`
}

type GameWithBuild struct {
	Game  models.UserGame       `json:"game"`
	Build *models.UserGameBuild `json:"build,omitempty"`
}

type GameMarketFilter struct {
	SourceType string
	Query      string
	Category   string
	Sort       string
	Limit      int
	Offset     int
}

type GameRatingInput struct {
	GameID string
	Score  int
}

type GameReviewInput struct {
	GameID  string
	Title   *string
	Content string
	Score   *int
}

type GameReportInput struct {
	GameID string
	Reason string
	Detail *string
}

type GameCurationInput struct {
	GameID        string
	CollectionKey string
	Priority      int
	Note          *string
	StartsAt      *int64
	EndsAt        *int64
	IsActive      bool
}

type GameSessionStartInput struct {
	GameID    string
	ChannelID *string
	RoomID    *string
	Metadata  json.RawMessage
}

type GameEventInput struct {
	GameID           string
	SessionID        string
	EventType        string
	IdempotencyKey   string
	Score            *int
	AchievementCode  *string
	AchievementTitle *string
	Payload          json.RawMessage
}

type GameShareInput struct {
	GameID      string
	ChannelID   string
	SessionID   *string
	EventID     *string
	ShareType   string
	RoomID      *string
	RoomName    *string
	Score       *int
	Achievement *string
	Comment     *string
}

type GameRoomCreateInput struct {
	GameID     string
	ChannelID  *string
	RoomName   *string
	MaxPlayers int
}

type GameRoomResponse struct {
	Room    models.GameRoom         `json:"room"`
	Members []models.GameRoomMember `json:"members"`
}

type GameRoomListFilter struct {
	GameID string
	Limit  int
	Offset int
}

type GameScoreSubmitInput struct {
	GameID        string
	SessionID     *string
	LeaderboardID string
	Score         int64
	Metadata      json.RawMessage
}

type GameLeaderboardFilter struct {
	GameID        string
	LeaderboardID string
	Scope         string
	ServerID      *string
	ChannelID     *string
	Limit         int
	Offset        int
}

type GameLeaderboardEntry struct {
	Rank             int64           `json:"rank"`
	UserID           string          `json:"user_id"`
	Username         string          `json:"username"`
	AvatarURL        *string         `json:"avatar_url,omitempty"`
	Score            int64           `json:"score"`
	Metadata         json.RawMessage `json:"metadata,omitempty"`
	AchievedAt       int64           `json:"achieved_at"`
	CurrentUserEntry bool            `json:"current_user_entry"`
}

type GameLeaderboardResult struct {
	GameID        string                 `json:"game_id"`
	LeaderboardID string                 `json:"leaderboard_id"`
	Scope         string                 `json:"scope"`
	ServerID      *string                `json:"server_id,omitempty"`
	Entries       []GameLeaderboardEntry `json:"entries"`
	Me            *GameLeaderboardEntry  `json:"me,omitempty"`
}

type GameScoreSubmitResult struct {
	Accepted bool                  `json:"accepted"`
	Entry    models.GameScoreEntry `json:"entry"`
	Global   *GameLeaderboardEntry `json:"global,omitempty"`
	Server   *GameLeaderboardEntry `json:"server,omitempty"`
}

type GameService interface {
	CreateGame(ctx context.Context, actorID string, input GameCreateInput) (*models.UserGame, error)
	CreateSystemGame(ctx context.Context, actorID string, input GameCreateInput) (*models.UserGame, error)
	ListPublishedGames(ctx context.Context) ([]GameWithBuild, error)
	ListMarketGames(ctx context.Context, filter GameMarketFilter) ([]GameWithBuild, error)
	ListTrendingGames(ctx context.Context, sourceType string, limit int) ([]GameWithBuild, error)
	SearchGames(ctx context.Context, query, sourceType string, limit, offset int) ([]GameWithBuild, error)
	ListMyGames(ctx context.Context, actorID string) ([]GameWithBuild, error)
	GetGameDetail(ctx context.Context, actorID, gameID string) (*GameWithBuild, error)
	CreateBuild(ctx context.Context, actorID string, input GameBuildCreateInput) (*models.UserGameBuild, error)
	SubmitForReview(ctx context.Context, actorID, gameID string) (*models.UserGame, error)
	UpdatePublishState(ctx context.Context, actorID, gameID, publishState, note string) (*models.UserGame, error)
	FeatureGame(ctx context.Context, actorID string, input GameCurationInput) (*models.GameCuration, error)
	ListReviewQueue(ctx context.Context, actorID string, limit, offset int) ([]GameWithBuild, error)
	ModerateReview(ctx context.Context, actorID, reviewID, status, note string) (*models.GameReview, error)
	RateGame(ctx context.Context, actorID string, input GameRatingInput) (*models.GameRating, error)
	AddReview(ctx context.Context, actorID string, input GameReviewInput) (*models.GameReview, error)
	ListReviews(ctx context.Context, actorID, gameID, status string, limit, offset int) ([]models.GameReview, error)
	ReportGame(ctx context.Context, actorID string, input GameReportInput) (*models.GameReport, error)
	CreatePlaySession(ctx context.Context, actorID, gameID string) (*GamePlaySession, error)
	StartSession(ctx context.Context, actorID string, input GameSessionStartInput) (*models.GameSession, error)
	RecordEvent(ctx context.Context, actorID string, input GameEventInput) (*models.GameEvent, error)
	SubmitScore(ctx context.Context, actorID string, input GameScoreSubmitInput) (*GameScoreSubmitResult, error)
	GetLeaderboard(ctx context.Context, actorID string, filter GameLeaderboardFilter) (*GameLeaderboardResult, error)
	ShareToChannel(ctx context.Context, actorID string, input GameShareInput) error
	CreateRoom(ctx context.Context, actorID string, input GameRoomCreateInput) (*GameRoomResponse, error)
	ListOpenRooms(ctx context.Context, actorID string, filter GameRoomListFilter) ([]GameRoomResponse, error)
	JoinRoom(ctx context.Context, actorID, gameID, roomID string) (*GameRoomResponse, error)
	LeaveRoom(ctx context.Context, actorID, gameID, roomID string) (*GameRoomResponse, error)
	GetRoomState(ctx context.Context, actorID, gameID, roomID string) (*GameRoomResponse, error)
}
