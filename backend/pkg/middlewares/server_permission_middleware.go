package middlewares

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/serializers"
)

func RequireServerPermission(permission int64, serverParam string) gin.HandlerFunc {
	if serverParam == "" {
		serverParam = "id"
	}
	return func(c *gin.Context) {
		userIDAny, exists := c.Get("user_id")
		userID, ok := userIDAny.(string)
		if !exists || !ok || userID == "" {
			ae := apperr.E("UNAUTHORIZED", nil)
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			c.Abort()
			return
		}
		serverID := strings.TrimSpace(c.Param(serverParam))
		if serverID == "" {
			c.JSON(http.StatusBadRequest, serializers.Error("MISSING_FIELDS", "Missing required fields"))
			c.Abort()
			return
		}
		hasPerm, err := containers.ServerRepository().HasPermission(c.Request.Context(), serverID, userID, permission)
		if err != nil {
			if ae, ok := apperr.From(err); ok {
				c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			} else {
				c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
			}
			c.Abort()
			return
		}
		if !hasPerm {
			ae := apperr.E("INSUFFICIENT_PERMISSION", nil)
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			c.Abort()
			return
		}
		c.Next()
	}
}

func RequireChannelPermission(permission int64, channelParam string) gin.HandlerFunc {
	if channelParam == "" {
		channelParam = "id"
	}
	return func(c *gin.Context) {
		userIDAny, exists := c.Get("user_id")
		userID, ok := userIDAny.(string)
		if !exists || !ok || userID == "" {
			ae := apperr.E("UNAUTHORIZED", nil)
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			c.Abort()
			return
		}
		channelID := strings.TrimSpace(c.Param(channelParam))
		channel, err := containers.ChannelRepository().FindByID(c.Request.Context(), channelID)
		if err != nil {
			if ae, ok := apperr.From(err); ok {
				c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			} else {
				c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
			}
			c.Abort()
			return
		}
		hasPerm, err := hasChannelPermission(c.Request.Context(), userID, channel, permission)
		if err != nil {
			if ae, ok := apperr.From(err); ok {
				c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			} else {
				c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
			}
			c.Abort()
			return
		}
		if !hasPerm {
			ae := apperr.E("INSUFFICIENT_PERMISSION", nil)
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			c.Abort()
			return
		}
		c.Next()
	}
}

func RequireChannelPermissionFromBody(permission int64, channelField string) gin.HandlerFunc {
	if channelField == "" {
		channelField = "channel_id"
	}
	return func(c *gin.Context) {
		userIDAny, exists := c.Get("user_id")
		userID, ok := userIDAny.(string)
		if !exists || !ok || userID == "" {
			ae := apperr.E("UNAUTHORIZED", nil)
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			c.Abort()
			return
		}

		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
			c.Abort()
			return
		}
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

		var payload map[string]any
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
			c.Next()
			return
		}
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

		rawChannelID, ok := payload[channelField]
		if !ok {
			c.JSON(http.StatusBadRequest, serializers.Error("MISSING_FIELDS", "Missing required fields"))
			c.Abort()
			return
		}
		channelID, _ := rawChannelID.(string)
		channelID = strings.TrimSpace(channelID)
		if channelID == "" {
			c.JSON(http.StatusBadRequest, serializers.Error("MISSING_FIELDS", "Missing required fields"))
			c.Abort()
			return
		}

		channel, err := containers.ChannelRepository().FindByID(c.Request.Context(), channelID)
		if err != nil {
			if ae, ok := apperr.From(err); ok {
				c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			} else {
				c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
			}
			c.Abort()
			return
		}
		hasPerm, err := hasChannelPermission(c.Request.Context(), userID, channel, permission)
		if err != nil {
			if ae, ok := apperr.From(err); ok {
				c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			} else {
				c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
			}
			c.Abort()
			return
		}
		if !hasPerm {
			ae := apperr.E("INSUFFICIENT_PERMISSION", nil)
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			c.Abort()
			return
		}
		c.Next()
	}
}

func hasChannelPermission(ctx context.Context, userID string, channel *models.Channel, required int64) (bool, error) {
	if _, err := containers.ServerRepository().FindMember(ctx, channel.ServerID, userID); err != nil {
		return false, apperr.E("NOT_SERVER_MEMBER", err)
	}
	basePerms, err := containers.ServerRepository().GetMemberPermissions(ctx, channel.ServerID, userID)
	if err != nil {
		return false, err
	}
	if (basePerms & models.PermissionAdministrator) == models.PermissionAdministrator {
		return true, nil
	}

	// Private channel membership gate
	if channel.IsPrivate {
		isMember, err := containers.ChannelRepository().IsMember(ctx, channel.ID, userID)
		if err != nil {
			return false, err
		}
		if !isMember {
			return false, nil
		}
	}

	effectivePerms, err := resolveChannelPermissions(ctx, channel, userID, basePerms)
	if err != nil {
		return false, err
	}
	if (effectivePerms & models.PermissionViewChannel) != models.PermissionViewChannel {
		return false, nil
	}
	return (effectivePerms & required) == required, nil
}

func resolveChannelPermissions(ctx context.Context, channel *models.Channel, userID string, basePerms int64) (int64, error) {
	perms := basePerms
	overwrites, err := containers.ChannelRepository().ListOverwrites(ctx, channel.ID)
	if err != nil {
		return 0, err
	}

	roles, err := containers.ServerRepository().ListMemberRoles(ctx, channel.ServerID, userID)
	if err != nil {
		return 0, err
	}
	roleIDSet := make(map[string]struct{}, len(roles))
	var everyoneRoleID string
	for _, role := range roles {
		roleIDSet[role.ID] = struct{}{}
		if role.Name == "@everyone" {
			everyoneRoleID = role.ID
		}
	}

	// 1) everyone overwrite
	for _, ow := range overwrites {
		if ow.SubjectType == models.ChannelOverwriteSubjectRole && ow.SubjectID == everyoneRoleID {
			perms = applyOverwrite(perms, ow.AllowBits, ow.DenyBits)
			break
		}
	}

	// 2) role overwrites (merge deny and allow)
	var roleDeny int64
	var roleAllow int64
	for _, ow := range overwrites {
		if ow.SubjectType != models.ChannelOverwriteSubjectRole {
			continue
		}
		if _, ok := roleIDSet[ow.SubjectID]; !ok {
			continue
		}
		roleDeny |= ow.DenyBits
		roleAllow |= ow.AllowBits
	}
	perms = applyOverwrite(perms, roleAllow, roleDeny)

	// 3) user overwrite
	for _, ow := range overwrites {
		if ow.SubjectType == models.ChannelOverwriteSubjectUser && ow.SubjectID == userID {
			perms = applyOverwrite(perms, ow.AllowBits, ow.DenyBits)
			break
		}
	}
	return perms, nil
}

func applyOverwrite(perms, allow, deny int64) int64 {
	perms &= ^deny
	perms |= allow
	return perms
}
