package global

import (
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	setting "github.com/sagiri2004/goportal/pkg/settings"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

var (
	DB          *gorm.DB
	Logger      *zap.Logger
	RedisClient *redis.Client
	Router      *gin.Engine
	Publisher   message.Publisher
	Subscriber  message.Subscriber
	WMRouter    *message.Router
	ConfigPath  string
	Config      setting.Config
)
