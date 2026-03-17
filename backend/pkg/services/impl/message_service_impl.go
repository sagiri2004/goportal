package impl

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/google/uuid"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

const chatMessageCreatedTopic = "chat.message.created"

type messageService struct {
	repo        repositories.MessageRepository
	serverRepo  repositories.ServerRepository
	channelRepo repositories.ChannelRepository
	publisher   message.Publisher
}

func NewMessageService(
	repo repositories.MessageRepository,
	serverRepo repositories.ServerRepository,
	channelRepo repositories.ChannelRepository,
	publisher message.Publisher,
) services.MessageService {
	return &messageService{
		repo:        repo,
		serverRepo:  serverRepo,
		channelRepo: channelRepo,
		publisher:   publisher,
	}
}

func (s *messageService) CreateMessage(ctx context.Context, input services.CreateMessageInput) (*models.Message, error) {
	input.ChannelID = strings.TrimSpace(input.ChannelID)
	input.AuthorID = strings.TrimSpace(input.AuthorID)
	input.ContentType = strings.TrimSpace(input.ContentType)
	input.Encoding = strings.TrimSpace(input.Encoding)
	if input.ChannelID == "" || input.AuthorID == "" || input.ContentType == "" || len(input.ContentPayload) == 0 {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if input.Encoding == "" {
		input.Encoding = "utf-8"
	}

	channel, err := s.channelRepo.FindByID(ctx, input.ChannelID)
	if err != nil {
		return nil, err
	}
	if _, err := s.serverRepo.FindMember(ctx, channel.ServerID, input.AuthorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}
	canSend, err := s.serverRepo.HasPermission(ctx, channel.ServerID, input.AuthorID, models.PermissionSendMessages)
	if err != nil {
		return nil, err
	}
	if !canSend {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	if channel.IsPrivate {
		isMember, err := s.channelRepo.IsMember(ctx, channel.ID, input.AuthorID)
		if err != nil {
			return nil, err
		}
		if !isMember {
			return nil, apperr.E("CHANNEL_ACCESS_DENIED", nil)
		}
	}

	contentEnvelope := models.MessageContentEnvelope{
		Type:     input.ContentType,
		Payload:  input.ContentPayload,
		Encoding: input.Encoding,
	}
	contentRaw, err := json.Marshal(contentEnvelope)
	if err != nil {
		return nil, apperr.E("INTERNAL_ERROR", err)
	}

	msg := &models.Message{
		ChannelID: input.ChannelID,
		AuthorID:  input.AuthorID,
		Content:   contentRaw,
		IsPinned:  input.IsPinned,
	}

	attachments, err := s.repo.FindAttachmentsByIDs(ctx, input.AttachmentIDs)
	if err != nil {
		return nil, err
	}
	if len(attachments) != len(input.AttachmentIDs) {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	attachmentPtrs := make([]*models.MessageAttachment, 0, len(attachments))
	for i := range attachments {
		att := attachments[i]
		attachmentPtrs = append(attachmentPtrs, &att)
	}

	if err := s.repo.Create(ctx, msg, attachmentPtrs); err != nil {
		return nil, err
	}

	if s.publisher == nil {
		return msg, nil
	}

	eventAttachments := make([]models.MessageAttachmentEvent, 0, len(attachmentPtrs))
	for _, a := range attachmentPtrs {
		eventAttachments = append(eventAttachments, models.MessageAttachmentEvent{
			ID:       a.ID,
			FileURL:  a.FileURL,
			FileType: a.FileType,
			FileSize: a.FileSize,
			FileName: a.FileName,
		})
	}

	event := models.ChatMessageCreatedEvent{
		EventID:     uuid.NewString(),
		EventType:   "CHAT_MESSAGE_CREATED",
		OccurredAt:  time.Now().UTC().Format(time.RFC3339),
		ChannelID:   msg.ChannelID,
		AuthorID:    msg.AuthorID,
		MessageID:   msg.ID,
		Content:     contentEnvelope,
		Attachments: eventAttachments,
	}

	payload, err := json.Marshal(event)
	if err != nil {
		return nil, apperr.E("INTERNAL_ERROR", err)
	}

	wmMsg := message.NewMessage(event.EventID, payload)
	wmMsg.SetContext(ctx)
	if err := s.publisher.Publish(chatMessageCreatedTopic, wmMsg); err != nil {
		return nil, apperr.E("INTERNAL_ERROR", err)
	}
	return msg, nil
}

func (s *messageService) ListByChannel(
	ctx context.Context,
	actorID, channelID string,
	limit, offset int,
) (*services.ListMessagesResult, error) {
	actorID = strings.TrimSpace(actorID)
	channelID = strings.TrimSpace(channelID)
	if actorID == "" || channelID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	channel, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	if _, err := s.serverRepo.FindMember(ctx, channel.ServerID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}
	canRead, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionReadMessages)
	if err != nil {
		return nil, err
	}
	if !canRead {
		return nil, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	if channel.IsPrivate {
		isMember, err := s.channelRepo.IsMember(ctx, channel.ID, actorID)
		if err != nil {
			return nil, err
		}
		if !isMember {
			return nil, apperr.E("CHANNEL_ACCESS_DENIED", nil)
		}
	}

	messages, err := s.repo.ListByChannel(ctx, channelID, limit, offset)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(messages))
	for _, m := range messages {
		ids = append(ids, m.ID)
	}
	attachments, err := s.repo.ListAttachmentsByMessageIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	reactions, err := s.repo.ListReactionsByMessageIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	return &services.ListMessagesResult{
		Messages:    messages,
		Attachments: attachments,
		Reactions:   reactions,
	}, nil
}

func (s *messageService) UpdateMessage(ctx context.Context, input services.UpdateMessageInput) (*models.Message, error) {
	input.MessageID = strings.TrimSpace(input.MessageID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.ContentType = strings.TrimSpace(input.ContentType)
	input.Encoding = strings.TrimSpace(input.Encoding)
	if input.MessageID == "" || input.ActorID == "" || input.ContentType == "" || len(input.ContentPayload) == 0 {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if input.Encoding == "" {
		input.Encoding = "utf-8"
	}

	msg, err := s.repo.FindByID(ctx, input.MessageID)
	if err != nil {
		return nil, err
	}
	if msg.AuthorID != input.ActorID {
		return nil, apperr.E("MESSAGE_FORBIDDEN", nil)
	}

	contentRaw, err := json.Marshal(models.MessageContentEnvelope{
		Type:     input.ContentType,
		Payload:  input.ContentPayload,
		Encoding: input.Encoding,
	})
	if err != nil {
		return nil, apperr.E("INTERNAL_ERROR", err)
	}
	msg.Content = contentRaw
	msg.IsEdited = true
	if err := s.repo.Update(ctx, msg); err != nil {
		return nil, err
	}
	return msg, nil
}

func (s *messageService) DeleteMessage(ctx context.Context, actorID, messageID string) error {
	actorID = strings.TrimSpace(actorID)
	messageID = strings.TrimSpace(messageID)
	if actorID == "" || messageID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}
	msg, err := s.repo.FindByID(ctx, messageID)
	if err != nil {
		return err
	}
	if msg.AuthorID != actorID {
		return apperr.E("MESSAGE_FORBIDDEN", nil)
	}
	return s.repo.SoftDelete(ctx, messageID)
}

func (s *messageService) ToggleReaction(ctx context.Context, actorID, messageID, emoji string) (bool, error) {
	actorID = strings.TrimSpace(actorID)
	messageID = strings.TrimSpace(messageID)
	emoji = strings.TrimSpace(emoji)
	if actorID == "" || messageID == "" || emoji == "" {
		return false, apperr.E("MISSING_FIELDS", nil)
	}

	msg, err := s.repo.FindByID(ctx, messageID)
	if err != nil {
		return false, err
	}
	channel, err := s.channelRepo.FindByID(ctx, msg.ChannelID)
	if err != nil {
		return false, err
	}
	if _, err := s.serverRepo.FindMember(ctx, channel.ServerID, actorID); err != nil {
		return false, apperr.E("NOT_SERVER_MEMBER", err)
	}
	canReact, err := s.serverRepo.HasPermission(ctx, channel.ServerID, actorID, models.PermissionAddReactions)
	if err != nil {
		return false, err
	}
	if !canReact {
		return false, apperr.E("INSUFFICIENT_PERMISSION", nil)
	}
	if channel.IsPrivate {
		isMember, err := s.channelRepo.IsMember(ctx, channel.ID, actorID)
		if err != nil {
			return false, err
		}
		if !isMember {
			return false, apperr.E("CHANNEL_ACCESS_DENIED", nil)
		}
	}

	existing, err := s.repo.FindReaction(ctx, messageID, actorID, emoji)
	if err == nil && existing != nil {
		if err := s.repo.DeleteReaction(ctx, existing.ID); err != nil {
			return false, err
		}
		return false, nil
	}
	if ae, ok := apperr.From(err); ok && ae.Code != "REACTION_NOT_FOUND" {
		return false, err
	}

	reaction := &models.Reaction{
		MessageID: messageID,
		UserID:    actorID,
		Emoji:     emoji,
	}
	if err := s.repo.CreateReaction(ctx, reaction); err != nil {
		return false, err
	}
	return true, nil
}
