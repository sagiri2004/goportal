package repositories

import (
	"context"

	"github.com/sagiri2004/goportal/pkg/models"
)

type RecordingRepository interface {
	Create(ctx context.Context, recording *models.Recording) error
	Update(ctx context.Context, recording *models.Recording) error
	FindByEgressID(ctx context.Context, egressID string) (*models.Recording, error)
	FindActiveByChannelAndType(ctx context.Context, channelID, recordingType string) (*models.Recording, error)
	ListByChannel(ctx context.Context, channelID string, limit, offset int) ([]models.Recording, error)
}
