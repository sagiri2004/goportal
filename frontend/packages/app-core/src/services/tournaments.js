import { apiClient } from '../lib/api-client';
const toQuery = (params) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '')
            return;
        search.set(key, String(value));
    });
    const raw = search.toString();
    return raw ? `?${raw}` : '';
};
export const listTournamentsByServer = async (serverId, params = {}) => {
    const query = toQuery({
        status: params.status,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
    });
    return apiClient.get(`/api/v1/servers/${serverId}/tournaments${query}`);
};
export const createTournament = async (serverId, input) => {
    return apiClient.post(`/api/v1/servers/${serverId}/tournaments`, input);
};
export const getTournamentDetail = async (tournamentId) => {
    return apiClient.get(`/api/v1/tournaments/${tournamentId}`);
};
export const updateTournament = async (tournamentId, input) => {
    return apiClient.patch(`/api/v1/tournaments/${tournamentId}`, input);
};
export const deleteTournament = async (tournamentId) => {
    await apiClient.delete(`/api/v1/tournaments/${tournamentId}`);
};
export const updateTournamentStatus = async (tournamentId, status) => {
    return apiClient.patch(`/api/v1/tournaments/${tournamentId}/status`, { status });
};
export const registerTournamentParticipant = async (tournamentId) => {
    return apiClient.post(`/api/v1/tournaments/${tournamentId}/participants`, {});
};
export const cancelTournamentRegistration = async (tournamentId) => {
    await apiClient.delete(`/api/v1/tournaments/${tournamentId}/participants/me`);
};
export const checkInTournamentParticipant = async (tournamentId, participantId) => {
    return apiClient.post(`/api/v1/tournaments/${tournamentId}/participants/${participantId}/checkin`, {});
};
export const removeTournamentParticipant = async (tournamentId, participantId) => {
    await apiClient.delete(`/api/v1/tournaments/${tournamentId}/participants/${participantId}`);
};
export const updateTournamentParticipantSeed = async (tournamentId, participantId, seed) => {
    return apiClient.patch(`/api/v1/tournaments/${tournamentId}/participants/${participantId}/seed`, { seed });
};
export const bulkAddTournamentParticipants = async (tournamentId, userIds) => {
    return apiClient.post(`/api/v1/tournaments/${tournamentId}/participants/bulk`, { user_ids: userIds });
};
export const getTournamentBracket = async (tournamentId) => {
    return apiClient.get(`/api/v1/tournaments/${tournamentId}/bracket`);
};
export const listTournamentMatches = async (tournamentId, params = {}) => {
    const query = toQuery({
        status: params.status,
        round: params.round,
        bracket_side: params.bracket_side,
    });
    return apiClient.get(`/api/v1/tournaments/${tournamentId}/matches${query}`);
};
export const getTournamentMatch = async (tournamentId, matchId) => {
    return apiClient.get(`/api/v1/tournaments/${tournamentId}/matches/${matchId}`);
};
export const reportTournamentMatchResult = async (tournamentId, matchId, input) => {
    return apiClient.post(`/api/v1/tournaments/${tournamentId}/matches/${matchId}/result`, input);
};
export const disputeTournamentMatchResult = async (tournamentId, matchId) => {
    return apiClient.post(`/api/v1/tournaments/${tournamentId}/matches/${matchId}/dispute`, {});
};
export const overrideTournamentMatchResult = async (tournamentId, matchId, input) => {
    return apiClient.patch(`/api/v1/tournaments/${tournamentId}/matches/${matchId}/override`, input);
};
export const getTournamentStandings = async (tournamentId) => {
    return apiClient.get(`/api/v1/tournaments/${tournamentId}/standings`);
};
export const listTournamentTeams = async (tournamentId) => {
    return apiClient.get(`/api/v1/tournaments/${tournamentId}/teams`);
};
export const createTournamentTeam = async (tournamentId, input) => {
    return apiClient.post(`/api/v1/tournaments/${tournamentId}/teams`, input);
};
export const addTournamentTeamMember = async (tournamentId, teamId, input) => {
    await apiClient.post(`/api/v1/tournaments/${tournamentId}/teams/${teamId}/members`, input);
};
export const removeTournamentTeamMember = async (tournamentId, teamId, userId) => {
    await apiClient.delete(`/api/v1/tournaments/${tournamentId}/teams/${teamId}/members/${userId}`);
};
export const deleteTournamentTeam = async (tournamentId, teamId) => {
    await apiClient.delete(`/api/v1/tournaments/${tournamentId}/teams/${teamId}`);
};
export const updateTournamentMatchStatus = async (tournamentId, matchId, status) => {
    return apiClient.patch(`/api/v1/tournaments/${tournamentId}/matches/${matchId}/status`, {
        status,
    });
};
export const startTournamentMatch = async (tournamentId, matchId) => {
    return apiClient.post(`/api/v1/tournaments/${tournamentId}/matches/${matchId}/start`, {});
};
export const getUserTournamentHistory = async (userId) => {
    return apiClient.get(`/api/v1/users/${userId}/tournaments`);
};
export const ensureTournamentRoles = async (tournamentId) => {
    return apiClient.post(`/api/v1/tournaments/${tournamentId}/roles/ensure`, {});
};
export const listTournamentRoleBindings = async (tournamentId) => {
    return apiClient.get(`/api/v1/tournaments/${tournamentId}/roles/bindings`);
};
export const bindTournamentRole = async (tournamentId, input) => {
    await apiClient.post(`/api/v1/tournaments/${tournamentId}/roles/bindings`, input);
};
export const unbindTournamentRole = async (tournamentId, roleCode, userId) => {
    await apiClient.delete(`/api/v1/tournaments/${tournamentId}/roles/${roleCode}/bindings/${userId}`);
};
export const provisionTournamentMatchWorkspace = async (tournamentId, matchId) => {
    return apiClient.post(`/api/v1/tournaments/${tournamentId}/match-workspaces/provision`, { match_id: matchId });
};
export const listTournamentMatchWorkspaces = async (tournamentId) => {
    return apiClient.get(`/api/v1/tournaments/${tournamentId}/match-workspaces`);
};
export const getTournamentMatchObserverTokens = async (tournamentId, matchId) => {
    return apiClient.post(`/api/v1/tournaments/${tournamentId}/matches/${matchId}/observer-token`, {});
};
//# sourceMappingURL=tournaments.js.map