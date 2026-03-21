package impl

import (
	"context"
	"strings"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"

	"golang.org/x/crypto/bcrypt"
)

type userService struct {
	repo    repositories.UserRepository
	storage services.StorageService
}

// NewUserService creates a new UserService implementation.
func NewUserService(repo repositories.UserRepository, storage services.StorageService) services.UserService {
	return &userService{repo: repo, storage: storage}
}

func (s *userService) Register(ctx context.Context, username, password string, isAdmin bool) (*models.User, error) {
	username = strings.TrimSpace(username)
	if username == "" || password == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	existing, err := s.repo.FindByUsername(ctx, username)
	if err == nil && existing != nil {
		return nil, apperr.E("USERNAME_EXISTS", nil)
	}
	if err != nil {
		if ae, ok := apperr.From(err); !ok || ae.Code != "USER_NOT_FOUND" {
			return nil, err
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperr.E("INTERNAL_ERROR", err)
	}

	u := &models.User{
		Username: username,
		Password: string(hash),
		IsAdmin:  isAdmin,
	}

	if err := s.repo.Create(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

func (s *userService) Authenticate(ctx context.Context, username, password string) (*models.User, error) {
	username = strings.TrimSpace(username)
	if username == "" || password == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	u, err := s.repo.FindByUsername(ctx, username)
	if err != nil {
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password)); err != nil {
		return nil, apperr.E("BAD_CREDENTIALS", err)
	}
	return u, nil
}

func (s *userService) GetByID(ctx context.Context, id string) (*models.User, error) {
	if id == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	return s.repo.FindByID(ctx, id)
}

func (s *userService) UpdateProfile(ctx context.Context, id string, username, avatarURL *string) (*models.User, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	user, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if username == nil && avatarURL == nil {
		return user, nil
	}

	if username != nil {
		trimmed := strings.TrimSpace(*username)
		if trimmed == "" {
			return nil, apperr.E("MISSING_FIELDS", nil)
		}

		existing, err := s.repo.FindByUsername(ctx, trimmed)
		if err == nil && existing != nil && existing.ID != id {
			return nil, apperr.E("USERNAME_EXISTS", nil)
		}
		if err != nil {
			if ae, ok := apperr.From(err); !ok || ae.Code != "USER_NOT_FOUND" {
				return nil, err
			}
		}
		user.Username = trimmed
	}

	var previousAvatar string
	if user.AvatarURL != nil {
		previousAvatar = *user.AvatarURL
	}

	if avatarURL != nil {
		trimmed := strings.TrimSpace(*avatarURL)
		if trimmed == "" {
			user.AvatarURL = nil
		} else {
			user.AvatarURL = &trimmed
		}
	}

	if err := s.repo.Update(ctx, user); err != nil {
		return nil, err
	}

	if avatarURL != nil && previousAvatar != "" {
		current := ""
		if user.AvatarURL != nil {
			current = *user.AvatarURL
		}
		if previousAvatar != current {
			_ = s.storage.DeleteByURL(ctx, previousAvatar)
		}
	}

	return user, nil
}
