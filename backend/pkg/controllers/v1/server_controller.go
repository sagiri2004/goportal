package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/serializers"
	"github.com/sagiri2004/goportal/pkg/services"
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

	server, err := containers.ServerService().CreateServer(c.Request.Context(), userID, req.Name, req.IsPublic)
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
	members, err := containers.ServerService().ListMembersWithRoles(c.Request.Context(), userID, serverID)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}

	resp := make([]serializers.MemberWithRolesResponse, 0, len(members))
	for i := range members {
		member := members[i]
		roleResp := make([]serializers.RoleResponse, 0, len(member.Roles))
		for _, role := range member.Roles {
			roleResp = append(roleResp, serializers.NewRoleResponse(&role))
		}
		resp = append(resp, serializers.MemberWithRolesResponse{
			User:  serializers.NewUserResponse(&member.User),
			Roles: roleResp,
		})
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

func (ctrl *serverController) CreateRole(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	serverID := c.Param("id")

	var req serializers.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	role, err := containers.ServerService().CreateRole(c.Request.Context(), userID, serverID, req.Name, req.Permissions, req.Position)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Role created", serializers.NewRoleResponse(role)))
}

func (ctrl *serverController) UpdateRole(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	roleID := c.Param("id")
	var req serializers.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	role, err := containers.ServerService().UpdateRole(c.Request.Context(), userID, roleID, req.Name, req.Permissions, req.Position)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Role updated", serializers.NewRoleResponse(role)))
}

func (ctrl *serverController) CreateInvite(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	serverID := c.Param("id")
	var req serializers.CreateInviteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	invite, err := containers.ServerService().CreateInvite(c.Request.Context(), userID, serverID, services.CreateInviteInput{
		MaxUses:   req.MaxUses,
		ExpiresAt: req.ExpiresAt,
	})
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Invite created", serializers.NewInviteResponse(invite)))
}

func (ctrl *serverController) GetInvite(c *gin.Context) {
	code := c.Param("code")
	invite, server, err := containers.ServerService().GetInvite(c.Request.Context(), code)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Invite fetched", gin.H{
		"invite": serializers.NewInviteResponse(invite),
		"server": serializers.NewServerResponse(server),
	}))
}

func (ctrl *serverController) JoinByInvite(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	code := c.Param("code")
	server, err := containers.ServerService().JoinByInvite(c.Request.Context(), userID, code)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Joined server", serializers.NewServerResponse(server)))
}

func (ctrl *serverController) JoinPublic(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	serverID := c.Param("id")
	if err := containers.ServerService().JoinPublicServer(c.Request.Context(), userID, serverID); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Joined server", nil))
}

func (ctrl *serverController) UpdateMemberRoles(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	serverID := c.Param("id")
	targetUserID := c.Param("userId")
	var req serializers.MemberRoleAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	if err := containers.ServerService().UpdateMemberRoles(c.Request.Context(), userID, serverID, targetUserID, req.RoleIDs); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Member roles updated", nil))
}

func (ctrl *serverController) AddMember(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	serverID := c.Param("id")
	var req serializers.AddServerMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	if err := containers.ServerService().AddMember(c.Request.Context(), userID, serverID, req.UserID); err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Member added", nil))
}

func (ctrl *serverController) CreateJoinRequest(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	serverID := c.Param("id")
	var req serializers.CreateJoinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	joinReq, err := containers.ServerService().CreateJoinRequest(c.Request.Context(), userID, serverID, services.CreateJoinRequestInput{
		Note: req.Note,
	})
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Join request created", serializers.NewJoinRequestResponse(joinReq)))
}

func (ctrl *serverController) ListJoinRequests(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	serverID := c.Param("id")
	status := c.Query("status")
	rows, err := containers.ServerService().ListJoinRequests(c.Request.Context(), userID, serverID, status)
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	resp := make([]serializers.JoinRequestResponse, 0, len(rows))
	for i := range rows {
		resp = append(resp, serializers.NewJoinRequestResponse(&rows[i]))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Join requests fetched", resp))
}

func (ctrl *serverController) ReviewJoinRequest(c *gin.Context) {
	userID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	serverID := c.Param("id")
	requestID := c.Param("requestId")
	var req serializers.ReviewJoinRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	row, err := containers.ServerService().ReviewJoinRequest(c.Request.Context(), userID, serverID, services.ReviewJoinRequestInput{
		RequestID: requestID,
		Approve:   req.Approve,
		Note:      req.Note,
	})
	if err != nil {
		if ae, ok := apperr.From(err); ok {
			c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
			return
		}
		c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
		return
	}
	msg := "Join request rejected"
	if row.Status == models.ServerMemberStatusActive {
		msg = "Join request approved"
	}
	c.JSON(http.StatusOK, serializers.Success("OK", msg, serializers.NewJoinRequestResponse(row)))
}
