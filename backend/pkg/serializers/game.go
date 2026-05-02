package serializers

import (
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/services"
)

type CreateGameRequest struct {
	Title        string   `json:"title" binding:"required,min=1,max=255"`
	Slug         string   `json:"slug" binding:"required,min=1,max=255"`
	Description  *string  `json:"description,omitempty"`
	Visibility   string   `json:"visibility,omitempty"`
	ThumbnailURL *string  `json:"thumbnail_url,omitempty"`
	Category     *string  `json:"category,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	AgeRating    *string  `json:"age_rating,omitempty"`
}

type CreateGameBuildRequest struct {
	Version string `form:"version"`
}

type PublishStateRequest struct {
	PublishState string `json:"publish_state" binding:"required"`
	Note         string `json:"note,omitempty"`
}

type CreateRatingRequest struct {
	Score int `json:"score" binding:"required"`
}

type CreateReviewRequest struct {
	Title   *string `json:"title,omitempty"`
	Content string  `json:"content" binding:"required"`
	Score   *int    `json:"score,omitempty"`
}

type CreateReportRequest struct {
	Reason string  `json:"reason" binding:"required"`
	Detail *string `json:"detail,omitempty"`
}

type FeatureGameRequest struct {
	CollectionKey string  `json:"collection_key,omitempty"`
	Priority      int     `json:"priority"`
	Note          *string `json:"note,omitempty"`
	StartsAt      *int64  `json:"starts_at,omitempty"`
	EndsAt        *int64  `json:"ends_at,omitempty"`
	IsActive      bool    `json:"is_active"`
}

type ModerateReviewRequest struct {
	Status string `json:"status" binding:"required"`
	Note   string `json:"note,omitempty"`
}

type UserGameResponse struct {
	ID            string   `json:"id"`
	OwnerUserID   string   `json:"owner_user_id"`
	SourceType    string   `json:"source_type"`
	Title         string   `json:"title"`
	Slug          string   `json:"slug"`
	Description   *string  `json:"description,omitempty"`
	Visibility    string   `json:"visibility"`
	Status        string   `json:"status"`
	PublishState  string   `json:"publish_state"`
	Category      *string  `json:"category,omitempty"`
	Tags          []string `json:"tags,omitempty"`
	AgeRating     *string  `json:"age_rating,omitempty"`
	FeaturedScore float64  `json:"featured_score"`
	AvgRating     float64  `json:"avg_rating"`
	RatingCount   int64    `json:"rating_count"`
	LaunchCount   int64    `json:"launch_count"`
	TrendingScore float64  `json:"trending_score"`
	ThumbnailURL  *string  `json:"thumbnail_url,omitempty"`
	CreatedAt     int64    `json:"created_at"`
	UpdatedAt     int64    `json:"updated_at"`
}

type UserGameBuildResponse struct {
	ID            string  `json:"id"`
	GameID        string  `json:"game_id"`
	Version       string  `json:"version"`
	StorageZipURL string  `json:"storage_zip_url"`
	PlayBasePath  string  `json:"play_base_path"`
	EntryFile     string  `json:"entry_file"`
	FileSize      int64   `json:"file_size"`
	Checksum      *string `json:"checksum,omitempty"`
	Status        string  `json:"status"`
	ErrorMessage  *string `json:"error_message,omitempty"`
	CreatedAt     int64   `json:"created_at"`
	UpdatedAt     int64   `json:"updated_at"`
}

type GameWithBuildResponse struct {
	Game  UserGameResponse       `json:"game"`
	Build *UserGameBuildResponse `json:"build,omitempty"`
}

type GameRatingResponse struct {
	ID        string `json:"id"`
	GameID    string `json:"game_id"`
	UserID    string `json:"user_id"`
	Score     int    `json:"score"`
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
}

type GameReviewResponse struct {
	ID             string  `json:"id"`
	GameID         string  `json:"game_id"`
	UserID         string  `json:"user_id"`
	Title          *string `json:"title,omitempty"`
	Content        string  `json:"content"`
	RatingScore    *int    `json:"rating_score,omitempty"`
	Status         string  `json:"status"`
	ModeratedBy    *string `json:"moderated_by,omitempty"`
	ModeratedAt    *int64  `json:"moderated_at,omitempty"`
	ModerationNote *string `json:"moderation_note,omitempty"`
	HelpfulCount   int64   `json:"helpful_count"`
	CreatedAt      int64   `json:"created_at"`
	UpdatedAt      int64   `json:"updated_at"`
}

type GameReportResponse struct {
	ID             string  `json:"id"`
	GameID         string  `json:"game_id"`
	ReporterUserID string  `json:"reporter_user_id"`
	Reason         string  `json:"reason"`
	Detail         *string `json:"detail,omitempty"`
	Status         string  `json:"status"`
	CreatedAt      int64   `json:"created_at"`
}

type GameCurationResponse struct {
	ID            string  `json:"id"`
	GameID        string  `json:"game_id"`
	CuratedBy     string  `json:"curated_by"`
	CollectionKey string  `json:"collection_key"`
	Priority      int     `json:"priority"`
	Note          *string `json:"note,omitempty"`
	StartsAt      *int64  `json:"starts_at,omitempty"`
	EndsAt        *int64  `json:"ends_at,omitempty"`
	IsActive      bool    `json:"is_active"`
	CreatedAt     int64   `json:"created_at"`
	UpdatedAt     int64   `json:"updated_at"`
}

func NewUserGameResponse(game *models.UserGame) UserGameResponse {
	return UserGameResponse{
		ID:            game.ID,
		OwnerUserID:   game.OwnerUserID,
		SourceType:    game.SourceType,
		Title:         game.Title,
		Slug:          game.Slug,
		Description:   game.Description,
		Visibility:    game.Visibility,
		Status:        game.Status,
		PublishState:  game.PublishState,
		Category:      game.Category,
		Tags:          game.Tags,
		AgeRating:     game.AgeRating,
		FeaturedScore: game.FeaturedScore,
		AvgRating:     game.AvgRating,
		RatingCount:   game.RatingCount,
		LaunchCount:   game.LaunchCount,
		TrendingScore: game.TrendingScore,
		ThumbnailURL:  game.ThumbnailURL,
		CreatedAt:     game.CreatedAt,
		UpdatedAt:     game.UpdatedAt,
	}
}

func NewUserGameBuildResponse(build *models.UserGameBuild) UserGameBuildResponse {
	return UserGameBuildResponse{
		ID:            build.ID,
		GameID:        build.GameID,
		Version:       build.Version,
		StorageZipURL: build.StorageZipURL,
		PlayBasePath:  build.PlayBasePath,
		EntryFile:     build.EntryFile,
		FileSize:      build.FileSize,
		Checksum:      build.Checksum,
		Status:        build.Status,
		ErrorMessage:  build.ErrorMessage,
		CreatedAt:     build.CreatedAt,
		UpdatedAt:     build.UpdatedAt,
	}
}

func NewGameWithBuildResponse(item services.GameWithBuild) GameWithBuildResponse {
	resp := GameWithBuildResponse{
		Game: NewUserGameResponse(&item.Game),
	}
	if item.Build != nil {
		build := NewUserGameBuildResponse(item.Build)
		resp.Build = &build
	}
	return resp
}

func NewGameRatingResponse(rating *models.GameRating) GameRatingResponse {
	return GameRatingResponse{
		ID:        rating.ID,
		GameID:    rating.GameID,
		UserID:    rating.UserID,
		Score:     rating.Score,
		CreatedAt: rating.CreatedAt,
		UpdatedAt: rating.UpdatedAt,
	}
}

func NewGameReviewResponse(review *models.GameReview) GameReviewResponse {
	return GameReviewResponse{
		ID:             review.ID,
		GameID:         review.GameID,
		UserID:         review.UserID,
		Title:          review.Title,
		Content:        review.Content,
		RatingScore:    review.RatingScore,
		Status:         review.Status,
		ModeratedBy:    review.ModeratedBy,
		ModeratedAt:    review.ModeratedAt,
		ModerationNote: review.ModerationNote,
		HelpfulCount:   review.HelpfulCount,
		CreatedAt:      review.CreatedAt,
		UpdatedAt:      review.UpdatedAt,
	}
}

func NewGameReportResponse(report *models.GameReport) GameReportResponse {
	return GameReportResponse{
		ID:             report.ID,
		GameID:         report.GameID,
		ReporterUserID: report.ReporterUserID,
		Reason:         report.Reason,
		Detail:         report.Detail,
		Status:         report.Status,
		CreatedAt:      report.CreatedAt,
	}
}

func NewGameCurationResponse(curation *models.GameCuration) GameCurationResponse {
	return GameCurationResponse{
		ID:            curation.ID,
		GameID:        curation.GameID,
		CuratedBy:     curation.CuratedBy,
		CollectionKey: curation.CollectionKey,
		Priority:      curation.Priority,
		Note:          curation.Note,
		StartsAt:      curation.StartsAt,
		EndsAt:        curation.EndsAt,
		IsActive:      curation.IsActive,
		CreatedAt:     curation.CreatedAt,
		UpdatedAt:     curation.UpdatedAt,
	}
}
