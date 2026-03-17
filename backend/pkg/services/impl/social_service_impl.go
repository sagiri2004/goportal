package impl

import (
	"context"
	"strings"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/repositories"
	"github.com/sagiri2004/goportal/pkg/services"
)

type socialService struct {
	userRepo         repositories.UserRepository
	relationshipRepo repositories.RelationshipRepository
}

func NewSocialService(userRepo repositories.UserRepository, relationshipRepo repositories.RelationshipRepository) services.SocialService {
	return &socialService{
		userRepo:         userRepo,
		relationshipRepo: relationshipRepo,
	}
}

func (s *socialService) ListFriends(ctx context.Context, userID string) ([]models.User, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	return s.relationshipRepo.ListAcceptedFriends(ctx, userID)
}

func (s *socialService) SendFriendRequest(ctx context.Context, requesterID, addresseeID string) (*models.UserRelationship, error) {
	requesterID = strings.TrimSpace(requesterID)
	addresseeID = strings.TrimSpace(addresseeID)
	if requesterID == "" || addresseeID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if requesterID == addresseeID {
		return nil, apperr.E("CANNOT_FRIEND_SELF", nil)
	}

	if _, err := s.userRepo.FindByID(ctx, addresseeID); err != nil {
		return nil, err
	}

	existing, err := s.relationshipRepo.FindAnyByUsers(ctx, requesterID, addresseeID)
	if err == nil && existing != nil {
		switch existing.Status {
		case models.RelationshipStatusBlocked:
			return nil, apperr.E("RELATIONSHIP_BLOCKED", nil)
		case models.RelationshipStatusAccepted:
			return nil, apperr.E("ALREADY_FRIENDS", nil)
		case models.RelationshipStatusPending:
			return nil, apperr.E("FRIEND_REQUEST_EXISTS", nil)
		case models.RelationshipStatusDeclined:
			existing.RequesterID = requesterID
			existing.AddresseeID = addresseeID
			existing.Status = models.RelationshipStatusPending
			if err := s.relationshipRepo.Update(ctx, existing); err != nil {
				return nil, err
			}
			return existing, nil
		}
	}
	if err != nil {
		if ae, ok := apperr.From(err); !ok || ae.Code != "FRIEND_REQUEST_NOT_FOUND" {
			return nil, err
		}
	}

	relationship := &models.UserRelationship{
		RequesterID: requesterID,
		AddresseeID: addresseeID,
		Status:      models.RelationshipStatusPending,
	}
	if err := s.relationshipRepo.Create(ctx, relationship); err != nil {
		return nil, err
	}
	return relationship, nil
}

func (s *socialService) RespondFriendRequest(ctx context.Context, userID, requesterID, action string) (*models.UserRelationship, error) {
	userID = strings.TrimSpace(userID)
	requesterID = strings.TrimSpace(requesterID)
	action = strings.ToUpper(strings.TrimSpace(action))
	if userID == "" || requesterID == "" || action == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}

	var nextStatus string
	switch action {
	case "ACCEPT":
		nextStatus = models.RelationshipStatusAccepted
	case "DECLINE":
		nextStatus = models.RelationshipStatusDeclined
	default:
		return nil, apperr.E("INVALID_ACTION", nil)
	}

	relationship, err := s.relationshipRepo.FindPendingByUsers(ctx, requesterID, userID)
	if err != nil {
		return nil, err
	}
	relationship.Status = nextStatus
	if err := s.relationshipRepo.Update(ctx, relationship); err != nil {
		return nil, err
	}
	return relationship, nil
}

func (s *socialService) BlockUser(ctx context.Context, userID, targetUserID string) (*models.UserRelationship, error) {
	userID = strings.TrimSpace(userID)
	targetUserID = strings.TrimSpace(targetUserID)
	if userID == "" || targetUserID == "" {
		return nil, apperr.E("MISSING_FIELDS", nil)
	}
	if userID == targetUserID {
		return nil, apperr.E("CANNOT_BLOCK_SELF", nil)
	}

	if _, err := s.userRepo.FindByID(ctx, targetUserID); err != nil {
		return nil, err
	}

	relationship, err := s.relationshipRepo.FindAnyByUsers(ctx, userID, targetUserID)
	if err == nil && relationship != nil {
		if relationship.Status == models.RelationshipStatusBlocked && relationship.RequesterID == userID {
			return nil, apperr.E("USER_ALREADY_BLOCKED", nil)
		}
		relationship.RequesterID = userID
		relationship.AddresseeID = targetUserID
		relationship.Status = models.RelationshipStatusBlocked
		if err := s.relationshipRepo.Update(ctx, relationship); err != nil {
			return nil, err
		}
		return relationship, nil
	}
	if err != nil {
		if ae, ok := apperr.From(err); !ok || ae.Code != "FRIEND_REQUEST_NOT_FOUND" {
			return nil, err
		}
	}

	relationship = &models.UserRelationship{
		RequesterID: userID,
		AddresseeID: targetUserID,
		Status:      models.RelationshipStatusBlocked,
	}
	if err := s.relationshipRepo.Create(ctx, relationship); err != nil {
		return nil, err
	}
	return relationship, nil
}
