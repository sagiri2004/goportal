package v1

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/serializers"
	"github.com/sagiri2004/goportal/pkg/services"
)

type messageController struct{}

var Message = new(messageController)

func (ctrl *messageController) ListByChannel(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	channelID := c.Param("id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	result, err := containers.MessageService().ListByChannel(c.Request.Context(), userID, channelID, limit, offset)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	attachmentByMsg := map[string][]serializers.AttachmentResponse{}
	for _, att := range result.Attachments {
		if att.MessageID == nil {
			continue
		}
		attachmentByMsg[*att.MessageID] = append(attachmentByMsg[*att.MessageID], serializers.AttachmentResponse{
			ID:       att.ID,
			FileURL:  att.FileURL,
			FileType: att.FileType,
			FileSize: att.FileSize,
			FileName: att.FileName,
		})
	}
	reactionByMsg := map[string][]serializers.ReactionResponse{}
	for _, r := range result.Reactions {
		reactionByMsg[r.MessageID] = append(reactionByMsg[r.MessageID], serializers.ReactionResponse{
			ID:        r.ID,
			MessageID: r.MessageID,
			UserID:    r.UserID,
			Emoji:     r.Emoji,
		})
	}

	authorByID := map[string]*models.User{}
	for i := range result.Authors {
		author := &result.Authors[i]
		authorByID[author.ID] = author
	}

	items := make([]serializers.MessageResponse, 0, len(result.Messages))
	for _, msg := range result.Messages {
		resp := serializers.NewMessageResponse(
			&msg,
			authorByID[msg.AuthorID],
			nil,
			nil,
		)
		resp.Attachments = attachmentByMsg[msg.ID]
		if resp.Attachments == nil {
			resp.Attachments = []serializers.AttachmentResponse{}
		}
		resp.Reactions = reactionByMsg[msg.ID]
		if resp.Reactions == nil {
			resp.Reactions = []serializers.ReactionResponse{}
		}
		items = append(items, resp)
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Messages fetched", gin.H{
		"items":  items,
		"limit":  limit,
		"offset": offset,
	}))
}

func (ctrl *messageController) Create(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	var req serializers.CreateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}

	payload, _ := json.Marshal(req.Content)
	msg, err := containers.MessageService().CreateMessage(c.Request.Context(), services.CreateMessageInput{
		ChannelID:      req.ChannelID,
		AuthorID:       userID,
		ContentType:    req.ContentType,
		ContentPayload: payload,
		Encoding:       req.Encoding,
		IsPinned:       req.IsPinned,
		AttachmentIDs:  req.AttachmentIDs,
		ReplyToID:      req.ReplyToID,
	})
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	author, _ := containers.UserService().GetByID(c.Request.Context(), userID)
	attachments, _ := containers.MessageRepository().ListAttachmentsByMessageID(c.Request.Context(), msg.ID)
	c.JSON(
		http.StatusCreated,
		serializers.Success("OK", "Message created", serializers.NewMessageResponse(msg, author, attachments, nil)),
	)
}

func (ctrl *messageController) Update(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	messageID := c.Param("id")

	var req serializers.UpdateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}

	payload, _ := json.Marshal(req.Content)
	msg, err := containers.MessageService().UpdateMessage(c.Request.Context(), services.UpdateMessageInput{
		MessageID:      messageID,
		ActorID:        userID,
		ContentType:    req.ContentType,
		ContentPayload: payload,
		Encoding:       req.Encoding,
	})
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	author, _ := containers.UserService().GetByID(c.Request.Context(), userID)
	c.JSON(
		http.StatusOK,
		serializers.Success("OK", "Message updated", serializers.NewMessageResponse(msg, author, nil, nil)),
	)
}

func (ctrl *messageController) Delete(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	messageID := c.Param("id")
	if err := containers.MessageService().DeleteMessage(c.Request.Context(), userID, messageID); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Message deleted", nil))
}

func (ctrl *messageController) ToggleReaction(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	messageID := c.Param("id")

	var req serializers.ToggleReactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}

	added, err := containers.MessageService().ToggleReaction(c.Request.Context(), userID, messageID, req.Emoji)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	action := "removed"
	if added {
		action = "added"
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Reaction "+action, gin.H{"added": added}))
}

func (ctrl *messageController) RemoveReaction(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	messageID := c.Param("id")
	emoji := c.Param("emoji")
	if emoji == "" {
		c.JSON(http.StatusBadRequest, serializers.Error("MISSING_FIELDS", "Missing required fields"))
		return
	}

	added, err := containers.MessageService().ToggleReaction(c.Request.Context(), userID, messageID, emoji)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	// Reaction didn't exist; restore previous state as no-op delete.
	if added {
		_, _ = containers.MessageService().ToggleReaction(c.Request.Context(), userID, messageID, emoji)
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Reaction removed", nil))
}
