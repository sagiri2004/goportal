package services

import (
	"context"
	"encoding/json"

	"github.com/sagiri2004/goportal/pkg/models"
)

type CreateMessageInput struct {
	ChannelID      string
	AuthorID       string
	ContentType    string
	ContentPayload json.RawMessage
	Encoding       string
	IsPinned       bool
	AttachmentIDs  []string
	ReplyToID      *string
}

type UpdateMessageInput struct {
	MessageID      string
	ActorID        string
	ContentType    string
	ContentPayload json.RawMessage
	Encoding       string
}

type ListMessagesResult struct {
	Messages    []models.Message
	Attachments []models.MessageAttachment
	Reactions   []models.Reaction
	Authors     []models.User
}

type MessageService interface {
	CreateMessage(ctx context.Context, input CreateMessageInput) (*models.Message, error)
	ListByChannel(ctx context.Context, actorID, channelID string, limit, offset int) (*ListMessagesResult, error)
	UpdateMessage(ctx context.Context, input UpdateMessageInput) (*models.Message, error)
	DeleteMessage(ctx context.Context, actorID, messageID string) error
	ToggleReaction(ctx context.Context, actorID, messageID, emoji string) (bool, error)
}
