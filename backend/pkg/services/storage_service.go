package services

import (
	"context"
	"mime/multipart"
)

type UploadMediaType string

const (
	MediaTypeAvatar            UploadMediaType = "avatar"
	MediaTypeServerIcon        UploadMediaType = "server_icon"
	MediaTypeServerBanner      UploadMediaType = "server_banner"
	MediaTypeMessageAttachment UploadMediaType = "message_attachment"
	MediaTypeRoleIcon          UploadMediaType = "role_icon"
)

type UploadOptions struct {
	MediaType UploadMediaType
}

type UploadedFile struct {
	URL      string `json:"url"`
	FileName string `json:"file_name"`
	FileType string `json:"file_type"`
	FileSize int64  `json:"file_size"`
	PublicID string `json:"public_id"`
}

type StorageService interface {
	Upload(ctx context.Context, fileHeader *multipart.FileHeader, opts UploadOptions) (*UploadedFile, error)
	DeleteByURL(ctx context.Context, fileURL string) error
}
