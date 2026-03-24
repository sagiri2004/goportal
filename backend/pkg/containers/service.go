package containers

import (
	"sync"

	"github.com/sagiri2004/goportal/global"
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
	livekitSvcOnce      sync.Once
	livekitSvc          services.LiveKitService
	egressSvcOnce       sync.Once
	egressSvc           services.EgressService
	voiceSvcOnce        sync.Once
	voiceSvc            services.VoiceService
	tournamentSvcOnce   sync.Once
	tournamentSvc       services.TournamentService
)

// UserService returns the singleton UserService instance.
func UserService() services.UserService {
	userSvcOnce.Do(func() {
		userSvc = svcimpl.NewUserService(UserRepository(), StorageService())
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
		serverSvc = svcimpl.NewServerService(UserRepository(), ServerRepository(), MessageRepository(), StorageService())
	})
	return serverSvc
}

func ChannelService() services.ChannelService {
	channelSvcOnce.Do(func() {
		channelSvc = svcimpl.NewChannelService(ServerRepository(), ChannelRepository(), MessageRepository())
	})
	return channelSvc
}

func MessageService() services.MessageService {
	messageSvcOnce.Do(func() {
		messageSvc = svcimpl.NewMessageService(
			MessageRepository(),
			ServerRepository(),
			ChannelRepository(),
			UserRepository(),
			StorageService(),
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
		cfg := global.Config.Cloudinary
		provider, err := svcimpl.NewCloudinaryStorageProvider(cfg.CloudName, cfg.APIKey, cfg.APISecret, cfg.Folder)
		if err != nil || cfg.CloudName == "" || cfg.APIKey == "" || cfg.APISecret == "" {
			provider = svcimpl.NewLocalStorageProvider("uploads", "/uploads")
		}
		storageSvc = svcimpl.NewStorageService(provider)
	})
	return storageSvc
}

func LiveKitService() services.LiveKitService {
	livekitSvcOnce.Do(func() {
		livekitSvc = svcimpl.NewLiveKitService()
	})
	return livekitSvc
}

func EgressService() services.EgressService {
	egressSvcOnce.Do(func() {
		egressSvc = svcimpl.NewEgressService()
	})
	return egressSvc
}

func VoiceService() services.VoiceService {
	voiceSvcOnce.Do(func() {
		voiceSvc = svcimpl.NewVoiceService(
			ServerRepository(),
			ChannelRepository(),
			UserRepository(),
			RecordingRepository(),
			NotificationService(),
			LiveKitService(),
			EgressService(),
		)
	})
	return voiceSvc
}

func TournamentService() services.TournamentService {
	tournamentSvcOnce.Do(func() {
		tournamentSvc = svcimpl.NewTournamentService(
			TournamentRepository(),
			ServerRepository(),
			UserRepository(),
			pkgglobal.Publisher,
		)
	})
	return tournamentSvc
}
