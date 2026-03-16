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

func (ctrl *userController) Me(c *gin.Context) {
	userIDAny, _ := c.Get("user_id")
	userID, ok := userIDAny.(uint)
	if !ok || userID == 0 {
		c.JSON(http.StatusUnauthorized, serializers.Error("UNAUTHORIZED", "unauthorized"))
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
