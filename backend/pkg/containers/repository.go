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
	serverRepoOnce       sync.Once
	serverRepo           repositories.ServerRepository
	channelRepoOnce      sync.Once
	channelRepo          repositories.ChannelRepository
	messageRepoOnce      sync.Once
	messageRepo          repositories.MessageRepository
	notificationRepoOnce sync.Once
	notificationRepo     repositories.NotificationRepository
	recordingRepoOnce    sync.Once
	recordingRepo        repositories.RecordingRepository
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

func ServerRepository() repositories.ServerRepository {
	serverRepoOnce.Do(func() {
		serverRepo = repoimpl.NewServerRepository(global.DB)
	})
	return serverRepo
}

func ChannelRepository() repositories.ChannelRepository {
	channelRepoOnce.Do(func() {
		channelRepo = repoimpl.NewChannelRepository(global.DB)
	})
	return channelRepo
}

func MessageRepository() repositories.MessageRepository {
	messageRepoOnce.Do(func() {
		messageRepo = repoimpl.NewMessageRepository(global.DB)
	})
	return messageRepo
}

func NotificationRepository() repositories.NotificationRepository {
	notificationRepoOnce.Do(func() {
		notificationRepo = repoimpl.NewNotificationRepository(global.DB)
	})
	return notificationRepo
}

func RecordingRepository() repositories.RecordingRepository {
	recordingRepoOnce.Do(func() {
		recordingRepo = repoimpl.NewRecordingRepository(global.DB)
	})
	return recordingRepo
}
