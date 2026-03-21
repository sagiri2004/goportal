package v1

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/serializers"
	"github.com/sagiri2004/goportal/pkg/services"
)

type uploadController struct{}

var Upload = new(uploadController)

func (ctrl *uploadController) UploadFile(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("MISSING_FIELDS", "File is required"))
		return
	}

	mediaType, err := parseMediaType(c.PostForm("media_type"))
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	uploaded, err := containers.StorageService().Upload(
		c.Request.Context(),
		fileHeader,
		services.UploadOptions{MediaType: mediaType},
	)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("UPLOAD_FAILED", "Failed to upload file"))
		return
	}

	var attachmentID *string
	if mediaType == services.MediaTypeMessageAttachment {
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
		attachmentID = &attachment.ID
	}

	c.JSON(http.StatusCreated, serializers.Success("OK", "File uploaded", serializers.UploadResponse{
		AttachmentID: attachmentID,
		MediaType:    string(mediaType),
		URL:          uploaded.URL,
		FileName:     uploaded.FileName,
		FileType:     uploaded.FileType,
		FileSize:     uploaded.FileSize,
	}))
}

func parseMediaType(raw string) (services.UploadMediaType, error) {
	switch services.UploadMediaType(strings.TrimSpace(raw)) {
	case "":
		return services.MediaTypeMessageAttachment, nil
	case services.MediaTypeAvatar,
		services.MediaTypeServerIcon,
		services.MediaTypeServerBanner,
		services.MediaTypeMessageAttachment,
		services.MediaTypeRoleIcon:
		return services.UploadMediaType(strings.TrimSpace(raw)), nil
	default:
		return "", apperr.E("INVALID_MEDIA_TYPE", nil)
	}
}
