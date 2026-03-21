package serializers

import (
	"encoding/json"

	"github.com/sagiri2004/goportal/pkg/models"
)

type CreateMessageRequest struct {
	ChannelID     string   `json:"channel_id" binding:"required"`
	ContentType   string   `json:"content_type" binding:"required"`
	Content       string   `json:"content" binding:"required"`
	Encoding      string   `json:"encoding"`
	IsPinned      bool     `json:"is_pinned"`
	AttachmentIDs []string `json:"attachment_ids"`
}

type UpdateMessageRequest struct {
	ContentType string `json:"content_type" binding:"required"`
	Content     string `json:"content" binding:"required"`
	Encoding    string `json:"encoding"`
}

type ToggleReactionRequest struct {
	Emoji string `json:"emoji" binding:"required"`
}

type UploadResponse struct {
	AttachmentID *string `json:"attachment_id,omitempty"`
	MediaType    string  `json:"media_type"`
	URL          string  `json:"url"`
	FileName     string  `json:"file_name"`
	FileType     string  `json:"file_type"`
	FileSize     int64   `json:"file_size"`
}

type MessageResponse struct {
	ID          string                        `json:"id"`
	ChannelID   string                        `json:"channel_id"`
	AuthorID    string                        `json:"author_id"`
	Author      *UserResponse                 `json:"author,omitempty"`
	Content     models.MessageContentEnvelope `json:"content"`
	IsEdited    bool                          `json:"is_edited"`
	IsPinned    bool                          `json:"is_pinned"`
	CreatedAt   int64                         `json:"created_at"`
	UpdatedAt   int64                         `json:"updated_at"`
	Attachments []AttachmentResponse          `json:"attachments"`
	Reactions   []ReactionResponse            `json:"reactions"`
}

type AttachmentResponse struct {
	ID       string `json:"id"`
	FileURL  string `json:"file_url"`
	FileType string `json:"file_type"`
	FileSize int64  `json:"file_size"`
	FileName string `json:"file_name"`
}

type ReactionResponse struct {
	ID        string `json:"id"`
	MessageID string `json:"message_id"`
	UserID    string `json:"user_id"`
	Emoji     string `json:"emoji"`
}

func NewMessageResponse(
	m *models.Message,
	author *models.User,
	attachments []models.MessageAttachment,
	reactions []models.Reaction,
) MessageResponse {
	content := models.MessageContentEnvelope{}
	_ = json.Unmarshal(m.Content, &content)

	attResp := make([]AttachmentResponse, 0, len(attachments))
	for i := range attachments {
		attResp = append(attResp, AttachmentResponse{
			ID:       attachments[i].ID,
			FileURL:  attachments[i].FileURL,
			FileType: attachments[i].FileType,
			FileSize: attachments[i].FileSize,
			FileName: attachments[i].FileName,
		})
	}

	reactionResp := make([]ReactionResponse, 0, len(reactions))
	for i := range reactions {
		reactionResp = append(reactionResp, ReactionResponse{
			ID:        reactions[i].ID,
			MessageID: reactions[i].MessageID,
			UserID:    reactions[i].UserID,
			Emoji:     reactions[i].Emoji,
		})
	}

	var authorResp *UserResponse
	if author != nil {
		mapped := NewUserResponse(author)
		authorResp = &mapped
	}

	return MessageResponse{
		ID:          m.ID,
		ChannelID:   m.ChannelID,
		AuthorID:    m.AuthorID,
		Author:      authorResp,
		Content:     content,
		IsEdited:    m.IsEdited,
		IsPinned:    m.IsPinned,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
		Attachments: attResp,
		Reactions:   reactionResp,
	}
}
