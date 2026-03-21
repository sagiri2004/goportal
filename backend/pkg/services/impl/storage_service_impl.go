package impl

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/google/uuid"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/services"
	"github.com/sagiri2004/goportal/pkg/utils"
)

type StorageProvider interface {
	Upload(ctx context.Context, fileHeader *multipart.FileHeader, opts services.UploadOptions) (*services.UploadedFile, error)
	DeleteByURL(ctx context.Context, fileURL string) error
}

type storageService struct {
	provider StorageProvider
}

func NewStorageService(provider StorageProvider) services.StorageService {
	return &storageService{provider: provider}
}

func (s *storageService) Upload(ctx context.Context, fileHeader *multipart.FileHeader, opts services.UploadOptions) (*services.UploadedFile, error) {
	if opts.MediaType == "" {
		opts.MediaType = services.MediaTypeMessageAttachment
	}
	return s.provider.Upload(ctx, fileHeader, opts)
}

func (s *storageService) DeleteByURL(ctx context.Context, fileURL string) error {
	return s.provider.DeleteByURL(ctx, fileURL)
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

func (p *localStorageProvider) Upload(_ context.Context, fileHeader *multipart.FileHeader, opts services.UploadOptions) (*services.UploadedFile, error) {
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
	if err := utils.ValidateUpload(fileHeader, contentType, opts.MediaType); err != nil {
		return nil, err
	}

	subDir := mediaTypeFolder(opts.MediaType)
	targetDir := filepath.Join(p.baseDir, subDir)
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return nil, apperr.E("UPLOAD_FAILED", err)
	}

	ext := filepath.Ext(fileHeader.Filename)
	newName := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), uuid.NewString(), ext)
	fullPath := filepath.Join(targetDir, newName)

	out, err := os.Create(fullPath)
	if err != nil {
		return nil, apperr.E("UPLOAD_FAILED", err)
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		return nil, apperr.E("UPLOAD_FAILED", err)
	}

	return &services.UploadedFile{
		URL:      fmt.Sprintf("%s/%s/%s", strings.TrimRight(p.baseURL, "/"), subDir, newName),
		FileName: fileHeader.Filename,
		FileType: contentType,
		FileSize: fileHeader.Size,
		PublicID: "",
	}, nil
}

func (p *localStorageProvider) DeleteByURL(_ context.Context, fileURL string) error {
	if fileURL == "" {
		return nil
	}
	if strings.HasPrefix(fileURL, "http://") || strings.HasPrefix(fileURL, "https://") {
		parsed, err := url.Parse(fileURL)
		if err != nil {
			return nil
		}
		fileURL = parsed.Path
	}
	rel := strings.TrimPrefix(fileURL, "/")
	rel = strings.TrimPrefix(rel, strings.Trim(strings.TrimSpace(p.baseURL), "/")+"/")
	if rel == "" {
		return nil
	}
	fullPath := filepath.Join(p.baseDir, rel)
	if err := os.Remove(fullPath); err != nil && !os.IsNotExist(err) {
		return apperr.E("UPLOAD_FAILED", err)
	}
	return nil
}

type cloudinaryStorageProvider struct {
	client       *cloudinary.Cloudinary
	folderPrefix string
}

func NewCloudinaryStorageProvider(cloudName, apiKey, apiSecret, folderPrefix string) (StorageProvider, error) {
	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return nil, err
	}
	return &cloudinaryStorageProvider{
		client:       cld,
		folderPrefix: strings.Trim(strings.TrimSpace(folderPrefix), "/"),
	}, nil
}

func (p *cloudinaryStorageProvider) Upload(ctx context.Context, fileHeader *multipart.FileHeader, opts services.UploadOptions) (*services.UploadedFile, error) {
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
	if err := utils.ValidateUpload(fileHeader, contentType, opts.MediaType); err != nil {
		return nil, err
	}

	params := uploader.UploadParams{
		Folder:       p.buildFolder(opts.MediaType),
		ResourceType: "auto",
	}

	res, err := p.client.Upload.Upload(ctx, file, params)
	if err != nil {
		return nil, apperr.E("UPLOAD_FAILED", err)
	}

	return &services.UploadedFile{
		URL:      res.SecureURL,
		FileName: fileHeader.Filename,
		FileType: contentType,
		FileSize: fileHeader.Size,
		PublicID: res.PublicID,
	}, nil
}

func (p *cloudinaryStorageProvider) DeleteByURL(ctx context.Context, fileURL string) error {
	publicID, ok := extractCloudinaryPublicID(fileURL)
	if !ok {
		return nil
	}

	resourceTypes := []string{"image", "video", "raw"}
	for _, resourceType := range resourceTypes {
		_, err := p.client.Upload.Destroy(ctx, uploader.DestroyParams{
			PublicID:     publicID,
			ResourceType: resourceType,
		})
		if err == nil {
			return nil
		}
	}
	return nil
}

func (p *cloudinaryStorageProvider) buildFolder(mediaType services.UploadMediaType) string {
	sub := mediaTypeFolder(mediaType)
	if p.folderPrefix == "" {
		return sub
	}
	return path.Join(p.folderPrefix, sub)
}

func mediaTypeFolder(mediaType services.UploadMediaType) string {
	switch mediaType {
	case services.MediaTypeAvatar:
		return "avatars"
	case services.MediaTypeServerIcon, services.MediaTypeServerBanner:
		return "servers"
	case services.MediaTypeRoleIcon:
		return "roles"
	case services.MediaTypeMessageAttachment:
		return "messages"
	default:
		return "misc"
	}
}

var cloudinaryVersionPattern = regexp.MustCompile(`^v\d+$`)

func extractCloudinaryPublicID(fileURL string) (string, bool) {
	if fileURL == "" {
		return "", false
	}
	parsed, err := url.Parse(fileURL)
	if err != nil {
		return "", false
	}
	if !strings.Contains(parsed.Host, "res.cloudinary.com") {
		return "", false
	}

	uploadIndex := strings.Index(parsed.Path, "/upload/")
	if uploadIndex < 0 {
		return "", false
	}
	raw := strings.TrimPrefix(parsed.Path[uploadIndex+len("/upload/"):], "/")
	if raw == "" {
		return "", false
	}

	parts := strings.Split(raw, "/")
	if len(parts) == 0 {
		return "", false
	}
	if cloudinaryVersionPattern.MatchString(parts[0]) {
		parts = parts[1:]
	}
	if len(parts) == 0 {
		return "", false
	}

	publicWithExt := strings.Join(parts, "/")
	ext := path.Ext(publicWithExt)
	if ext == "" {
		return publicWithExt, true
	}
	return strings.TrimSuffix(publicWithExt, ext), true
}
