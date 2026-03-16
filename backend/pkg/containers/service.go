package containers

import (
	"sync"

	"goportal/pkg/services"
	svcimpl "goportal/pkg/services/impl"
)

var (
	userSvcOnce sync.Once
	userSvc     services.UserService
)

// UserService returns the singleton UserService instance.
func UserService() services.UserService {
	userSvcOnce.Do(func() {
		userSvc = svcimpl.NewUserService(UserRepository())
	})
	return userSvc
}

