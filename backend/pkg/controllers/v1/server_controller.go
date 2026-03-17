package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/serializers"
)

type serverController struct{}

var Server = new(serverController)

func (ctrl *serverController) Create(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	var req serializers.CreateServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}

	server, err := containers.ServerService().CreateServer(c.Request.Context(), userID, req.Name)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusCreated, serializers.Success("OK", "Server created", serializers.NewServerResponse(server)))
}

func (ctrl *serverController) ListMembers(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	serverID := c.Param("id")
	members, err := containers.ServerService().ListMembers(c.Request.Context(), userID, serverID)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	resp := make([]serializers.UserResponse, 0, len(members))
	for i := range members {
		member := members[i]
		resp = append(resp, serializers.NewUserResponse(&member))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Server members fetched", resp))
}

func (ctrl *serverController) Delete(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	serverID := c.Param("id")
	if err := containers.ServerService().DeleteServer(c.Request.Context(), userID, serverID); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Server deleted", nil))
}

func (ctrl *serverController) KickMember(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}

	serverID := c.Param("id")
	memberUserID := c.Param("userId")
	if err := containers.ServerService().KickMember(c.Request.Context(), userID, serverID, memberUserID); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	c.JSON(http.StatusOK, serializers.Success("OK", "Member kicked", nil))
}
