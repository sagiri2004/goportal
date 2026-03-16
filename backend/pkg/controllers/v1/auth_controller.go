package v1

import (
	"net/http"

	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/serializers"
	"github.com/sagiri2004/goportal/pkg/utils"

	"github.com/gin-gonic/gin"
)

type authController struct{}

var Auth = new(authController)

func (ctrl *authController) Register(c *gin.Context) {
	var req serializers.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}

	u, err := containers.UserService().Register(c.Request.Context(), req.Username, req.Password, false)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusCreated, serializers.Success("OK", "User created", serializers.NewUserResponse(u)))
}

func (ctrl *authController) Login(c *gin.Context) {
	var req serializers.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}

	u, err := containers.UserService().Authenticate(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	token, err := utils.GenerateToken(u.ID, u.Username, "", "user")
	if err != nil {
		ae := apperr.E("TOKEN_FAILED", err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Login successful", gin.H{
		"user":  serializers.NewUserResponse(u),
		"token": token,
	}))
}
