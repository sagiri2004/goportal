package seeders

import (
	"github.com/sagiri2004/goportal/pkg/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// SeedPermissions ensures baseline RBAC permissions exist.
func SeedPermissions(db *gorm.DB, logger *zap.Logger) {
	defaultPerms := []models.Permission{
		{Name: "CREATE_INVITE", Value: models.PermissionCreateInvite},
		{Name: "SEND_MESSAGES", Value: models.PermissionSendMessages},
		{Name: "READ_MESSAGES", Value: models.PermissionReadMessages},
		{Name: "ADMINISTRATOR", Value: models.PermissionAdministrator},
	}

	for _, perm := range defaultPerms {
		p := perm
		if err := db.Where("value = ?", p.Value).Assign(models.Permission{Name: p.Name}).FirstOrCreate(&p).Error; err != nil {
			if logger != nil {
				logger.Error("failed to seed permission", zap.String("name", p.Name), zap.Int64("value", p.Value), zap.Error(err))
			}
		}
	}
}
