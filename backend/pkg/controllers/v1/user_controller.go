package v1

import (
	"net/http"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/serializers"

	"github.com/gin-gonic/gin"
)

type userController struct{}

var User = new(userController)

func getCurrentUserID(c *gin.Context) (string, error) {
	userIDAny, _ := c.Get("user_id")
	userID, ok := userIDAny.(string)
	if !ok || userID == "" {
		return "", apperr.E("UNAUTHORIZED", nil)
	}
	return userID, nil
}

func (ctrl *userController) Me(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	u, err := containers.UserService().GetByID(c.Request.Context(), userID)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Current user", serializers.NewUserResponse(u)))
}

func (ctrl *userController) UpdateMe(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	var req serializers.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}

	u, err := containers.UserService().UpdateProfile(c.Request.Context(), userID, req.Username)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Profile updated", serializers.NewUserResponse(u)))
}
