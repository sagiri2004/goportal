package v1

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sagiri2004/goportal/pkg/apperr"
	"github.com/sagiri2004/goportal/pkg/containers"
	"github.com/sagiri2004/goportal/pkg/serializers"
	"github.com/sagiri2004/goportal/pkg/services"
)

type tournamentController struct{}

var Tournament = new(tournamentController)

func (ctrl *tournamentController) Create(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	serverID := c.Param("serverId")
	if serverID == "" {
		serverID = c.Param("id")
	}
	var req serializers.CreateTournamentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	t, err := containers.TournamentService().CreateTournament(c.Request.Context(), actorID, services.TournamentCreateInput{
		ServerID:               serverID,
		Name:                   req.Name,
		Description:            req.Description,
		Game:                   req.Game,
		Format:                 req.Format,
		MaxParticipants:        req.MaxParticipants,
		ParticipantType:        req.ParticipantType,
		TeamSize:               req.TeamSize,
		RegistrationDeadline:   req.RegistrationDeadline,
		CheckInDurationMinutes: req.CheckInDurationMinutes,
		PrizePool:              req.PrizePool,
		Rules:                  req.Rules,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Tournament created", serializers.NewTournamentResponse(t)))
}

func (ctrl *tournamentController) ListByServer(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	serverID := c.Param("serverId")
	if serverID == "" {
		serverID = c.Param("id")
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	result, err := containers.TournamentService().ListTournaments(c.Request.Context(), actorID, services.TournamentListInput{
		ServerID: serverID,
		Status:   c.Query("status"),
		Page:     page,
		Limit:    limit,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	items := make([]serializers.TournamentResponse, 0, len(result.Items))
	for i := range result.Items {
		items = append(items, serializers.NewTournamentResponse(&result.Items[i]))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Tournaments fetched", serializers.TournamentListResponse{
		Items: items,
		Total: result.Total,
		Page:  result.Page,
		Limit: result.Limit,
	}))
}

func (ctrl *tournamentController) GetByID(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	t, count, participants, err := containers.TournamentService().GetTournamentDetail(c.Request.Context(), actorID, c.Param("id"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	rows := make([]serializers.TournamentParticipantResponse, 0, len(participants))
	for _, p := range participants {
		rows = append(rows, serializers.NewTournamentParticipantResponse(p))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Tournament fetched", serializers.TournamentDetailResponse{
		Tournament:       serializers.NewTournamentResponse(t),
		ParticipantCount: count,
		Participants:     rows,
	}))
}

func (ctrl *tournamentController) Update(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	var req serializers.UpdateTournamentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	t, err := containers.TournamentService().UpdateTournament(c.Request.Context(), actorID, c.Param("id"), services.TournamentUpdateInput{
		Name:                 req.Name,
		Description:          req.Description,
		Rules:                req.Rules,
		PrizePool:            req.PrizePool,
		MaxParticipants:      req.MaxParticipants,
		RegistrationDeadline: req.RegistrationDeadline,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Tournament updated", serializers.NewTournamentResponse(t)))
}

func (ctrl *tournamentController) Delete(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	if err := containers.TournamentService().DeleteTournament(c.Request.Context(), actorID, c.Param("id")); err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Tournament deleted", nil))
}

func (ctrl *tournamentController) UpdateStatus(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	var req serializers.UpdateTournamentStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	t, err := containers.TournamentService().UpdateTournamentStatus(c.Request.Context(), actorID, c.Param("id"), req.Status)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Tournament status updated", serializers.NewTournamentResponse(t)))
}

func (ctrl *tournamentController) RegisterParticipant(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	p, err := containers.TournamentService().RegisterParticipant(c.Request.Context(), actorID, c.Param("id"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Participant registered", serializers.NewTournamentParticipantResponse(*p)))
}

func (ctrl *tournamentController) CancelMyRegistration(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	if err := containers.TournamentService().CancelMyRegistration(c.Request.Context(), actorID, c.Param("id")); err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Registration cancelled", nil))
}

func (ctrl *tournamentController) CheckInParticipant(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	p, err := containers.TournamentService().CheckInParticipant(c.Request.Context(), actorID, c.Param("id"), c.Param("participantId"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Participant checked in", serializers.NewTournamentParticipantResponse(*p)))
}

func (ctrl *tournamentController) RemoveParticipant(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	if err := containers.TournamentService().RemoveParticipant(c.Request.Context(), actorID, c.Param("id"), c.Param("participantId")); err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Participant removed", nil))
}

func (ctrl *tournamentController) UpdateParticipantSeed(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	var req serializers.TournamentSeedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	p, err := containers.TournamentService().UpdateParticipantSeed(c.Request.Context(), actorID, c.Param("id"), c.Param("participantId"), req.Seed)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Participant seed updated", serializers.NewTournamentParticipantResponse(*p)))
}

func (ctrl *tournamentController) BulkParticipants(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	var req serializers.BulkTournamentParticipantsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	items, err := containers.TournamentService().BulkAddParticipants(c.Request.Context(), actorID, c.Param("id"), services.TournamentParticipantBulkInput{UserIDs: req.UserIDs})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.TournamentParticipantResponse, 0, len(items))
	for _, item := range items {
		resp = append(resp, serializers.NewTournamentParticipantResponse(item))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Participants added", resp))
}

func (ctrl *tournamentController) CreateTeam(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	var req serializers.CreateTournamentTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	team, err := containers.TournamentService().CreateTeam(c.Request.Context(), actorID, c.Param("id"), services.TournamentTeamCreateInput{Name: req.Name})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Team created", team))
}

func (ctrl *tournamentController) ListTeams(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	rows, err := containers.TournamentService().ListTeams(c.Request.Context(), actorID, c.Param("id"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.TournamentTeamResponse, 0, len(rows))
	for _, row := range rows {
		members := make([]serializers.UserResponse, 0, len(row.Members))
		for i := range row.Members {
			members = append(members, serializers.NewUserResponse(&row.Members[i]))
		}
		resp = append(resp, serializers.TournamentTeamResponse{
			ID:        row.Team.ID,
			Name:      row.Team.Name,
			CaptainID: row.Team.CaptainID,
			CreatedAt: row.Team.CreatedAt,
			Members:   members,
		})
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Teams fetched", resp))
}

func (ctrl *tournamentController) AddTeamMember(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	var req serializers.AddTournamentTeamMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	if err := containers.TournamentService().AddTeamMember(c.Request.Context(), actorID, c.Param("id"), c.Param("teamId"), services.TournamentAddTeamMemberInput{UserID: req.UserID}); err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Team member added", nil))
}

func (ctrl *tournamentController) RemoveTeamMember(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	if err := containers.TournamentService().RemoveTeamMember(c.Request.Context(), actorID, c.Param("id"), c.Param("teamId"), c.Param("userId")); err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Team member removed", nil))
}

func (ctrl *tournamentController) DeleteTeam(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	if err := containers.TournamentService().DeleteTeam(c.Request.Context(), actorID, c.Param("id"), c.Param("teamId")); err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Team deleted", nil))
}

func (ctrl *tournamentController) GetBracket(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	rows, err := containers.TournamentService().GetBracket(c.Request.Context(), actorID, c.Param("id"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.TournamentMatchResponse, 0, len(rows))
	for _, row := range rows {
		resp = append(resp, serializers.NewTournamentMatchResponse(row))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Bracket fetched", resp))
}

func (ctrl *tournamentController) ListMatches(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	var round *int
	if raw := strings.TrimSpace(c.Query("round")); raw != "" {
		value, convErr := strconv.Atoi(raw)
		if convErr == nil {
			round = &value
		}
	}
	rows, err := containers.TournamentService().ListMatches(c.Request.Context(), actorID, services.TournamentMatchListInput{
		TournamentID:  c.Param("id"),
		Round:         round,
		Status:        c.Query("status"),
		ParticipantID: c.Query("participant_id"),
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.TournamentMatchResponse, 0, len(rows))
	for _, row := range rows {
		resp = append(resp, serializers.NewTournamentMatchResponse(row))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Matches fetched", resp))
}

func (ctrl *tournamentController) GetMatch(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	row, err := containers.TournamentService().GetMatch(c.Request.Context(), actorID, c.Param("id"), c.Param("matchId"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Match fetched", serializers.NewTournamentMatchResponse(*row)))
}

func (ctrl *tournamentController) UpdateMatchStatus(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	var req serializers.UpdateTournamentMatchStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	row, err := containers.TournamentService().UpdateMatchStatus(c.Request.Context(), actorID, c.Param("id"), c.Param("matchId"), req.Status)
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Match status updated", serializers.NewTournamentMatchResponse(*row)))
}

func (ctrl *tournamentController) ReportMatchResult(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	var req serializers.ReportTournamentMatchResultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	row, err := containers.TournamentService().ReportMatchResult(c.Request.Context(), actorID, c.Param("id"), c.Param("matchId"), services.TournamentMatchResultInput{
		WinnerID:      req.WinnerID,
		Score1:        req.Score1,
		Score2:        req.Score2,
		ScreenshotURL: req.ScreenshotURL,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, serializers.Success("OK", "Match result reported", serializers.NewTournamentMatchReportResponse(row)))
}

func (ctrl *tournamentController) DisputeMatch(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	row, err := containers.TournamentService().DisputeMatchResult(c.Request.Context(), actorID, c.Param("id"), c.Param("matchId"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Match disputed", serializers.NewTournamentMatchReportResponse(row)))
}

func (ctrl *tournamentController) OverrideMatch(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	var req serializers.OverrideTournamentMatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, serializers.Error("INVALID_JSON", "Invalid JSON payload"))
		return
	}
	row, err := containers.TournamentService().OverrideMatchResult(c.Request.Context(), actorID, c.Param("id"), c.Param("matchId"), services.TournamentMatchOverrideInput{
		WinnerID: req.WinnerID,
		Score1:   req.Score1,
		Score2:   req.Score2,
		Reason:   req.Reason,
	})
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Match overridden", serializers.NewTournamentMatchResponse(*row)))
}

func (ctrl *tournamentController) Standings(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	rows, err := containers.TournamentService().GetStandings(c.Request.Context(), actorID, c.Param("id"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.TournamentParticipantResponse, 0, len(rows))
	for _, row := range rows {
		resp = append(resp, serializers.NewTournamentParticipantResponse(row))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Standings fetched", resp))
}

func (ctrl *tournamentController) ParticipantMatches(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	rows, err := containers.TournamentService().GetParticipantMatches(c.Request.Context(), actorID, c.Param("id"), c.Param("participantId"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.TournamentMatchResponse, 0, len(rows))
	for _, row := range rows {
		resp = append(resp, serializers.NewTournamentMatchResponse(row))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "Participant matches fetched", resp))
}

func (ctrl *tournamentController) UserHistory(c *gin.Context) {
	actorID, err := getCurrentUserID(c)
	if err != nil {
		ae, _ := apperr.From(err)
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	rows, err := containers.TournamentService().GetUserTournamentHistory(c.Request.Context(), actorID, c.Param("id"))
	if err != nil {
		ctrl.respondError(c, err)
		return
	}
	resp := make([]serializers.TournamentResponse, 0, len(rows))
	for i := range rows {
		resp = append(resp, serializers.NewTournamentResponse(&rows[i]))
	}
	c.JSON(http.StatusOK, serializers.Success("OK", "User tournament history fetched", resp))
}

func (ctrl *tournamentController) respondError(c *gin.Context, err error) {
	if ae, ok := apperr.From(err); ok {
		c.JSON(ae.HTTPCode, serializers.Error(ae.Code, ae.Message))
		return
	}
	c.JSON(http.StatusInternalServerError, serializers.Error("INTERNAL_ERROR", "Internal server error"))
}
