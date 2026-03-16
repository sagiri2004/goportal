package containers

import (
	"sync"

	"goportal/global"
	"goportal/pkg/repositories"
	repoimpl "goportal/pkg/repositories/impl"
)

var (
	userRepoOnce sync.Once
	userRepo     repositories.UserRepository
)

// UserRepository returns the singleton UserRepository instance.
func UserRepository() repositories.UserRepository {
	userRepoOnce.Do(func() {
		userRepo = repoimpl.NewUserRepository(global.DB)
	})
	return userRepo
}

