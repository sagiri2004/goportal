package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/serializers"
)

type voiceController struct{}

var Voice = new(voiceController)

func (ctrl *voiceController) GenerateToken(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	channelID := c.Param("id")
	result, err := containers.VoiceService().GenerateVoiceToken(c.Request.Context(), userID, channelID)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Voice token generated", serializers.NewVoiceTokenResponse(result.Token, result.URL)))
}

func (ctrl *voiceController) StartRecording(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	channelID := c.Param("id")
	recording, err := containers.VoiceService().StartChannelRecording(c.Request.Context(), userID, channelID)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Recording started", serializers.NewRecordingResponse(recording)))
}

func (ctrl *voiceController) StopRecording(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	channelID := c.Param("id")
	recording, err := containers.VoiceService().StopChannelRecording(c.Request.Context(), userID, channelID)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Recording stopped", serializers.NewRecordingResponse(recording)))
}

func (ctrl *voiceController) ListRecordings(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	channelID := c.Param("id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	recordings, err := containers.VoiceService().ListChannelRecordings(c.Request.Context(), userID, channelID, limit, offset)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	resp := make([]serializers.RecordingResponse, 0, len(recordings))
	for i := range recordings {
		resp = append(resp, serializers.NewRecordingResponse(&recordings[i]))
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Recordings fetched", gin.H{
		"items":  resp,
		"limit":  limit,
		"offset": offset,
	}))
}

func (ctrl *voiceController) StartStream(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	channelID := c.Param("id")

	var req serializers.StartStreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}

	recording, err := containers.VoiceService().StartChannelRTMPStream(c.Request.Context(), userID, channelID, req.RTMPURL)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "RTMP stream started", serializers.NewRecordingResponse(recording)))
}

func (ctrl *voiceController) StopStream(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	channelID := c.Param("id")

	recording, err := containers.VoiceService().StopChannelRTMPStream(c.Request.Context(), userID, channelID)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "RTMP stream stopped", serializers.NewRecordingResponse(recording)))
}

func (ctrl *voiceController) LiveKitWebhook(c *gin.Context) {
	evt, err := containers.LiveKitService().VerifyWebhook(c.Request)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusUnauthorized, serializers.Error("LIVEKIT_WEBHOOK_INVALID", "Invalid LiveKit webhook signature"))
		return
	}

	if err := containers.VoiceService().HandleWebhookEvent(c.Request.Context(), evt); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Webhook processed", nil))
}
