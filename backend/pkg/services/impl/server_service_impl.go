package impl

import (
	"context"
	"strings"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

type serverService struct {
	userRepo   repositories.UserRepository
	serverRepo repositories.ServerRepository
}

func NewServerService(userRepo repositories.UserRepository, serverRepo repositories.ServerRepository) services.ServerService {
	return &serverService{
		userRepo:   userRepo,
		serverRepo: serverRepo,
	}
}

func (s *serverService) CreateServer(ctx context.Context, ownerID, name string) (*models.Server, error) {
	ownerID = strings.TrimSpace(ownerID)
	name = strings.TrimSpace(name)
	if ownerID == "" || name == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	if _, err := s.userRepo.FindByID(ctx, ownerID); err != nil {
		return nil, err
	}

	server := &models.Server{
		Name:    name,
		OwnerID: ownerID,
	}
	ownerMember := &models.ServerMember{
		UserID: ownerID,
	}

	if err := s.serverRepo.CreateWithOwnerMember(ctx, server, ownerMember); err != nil {
		return nil, err
	}
	return server, nil
}

func (s *serverService) ListMembers(ctx context.Context, actorID, serverID string) ([]models.User, error) {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	if _, err := s.serverRepo.FindByID(ctx, serverID); err != nil {
		return nil, err
	}
	if _, err := s.serverRepo.FindMember(ctx, serverID, actorID); err != nil {
		return nil, apperr.E("NOT_SERVER_MEMBER", err)
	}

	return s.serverRepo.ListMembers(ctx, serverID)
}

func (s *serverService) DeleteServer(ctx context.Context, actorID, serverID string) error {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}

	server, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}
	if server.OwnerID != actorID {
		return apperr.E("SERVER_OWNER_REQUIRED", nil)
	}

	return s.serverRepo.DeleteByID(ctx, serverID)
}

func (s *serverService) KickMember(ctx context.Context, actorID, serverID, memberUserID string) error {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	memberUserID = strings.TrimSpace(memberUserID)
	if actorID == "" || serverID == "" || memberUserID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}

	server, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}
	if server.OwnerID != actorID {
		return apperr.E("SERVER_OWNER_REQUIRED", nil)
	}
	if server.OwnerID == memberUserID {
		return apperr.E("CANNOT_KICK_OWNER", nil)
	}

	if _, err := s.serverRepo.FindMember(ctx, serverID, memberUserID); err != nil {
		return err
	}
	return s.serverRepo.RemoveMember(ctx, serverID, memberUserID)
}

func (s *serverService) LeaveServer(ctx context.Context, actorID, serverID string) error {
	actorID = strings.TrimSpace(actorID)
	serverID = strings.TrimSpace(serverID)
	if actorID == "" || serverID == "" {
		return apperr.E("MISSING_FIELDS", nil)
	}

	server, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}
	if server.OwnerID == actorID {
		return apperr.E("CANNOT_LEAVE_OWNED_SERVER", nil)
	}

	if _, err := s.serverRepo.FindMember(ctx, serverID, actorID); err != nil {
		return err
	}
	return s.serverRepo.RemoveMember(ctx, serverID, actorID)
}
