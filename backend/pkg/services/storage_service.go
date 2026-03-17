package services

import (
	"context"
	"mime/multipart"
)

type UploadedFile struct {
	URL      string `json:"url"`
	FileName string `json:"file_name"`
	FileType string `json:"file_type"`
	FileSize int64  `json:"file_size"`
}

type StorageService interface {
	Upload(ctx context.Context, fileHeader *multipart.FileHeader) (*UploadedFile, error)
}
