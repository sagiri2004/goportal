package utils

import (
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/services"
)

const (
	MaxImageUploadSize      int64 = 5 * 1024 * 1024  // 5MB
	MaxAttachmentUploadSize int64 = 25 * 1024 * 1024 // 25MB
)

var allowedMimePrefixes = []string{
	"image/",
}

var allowedExactMime = map[string]struct{}{
	"application/pdf":              {},
	"application/zip":              {},
	"application/x-zip-compressed": {},
}

func ValidateUpload(fileHeader *multipart.FileHeader, contentType string, mediaType services.UploadMediaType) error {
	if fileHeader == nil {
		return apperr.E("MISSING_FIELDS", nil)
	}
	if mediaType == "" {
		mediaType = services.MediaTypeMessageAttachment
	}

	limit := uploadSizeLimitByType(mediaType)
	if fileHeader.Size > limit {
		return apperr.E("FILE_TOO_LARGE", nil)
	}
	if contentType == "" {
		contentType = detectTypeFromExt(fileHeader.Filename)
	}
	if !isAllowedMime(contentType, mediaType) {
		return apperr.E("FILE_TYPE_NOT_ALLOWED", nil)
	}
	return nil
}

func uploadSizeLimitByType(mediaType services.UploadMediaType) int64 {
	switch mediaType {
	case services.MediaTypeAvatar, services.MediaTypeServerIcon, services.MediaTypeServerBanner, services.MediaTypeRoleIcon:
		return MaxImageUploadSize
	default:
		return MaxAttachmentUploadSize
	}
}

func isAllowedMime(contentType string, mediaType services.UploadMediaType) bool {
	lower := strings.ToLower(contentType)
	if lower == "" {
		return false
	}
	if mediaType == services.MediaTypeAvatar ||
		mediaType == services.MediaTypeServerIcon ||
		mediaType == services.MediaTypeServerBanner ||
		mediaType == services.MediaTypeRoleIcon {
		return strings.HasPrefix(lower, "image/")
	}

	if _, ok := allowedExactMime[strings.ToLower(contentType)]; ok {
		return true
	}
	for _, p := range allowedMimePrefixes {
		if strings.HasPrefix(lower, p) {
			return true
		}
	}
	if strings.HasPrefix(lower, "video/") || strings.HasPrefix(lower, "audio/") {
		return true
	}
	return false
}

func detectTypeFromExt(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".pdf":
		return "application/pdf"
	case ".zip":
		return "application/zip"
	default:
		return fmt.Sprintf("application/%s", strings.TrimPrefix(ext, "."))
	}
}
