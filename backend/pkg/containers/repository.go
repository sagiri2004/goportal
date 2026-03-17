package containers

import (
	"sync"

	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/repositories"
	repoimpl "github.com/sagiri2004/goportal/pkg/repositories/impl"
)

var (
	userRepoOnce         sync.Once
	userRepo             repositories.UserRepository
	relationshipRepoOnce sync.Once
	relationshipRepo     repositories.RelationshipRepository
)

// UserRepository returns the singleton UserRepository instance.
func UserRepository() repositories.UserRepository {
	userRepoOnce.Do(func() {
		userRepo = repoimpl.NewUserRepository(global.DB)
	})
	return userRepo
}

func RelationshipRepository() repositories.RelationshipRepository {
	relationshipRepoOnce.Do(func() {
		relationshipRepo = repoimpl.NewRelationshipRepository(global.DB)
	})
	return relationshipRepo
}
