import type {
  CreateTournamentRequest,
  TournamentDetailDTO,
  TournamentListDTO,
  TournamentMatchDTO,
  TournamentMatchReportDTO,
  TournamentStatusDTO,
  TournamentTeamDTO,
  TournamentParticipantDTO,
  TournamentRoleBindingDTO,
  TournamentRoleDTO,
  TournamentDTO,
  TournamentMatchWorkspaceDTO,
  TournamentObserverTokenBundleDTO,
  UpdateTournamentRequest,
} from '@goportal/types'
import { apiClient } from '../lib/api-client'
import type { RecordingItem } from './voice'

type ListTournamentsParams = {
  status?: TournamentStatusDTO
  page?: number
  limit?: number
}

const toQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })
  const raw = search.toString()
  return raw ? `?${raw}` : ''
}

export const listTournamentsByServer = async (
  serverId: string,
  params: ListTournamentsParams = {},
): Promise<TournamentListDTO> => {
  const query = toQuery({
    status: params.status,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  })
  return apiClient.get<TournamentListDTO>(`/api/v1/servers/${serverId}/tournaments${query}`)
}

export const createTournament = async (
  serverId: string,
  input: CreateTournamentRequest,
): Promise<TournamentDTO> => {
  return apiClient.post<TournamentDTO>(`/api/v1/servers/${serverId}/tournaments`, input)
}

export const getTournamentDetail = async (tournamentId: string): Promise<TournamentDetailDTO> => {
  return apiClient.get<TournamentDetailDTO>(`/api/v1/tournaments/${tournamentId}`)
}

export const updateTournament = async (
  tournamentId: string,
  input: UpdateTournamentRequest,
): Promise<TournamentDTO> => {
  return apiClient.patch<TournamentDTO>(`/api/v1/tournaments/${tournamentId}`, input)
}

export const deleteTournament = async (tournamentId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/tournaments/${tournamentId}`)
}

export const updateTournamentStatus = async (
  tournamentId: string,
  status: TournamentStatusDTO,
): Promise<TournamentDTO> => {
  return apiClient.patch<TournamentDTO>(`/api/v1/tournaments/${tournamentId}/status`, { status })
}

export const registerTournamentParticipant = async (
  tournamentId: string,
): Promise<TournamentParticipantDTO> => {
  return apiClient.post<TournamentParticipantDTO>(`/api/v1/tournaments/${tournamentId}/participants`, {})
}

export const cancelTournamentRegistration = async (tournamentId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/tournaments/${tournamentId}/participants/me`)
}

export const checkInTournamentParticipant = async (
  tournamentId: string,
  participantId: string,
): Promise<TournamentParticipantDTO> => {
  return apiClient.post<TournamentParticipantDTO>(
    `/api/v1/tournaments/${tournamentId}/participants/${participantId}/checkin`,
    {},
  )
}

export const removeTournamentParticipant = async (
  tournamentId: string,
  participantId: string,
): Promise<void> => {
  await apiClient.delete(`/api/v1/tournaments/${tournamentId}/participants/${participantId}`)
}

export const updateTournamentParticipantSeed = async (
  tournamentId: string,
  participantId: string,
  seed: number,
): Promise<TournamentParticipantDTO> => {
  return apiClient.patch<TournamentParticipantDTO>(
    `/api/v1/tournaments/${tournamentId}/participants/${participantId}/seed`,
    { seed },
  )
}

export const bulkAddTournamentParticipants = async (
  tournamentId: string,
  userIds: string[],
): Promise<TournamentParticipantDTO[]> => {
  return apiClient.post<TournamentParticipantDTO[]>(
    `/api/v1/tournaments/${tournamentId}/participants/bulk`,
    { user_ids: userIds },
  )
}

export const getTournamentBracket = async (tournamentId: string): Promise<TournamentMatchDTO[]> => {
  return apiClient.get<TournamentMatchDTO[]>(`/api/v1/tournaments/${tournamentId}/bracket`)
}

export const listTournamentMatches = async (
  tournamentId: string,
  params: {
    status?: TournamentMatchDTO['status']
    round?: number
    bracket_side?: string
  } = {},
): Promise<TournamentMatchDTO[]> => {
  const query = toQuery({
    status: params.status,
    round: params.round,
    bracket_side: params.bracket_side,
  })
  return apiClient.get<TournamentMatchDTO[]>(`/api/v1/tournaments/${tournamentId}/matches${query}`)
}

export const getTournamentMatch = async (
  tournamentId: string,
  matchId: string,
): Promise<TournamentMatchDTO> => {
  return apiClient.get<TournamentMatchDTO>(`/api/v1/tournaments/${tournamentId}/matches/${matchId}`)
}

export const reportTournamentMatchResult = async (
  tournamentId: string,
  matchId: string,
  input: {
    winner_id: string
    score1: number
    score2: number
    screenshot_url?: string | null
  },
): Promise<TournamentMatchReportDTO> => {
  return apiClient.post<TournamentMatchReportDTO>(
    `/api/v1/tournaments/${tournamentId}/matches/${matchId}/result`,
    input,
  )
}

export const disputeTournamentMatchResult = async (
  tournamentId: string,
  matchId: string,
): Promise<TournamentMatchReportDTO> => {
  return apiClient.post<TournamentMatchReportDTO>(
    `/api/v1/tournaments/${tournamentId}/matches/${matchId}/dispute`,
    {},
  )
}

export const overrideTournamentMatchResult = async (
  tournamentId: string,
  matchId: string,
  input: {
    winner_id: string
    score1: number
    score2: number
    reason: string
  },
): Promise<TournamentMatchDTO> => {
  return apiClient.patch<TournamentMatchDTO>(
    `/api/v1/tournaments/${tournamentId}/matches/${matchId}/override`,
    input,
  )
}

export const getTournamentStandings = async (
  tournamentId: string,
): Promise<TournamentParticipantDTO[]> => {
  return apiClient.get<TournamentParticipantDTO[]>(`/api/v1/tournaments/${tournamentId}/standings`)
}

export const listTournamentTeams = async (tournamentId: string): Promise<TournamentTeamDTO[]> => {
  return apiClient.get<TournamentTeamDTO[]>(`/api/v1/tournaments/${tournamentId}/teams`)
}

export const createTournamentTeam = async (
  tournamentId: string,
  input: { name: string },
): Promise<TournamentTeamDTO> => {
  return apiClient.post<TournamentTeamDTO>(`/api/v1/tournaments/${tournamentId}/teams`, input)
}

export const addTournamentTeamMember = async (
  tournamentId: string,
  teamId: string,
  input: { user_id: string },
): Promise<void> => {
  await apiClient.post(`/api/v1/tournaments/${tournamentId}/teams/${teamId}/members`, input)
}

export const removeTournamentTeamMember = async (
  tournamentId: string,
  teamId: string,
  userId: string,
): Promise<void> => {
  await apiClient.delete(`/api/v1/tournaments/${tournamentId}/teams/${teamId}/members/${userId}`)
}

export const deleteTournamentTeam = async (
  tournamentId: string,
  teamId: string,
): Promise<void> => {
  await apiClient.delete(`/api/v1/tournaments/${tournamentId}/teams/${teamId}`)
}

export const updateTournamentMatchStatus = async (
  tournamentId: string,
  matchId: string,
  status: TournamentMatchDTO['status'],
): Promise<TournamentMatchDTO> => {
  return apiClient.patch<TournamentMatchDTO>(`/api/v1/tournaments/${tournamentId}/matches/${matchId}/status`, {
    status,
  })
}

export const startTournamentMatch = async (
  tournamentId: string,
  matchId: string,
): Promise<{ match: TournamentMatchDTO; workspace: TournamentMatchWorkspaceDTO; screen_share_required: boolean }> => {
  return apiClient.post<{ match: TournamentMatchDTO; workspace: TournamentMatchWorkspaceDTO; screen_share_required: boolean }>(
    `/api/v1/tournaments/${tournamentId}/matches/${matchId}/start`,
    {},
  )
}

export const closeTournamentMatchLive = async (
  tournamentId: string,
  matchId: string,
): Promise<{ recordings: RecordingItem[]; stopped_streams: RecordingItem[] }> => {
  return apiClient.post<{ recordings: RecordingItem[]; stopped_streams: RecordingItem[] }>(
    `/api/v1/tournaments/${tournamentId}/matches/${matchId}/live/close`,
    {},
  )
}

export const getUserTournamentHistory = async (userId: string): Promise<TournamentDTO[]> => {
  return apiClient.get<TournamentDTO[]>(`/api/v1/users/${userId}/tournaments`)
}

export const ensureTournamentRoles = async (tournamentId: string): Promise<TournamentRoleDTO[]> => {
  return apiClient.post<TournamentRoleDTO[]>(`/api/v1/tournaments/${tournamentId}/roles/ensure`, {})
}

export const listTournamentRoleBindings = async (
  tournamentId: string,
): Promise<TournamentRoleBindingDTO[]> => {
  return apiClient.get<TournamentRoleBindingDTO[]>(`/api/v1/tournaments/${tournamentId}/roles/bindings`)
}

export const bindTournamentRole = async (
  tournamentId: string,
  input: { role_code: string; user_id: string },
): Promise<void> => {
  await apiClient.post(`/api/v1/tournaments/${tournamentId}/roles/bindings`, input)
}

export const unbindTournamentRole = async (
  tournamentId: string,
  roleCode: string,
  userId: string,
): Promise<void> => {
  await apiClient.delete(`/api/v1/tournaments/${tournamentId}/roles/${roleCode}/bindings/${userId}`)
}

export const provisionTournamentMatchWorkspace = async (
  tournamentId: string,
  matchId: string,
): Promise<TournamentMatchWorkspaceDTO> => {
  return apiClient.post<TournamentMatchWorkspaceDTO>(
    `/api/v1/tournaments/${tournamentId}/match-workspaces/provision`,
    { match_id: matchId },
  )
}

export const listTournamentMatchWorkspaces = async (
  tournamentId: string,
): Promise<TournamentMatchWorkspaceDTO[]> => {
  return apiClient.get<TournamentMatchWorkspaceDTO[]>(`/api/v1/tournaments/${tournamentId}/match-workspaces`)
}

export const getTournamentMatchObserverTokens = async (
  tournamentId: string,
  matchId: string,
): Promise<TournamentObserverTokenBundleDTO> => {
  return apiClient.post<TournamentObserverTokenBundleDTO>(
    `/api/v1/tournaments/${tournamentId}/matches/${matchId}/observer-token`,
    {},
  )
}
