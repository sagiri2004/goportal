package containers

import (
	"sync"

	pkgglobal "github.com/sagiri2004/goportal/pkg/global"
	"github.com/sagiri2004/goportal/pkg/services"
	svcimpl "github.com/sagiri2004/goportal/pkg/services/impl"
)

var (
	userSvcOnce         sync.Once
	userSvc             services.UserService
	socialSvcOnce       sync.Once
	socialSvc           services.SocialService
	serverSvcOnce       sync.Once
	serverSvc           services.ServerService
	channelSvcOnce      sync.Once
	channelSvc          services.ChannelService
	messageSvcOnce      sync.Once
	messageSvc          services.MessageService
	notificationSvcOnce sync.Once
	notificationSvc     services.NotificationService
	storageSvcOnce      sync.Once
	storageSvc          services.StorageService
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

func ServerService() services.ServerService {
	serverSvcOnce.Do(func() {
		serverSvc = svcimpl.NewServerService(UserRepository(), ServerRepository())
	})
	return serverSvc
}

func ChannelService() services.ChannelService {
	channelSvcOnce.Do(func() {
		channelSvc = svcimpl.NewChannelService(ServerRepository(), ChannelRepository())
	})
	return channelSvc
}

func MessageService() services.MessageService {
	messageSvcOnce.Do(func() {
		messageSvc = svcimpl.NewMessageService(
			MessageRepository(),
			ServerRepository(),
			ChannelRepository(),
			pkgglobal.Publisher,
		)
	})
	return messageSvc
}

func NotificationService() services.NotificationService {
	notificationSvcOnce.Do(func() {
		notificationSvc = svcimpl.NewNotificationService(NotificationRepository(), pkgglobal.Publisher)
	})
	return notificationSvc
}

func StorageService() services.StorageService {
	storageSvcOnce.Do(func() {
		provider := svcimpl.NewLocalStorageProvider("uploads", "/uploads")
		storageSvc = svcimpl.NewStorageService(provider)
	})
	return storageSvc
}
