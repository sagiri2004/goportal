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
	repo repositories.UserRepository
}

// NewUserService creates a new UserService implementation.
func NewUserService(repo repositories.UserRepository) services.UserService {
	return &userService{repo: repo}
}

func (s *userService) Register(ctx context.Context, username, password string, isAdmin bool) (*models.User, error) {
	username = strings.TrimSpace(username)
	if username == "" || password == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	// check if exists
	if existing, err := s.repo.FindByUsername(ctx, username); err == nil && existing != nil {
		return nil, apperr.E("USERNAME_EXISTS", nil)
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

func (s *userService) GetByID(ctx context.Context, id uint) (*models.User, error) {
	if id == 0 {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	return s.repo.FindByID(ctx, id)
}
