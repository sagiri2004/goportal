package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/serializers"
)

type uploadController struct{}

var Upload = new(uploadController)

func (ctrl *uploadController) UploadFile(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("MISSING_FIELDS", "File is required"))
		return
	}

	uploaded, err := containers.StorageService().Upload(c.Request.Context(), fileHeader)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("UPLOAD_FAILED", "Failed to upload file"))
		return
	}

	attachment := &models.MessageAttachment{
		FileURL:  uploaded.URL,
		FileType: uploaded.FileType,
		FileSize: uploaded.FileSize,
		FileName: uploaded.FileName,
	}
	if err := containers.MessageRepository().CreateAttachment(c.Request.Context(), attachment); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("DB_ERROR", "Database error"))
		return
	}

	c.JSON(http.StatusCreated, serializers.Success("OK", "File uploaded", serializers.UploadResponse{
		AttachmentID: attachment.ID,
		URL:          uploaded.URL,
		FileName:     uploaded.FileName,
		FileType:     uploaded.FileType,
		FileSize:     uploaded.FileSize,
	}))
}
