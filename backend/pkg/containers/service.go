package containers

import (
	"sync"

	"github.com/sagiri2004/goportal/pkg/services"
	svcimpl "github.com/sagiri2004/goportal/pkg/services/impl"
)

var (
	userSvcOnce   sync.Once
	userSvc       services.UserService
	socialSvcOnce sync.Once
	socialSvc     services.SocialService
)

// UserService returns the singleton UserService instance.
func UserService() services.UserService {
	userSvcOnce.Do(func() {
		userSvc = svcimpl.NewUserService(UserRepository())
	})
	return userSvc
}

func SocialService() services.SocialService {
	socialSvcOnce.Do(func() {
		socialSvc = svcimpl.NewSocialService(UserRepository(), RelationshipRepository())
	})
	return socialSvc
}
