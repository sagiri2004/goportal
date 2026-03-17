package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/serializers"
)

type channelController struct{}

var Channel = new(channelController)

func (ctrl *channelController) Create(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	serverID := c.Param("id")

	var req serializers.CreateChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}

	channel, err := containers.ChannelService().CreateChannel(
		c.Request.Context(),
		userID,
		serverID,
		req.Name,
		req.Type,
		req.ParentID,
		req.Position,
	)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusCreated, serializers.Success("OK", "Channel created", serializers.NewChannelResponse(channel)))
}

func (ctrl *channelController) GetByID(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	channelID := c.Param("id")
	channel, err := containers.ChannelService().GetChannel(c.Request.Context(), userID, channelID)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Channel fetched", serializers.NewChannelResponse(channel)))
}

func (ctrl *channelController) UpdatePosition(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	channelID := c.Param("id")
	var req serializers.UpdateChannelPositionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}

	channel, err := containers.ChannelService().UpdatePosition(c.Request.Context(), userID, channelID, req.Position)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Channel position updated", serializers.NewChannelResponse(channel)))
}

func (ctrl *channelController) UpdatePrivacy(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	channelID := c.Param("id")
	var req serializers.UpdateChannelPrivacyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	channel, err := containers.ChannelService().SetPrivacy(c.Request.Context(), userID, channelID, req.IsPrivate)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Channel privacy updated", serializers.NewChannelResponse(channel)))
}

func (ctrl *channelController) AddMember(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	channelID := c.Param("id")
	var req serializers.ChannelMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	if err := containers.ChannelService().AddMember(c.Request.Context(), userID, channelID, req.UserID); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Channel member added", nil))
}

func (ctrl *channelController) RemoveMember(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	channelID := c.Param("id")
	targetUserID := c.Param("userId")
	if err := containers.ChannelService().RemoveMember(c.Request.Context(), userID, channelID, targetUserID); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Channel member removed", nil))
}

func (ctrl *channelController) ListMembers(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	channelID := c.Param("id")
	members, err := containers.ChannelService().ListMembers(c.Request.Context(), userID, channelID)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	resp := make([]serializers.ChannelMemberResponse, 0, len(members))
	for i := range members {
		resp = append(resp, serializers.NewChannelMemberResponse(&members[i]))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Channel members fetched", resp))
}

func (ctrl *channelController) UpsertOverwrite(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	channelID := c.Param("id")
	var req serializers.UpsertChannelOverwriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	if err := containers.ChannelService().UpsertOverwrite(c.Request.Context(), userID, channelID, req.SubjectType, req.SubjectID, req.AllowBits, req.DenyBits); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Channel overwrite upserted", nil))
}

func (ctrl *channelController) DeleteOverwrite(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	channelID := c.Param("id")
	subjectType := c.Param("subjectType")
	subjectID := c.Param("subjectId")
	if err := containers.ChannelService().DeleteOverwrite(c.Request.Context(), userID, channelID, subjectType, subjectID); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Channel overwrite removed", nil))
}

func (ctrl *channelController) ListOverwrites(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	channelID := c.Param("id")
	overwrites, err := containers.ChannelService().ListOverwrites(c.Request.Context(), userID, channelID)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	resp := make([]serializers.ChannelOverwriteResponse, 0, len(overwrites))
	for i := range overwrites {
		resp = append(resp, serializers.NewChannelOverwriteResponse(&overwrites[i]))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Channel overwrites fetched", resp))
}
