package global

import (
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/gorm"
	setting "goportal/pkg/settings"
)

var (
	DB          *gorm.DB
	Logger      *zap.Logger
	RedisClient *redis.Client
	Router      *gin.Engine
	ConfigPath  string
	Config      setting.Config
)
