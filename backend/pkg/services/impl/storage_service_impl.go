package impl

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/services"
	"github.com/sagiri2004/goportal/pkg/utils"
)

type StorageProvider interface {
	Upload(ctx context.Context, fileHeader *multipart.FileHeader) (*services.UploadedFile, error)
}

type storageService struct {
	provider StorageProvider
}

func NewStorageService(provider StorageProvider) services.StorageService {
	return &storageService{provider: provider}
}

func (s *storageService) Upload(ctx context.Context, fileHeader *multipart.FileHeader) (*services.UploadedFile, error) {
	return s.provider.Upload(ctx, fileHeader)
}

type localStorageProvider struct {
	baseDir string
	baseURL string
}

func NewLocalStorageProvider(baseDir, baseURL string) StorageProvider {
	return &localStorageProvider{
		baseDir: baseDir,
		baseURL: baseURL,
	}
}

func (p *localStorageProvider) Upload(_ context.Context, fileHeader *multipart.FileHeader) (*services.UploadedFile, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return nil, apperr.E("UPLOAD_FAILED", err)
	}
	defer file.Close()

	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])
	if _, err = file.Seek(0, io.SeekStart); err != nil {
		return nil, apperr.E("UPLOAD_FAILED", err)
	}
	if err := utils.ValidateUpload(fileHeader, contentType); err != nil {
		return nil, err
	}

	if err := os.MkdirAll(p.baseDir, 0o755); err != nil {
		return nil, apperr.E("UPLOAD_FAILED", err)
	}

	ext := filepath.Ext(fileHeader.Filename)
	newName := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), uuid.NewString(), ext)
	fullPath := filepath.Join(p.baseDir, newName)

	out, err := os.Create(fullPath)
	if err != nil {
		return nil, apperr.E("UPLOAD_FAILED", err)
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		return nil, apperr.E("UPLOAD_FAILED", err)
	}

	return &services.UploadedFile{
		URL:      fmt.Sprintf("%s/%s", p.baseURL, newName),
		FileName: fileHeader.Filename,
		FileType: contentType,
		FileSize: fileHeader.Size,
	}, nil
}
