package impl

import (
	"context"
	"encoding/json"
	"regexp"
	"slices"
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
const chatMessageUpdatedTopic = "chat.message.updated"
const chatMessageDeletedTopic = "chat.message.deleted"
const chatReactionAddedTopic = "chat.reaction.added"
const chatReactionRemovedTopic = "chat.reaction.removed"

type messageService struct {
	repo        repositories.MessageRepository
	serverRepo  repositories.ServerRepository
	channelRepo repositories.ChannelRepository
	userRepo    repositories.UserRepository
	storage     services.StorageService
	publisher   message.Publisher
}

var (
	userMentionPattern    = regexp.MustCompile(`@([a-zA-Z0-9_.-]+)`)
	channelMentionPattern = regexp.MustCompile(`#([a-zA-Z0-9_-]+)`)
)

func NewMessageService(
	repo repositories.MessageRepository,
	serverRepo repositories.ServerRepository,
	channelRepo repositories.ChannelRepository,
	userRepo repositories.UserRepository,
	storage services.StorageService,
	publisher message.Publisher,
) services.MessageService {
	return &messageService{
		repo:        repo,
		serverRepo:  serverRepo,
		channelRepo: channelRepo,
		userRepo:    userRepo,
		storage:     storage,
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
		ReplyToID: input.ReplyToID,
	}
	if input.ReplyToID != nil && strings.TrimSpace(*input.ReplyToID) != "" {
		parent, err := s.repo.FindByID(ctx, strings.TrimSpace(*input.ReplyToID))
		if err != nil {
			return nil, err
		}
		if parent.ChannelID != input.ChannelID {
			return nil, apperr.E("INVALID_ACTION", nil)
		}
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

	author, _ := s.userRepo.FindByID(ctx, msg.AuthorID)
	mentions, err := s.resolveMentions(ctx, channel, msg, contentEnvelope)
	if err != nil {
		return nil, err
	}
	if err := s.repo.SaveMentions(ctx, mentions); err != nil {
		return nil, err
	}

	excluded := []string{msg.AuthorID}
	slices.Sort(excluded)
	excluded = slices.Compact(excluded)
	if err := s.repo.IncrementUnreadCounts(ctx, channel.ID, excluded); err != nil {
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
		ServerID:    channel.ServerID,
		ChannelID:   msg.ChannelID,
		AuthorID:    msg.AuthorID,
		MessageID:   msg.ID,
		Content:     contentEnvelope,
		Attachments: eventAttachments,
		Mentions:    mapMentionsToEvents(mentions),
		CreatedAt:   msg.CreatedAt,
		UpdatedAt:   msg.UpdatedAt,
	}
	if author != nil {
		event.Author = &models.EventAuthor{
			ID:        author.ID,
			Username:  author.Username,
			AvatarURL: author.AvatarURL,
		}
	}
	if msg.ReplyToID != nil && strings.TrimSpace(*msg.ReplyToID) != "" {
		if parent, err := s.repo.FindByID(ctx, *msg.ReplyToID); err == nil && parent != nil {
			parentContent := models.MessageContentEnvelope{}
			_ = json.Unmarshal(parent.Content, &parentContent)
			parentAuthorName := parent.AuthorID
			if parentAuthor, err := s.userRepo.FindByID(ctx, parent.AuthorID); err == nil && parentAuthor != nil {
				parentAuthorName = parentAuthor.Username
			}
			event.ReplyTo = &models.ReplyPreviewEvent{
				MessageID:  parent.ID,
				AuthorID:   parent.AuthorID,
				AuthorName: parentAuthorName,
				Content:    truncateString(contentPayloadToText(parentContent.Payload), 120),
			}
		}
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

	authorIDsSet := make(map[string]struct{}, len(messages))
	authorIDs := make([]string, 0, len(messages))
	for i := range messages {
		if _, exists := authorIDsSet[messages[i].AuthorID]; exists {
			continue
		}
		authorIDsSet[messages[i].AuthorID] = struct{}{}
		authorIDs = append(authorIDs, messages[i].AuthorID)
	}
	authors, err := s.userRepo.FindByIDs(ctx, authorIDs)
	if err != nil {
		return nil, err
	}

	return &services.ListMessagesResult{
		Messages:    messages,
		Attachments: attachments,
		Reactions:   reactions,
		Authors:     authors,
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
	if s.publisher != nil {
		channel, _ := s.channelRepo.FindByID(ctx, msg.ChannelID)
		author, _ := s.userRepo.FindByID(ctx, msg.AuthorID)
		event := models.ChatMessageCreatedEvent{
			EventID:    uuid.NewString(),
			EventType:  "MESSAGE_UPDATED",
			OccurredAt: time.Now().UTC().Format(time.RFC3339),
			ServerID:   "",
			ChannelID:  msg.ChannelID,
			AuthorID:   msg.AuthorID,
			MessageID:  msg.ID,
			CreatedAt:  msg.CreatedAt,
			UpdatedAt:  msg.UpdatedAt,
		}
		if channel != nil {
			event.ServerID = channel.ServerID
		}
		_ = json.Unmarshal(msg.Content, &event.Content)
		if author != nil {
			event.Author = &models.EventAuthor{
				ID:        author.ID,
				Username:  author.Username,
				AvatarURL: author.AvatarURL,
			}
		}
		if payload, err := json.Marshal(event); err == nil {
			wmMsg := message.NewMessage(event.EventID, payload)
			wmMsg.SetContext(ctx)
			_ = s.publisher.Publish(chatMessageUpdatedTopic, wmMsg)
		}
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

	attachments, err := s.repo.ListAttachmentsByMessageID(ctx, messageID)
	if err != nil {
		return err
	}

	if err := s.repo.SoftDelete(ctx, messageID); err != nil {
		return err
	}
	if err := s.repo.SoftDeleteAttachmentsByMessageID(ctx, messageID); err != nil {
		return err
	}

	for i := range attachments {
		_ = s.storage.DeleteByURL(ctx, attachments[i].FileURL)
	}
	if s.publisher != nil {
		channel, _ := s.channelRepo.FindByID(ctx, msg.ChannelID)
		event := models.MessageDeletedEvent{
			EventID:    uuid.NewString(),
			EventType:  "MESSAGE_DELETED",
			OccurredAt: time.Now().UTC().Format(time.RFC3339),
			ServerID:   "",
			MessageID:  msg.ID,
			ChannelID:  msg.ChannelID,
		}
		if channel != nil {
			event.ServerID = channel.ServerID
		}
		if payload, err := json.Marshal(event); err == nil {
			wmMsg := message.NewMessage(event.EventID, payload)
			wmMsg.SetContext(ctx)
			_ = s.publisher.Publish(chatMessageDeletedTopic, wmMsg)
		}
	}

	return nil
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
		s.publishReactionChanged(ctx, "REACTION_REMOVED", chatReactionRemovedTopic, msg, actorID, emoji)
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
	s.publishReactionChanged(ctx, "REACTION_ADDED", chatReactionAddedTopic, msg, actorID, emoji)
	return true, nil
}

func (s *messageService) publishReactionChanged(
	ctx context.Context,
	eventType, topic string,
	msg *models.Message,
	userID, emoji string,
) {
	if s.publisher == nil || msg == nil {
		return
	}
	username := userID
	if user, err := s.userRepo.FindByID(ctx, userID); err == nil && user != nil {
		username = user.Username
	}
	event := models.ReactionChangedEvent{
		EventID:    uuid.NewString(),
		EventType:  eventType,
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
		ServerID:   "",
		MessageID:  msg.ID,
		ChannelID:  msg.ChannelID,
		Emoji:      emoji,
		UserID:     userID,
		Username:   username,
	}
	if channel, err := s.channelRepo.FindByID(ctx, msg.ChannelID); err == nil && channel != nil {
		event.ServerID = channel.ServerID
	}
	payload, err := json.Marshal(event)
	if err != nil {
		return
	}
	wmMsg := message.NewMessage(event.EventID, payload)
	wmMsg.SetContext(ctx)
	_ = s.publisher.Publish(topic, wmMsg)
}

func (s *messageService) resolveMentions(
	ctx context.Context,
	channel *models.Channel,
	msg *models.Message,
	content models.MessageContentEnvelope,
) ([]models.MessageMention, error) {
	text := strings.TrimSpace(contentPayloadToText(content.Payload))
	if text == "" {
		return nil, nil
	}

	serverMembers, err := s.serverRepo.ListMembers(ctx, channel.ServerID)
	if err != nil {
		return nil, err
	}
	memberSet := make(map[string]struct{}, len(serverMembers))
	for i := range serverMembers {
		memberSet[serverMembers[i].ID] = struct{}{}
	}
	mentions := make([]models.MessageMention, 0)
	mentionedUsers := make(map[string]struct{})

	if strings.Contains(strings.ToLower(text), "@everyone") {
		mentions = append(mentions, models.MessageMention{
			MessageID:   msg.ID,
			MentionType: models.MentionTypeEveryone,
		})
	}
	if strings.Contains(strings.ToLower(text), "@here") {
		mentions = append(mentions, models.MessageMention{
			MessageID:   msg.ID,
			MentionType: models.MentionTypeHere,
		})
	}

	for _, match := range userMentionPattern.FindAllStringSubmatch(text, -1) {
		if len(match) < 2 {
			continue
		}
		handle := strings.TrimSpace(match[1])
		if strings.EqualFold(handle, "everyone") || strings.EqualFold(handle, "here") {
			continue
		}
		user, err := s.userRepo.FindByUsername(ctx, handle)
		if err != nil || user == nil {
			continue
		}
		if _, ok := memberSet[user.ID]; !ok {
			continue
		}
		if _, ok := mentionedUsers[user.ID]; ok {
			continue
		}
		mentionedUsers[user.ID] = struct{}{}
		userID := user.ID
		mentions = append(mentions, models.MessageMention{
			MessageID:       msg.ID,
			MentionType:     models.MentionTypeUser,
			MentionedUserID: &userID,
		})
	}

	if len(matchChannelMentions(text)) > 0 {
		channels, err := s.channelRepo.ListByServerID(ctx, channel.ServerID)
		if err == nil {
			byName := make(map[string]models.Channel, len(channels))
			for i := range channels {
				byName[strings.ToLower(channels[i].Name)] = channels[i]
			}
			for _, channelName := range matchChannelMentions(text) {
				ch, ok := byName[strings.ToLower(channelName)]
				if !ok {
					continue
				}
				if ch.Type != models.ChannelTypeText {
					continue
				}
				chID := ch.ID
				mentions = append(mentions, models.MessageMention{
					MessageID:   msg.ID,
					MentionType: models.MentionTypeChannel,
					ChannelID:   &chID,
				})
			}
		}
	}

	return mentions, nil
}

func matchChannelMentions(content string) []string {
	found := make([]string, 0)
	seen := map[string]struct{}{}
	for _, match := range channelMentionPattern.FindAllStringSubmatch(content, -1) {
		if len(match) < 2 {
			continue
		}
		name := strings.TrimSpace(match[1])
		if name == "" {
			continue
		}
		key := strings.ToLower(name)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		found = append(found, name)
	}
	return found
}

func mapMentionsToEvents(mentions []models.MessageMention) []models.MentionEvent {
	items := make([]models.MentionEvent, 0, len(mentions))
	for i := range mentions {
		items = append(items, models.MentionEvent{
			MentionType:     mentions[i].MentionType,
			MentionedUserID: mentions[i].MentionedUserID,
			ChannelID:       mentions[i].ChannelID,
		})
	}
	return items
}

func truncateString(text string, max int) string {
	if max <= 0 {
		return ""
	}
	runes := []rune(text)
	if len(runes) <= max {
		return text
	}
	return string(runes[:max])
}

func contentPayloadToText(payload json.RawMessage) string {
	var parsed string
	if err := json.Unmarshal(payload, &parsed); err == nil {
		return parsed
	}
	return string(payload)
}
