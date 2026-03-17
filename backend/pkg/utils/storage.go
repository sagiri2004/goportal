package utils

import (
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/sagiri2004/goportal/pkg/apperr"
)

const MaxUploadSize int64 = 10 * 1024 * 1024 // 10MB

var allowedMimePrefixes = []string{
	"image/",
}

var allowedExactMime = map[string]struct{}{
	"application/pdf":              {},
	"application/zip":              {},
	"application/x-zip-compressed": {},
}

func ValidateUpload(fileHeader *multipart.FileHeader, contentType string) error {
	if fileHeader == nil {
		return apperr.E("MISSING_FIELDS", nil)
	}
	if fileHeader.Size > MaxUploadSize {
		return apperr.E("FILE_TOO_LARGE", nil)
	}
	if contentType == "" {
		contentType = detectTypeFromExt(fileHeader.Filename)
	}
	if !isAllowedMime(contentType) {
		return apperr.E("FILE_TYPE_NOT_ALLOWED", nil)
	}
	return nil
}

func isAllowedMime(contentType string) bool {
	if _, ok := allowedExactMime[strings.ToLower(contentType)]; ok {
		return true
	}
	lower := strings.ToLower(contentType)
	for _, p := range allowedMimePrefixes {
		if strings.HasPrefix(lower, p) {
			return true
		}
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
