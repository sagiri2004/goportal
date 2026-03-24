import { apiClient } from '../lib/api-client'
import type {
  CreateTournamentRequest,
  TournamentDetailDTO,
  TournamentListDTO,
  TournamentMatchDTO,
  TournamentMatchReportDTO,
  TournamentStatusDTO,
  TournamentTeamDTO,
  TournamentParticipantDTO,
  TournamentDTO,
  UpdateTournamentRequest,
} from '@goportal/types'

type ListTournamentsParams = {
  status?: TournamentStatusDTO
  page?: number
  limit?: number
}

const withQuery = (path: string, query: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return
    }
    search.set(key, String(value))
  })
  const encoded = search.toString()
  return encoded ? `${path}?${encoded}` : path
}

export const listTournamentsByServer = async (
  serverId: string,
  params: ListTournamentsParams = {},
): Promise<TournamentListDTO> =>
  apiClient.get<TournamentListDTO>(
    withQuery(`/api/v1/servers/${serverId}/tournaments`, {
      status: params.status,
      page: params.page ?? 1,
      limit: params.limit ?? 50,
    }),
  )

export const createTournament = async (
  serverId: string,
  body: CreateTournamentRequest,
): Promise<TournamentDTO> =>
  apiClient.post<TournamentDTO>(`/api/v1/servers/${serverId}/tournaments`, body)

export const getTournamentDetail = async (tournamentId: string): Promise<TournamentDetailDTO> =>
  apiClient.get<TournamentDetailDTO>(`/api/v1/tournaments/${tournamentId}`)

export const updateTournament = async (
  tournamentId: string,
  body: UpdateTournamentRequest,
): Promise<TournamentDTO> =>
  apiClient.patch<TournamentDTO>(`/api/v1/tournaments/${tournamentId}`, body)

export const deleteTournament = async (tournamentId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/tournaments/${tournamentId}`)
}

export const updateTournamentStatus = async (
  tournamentId: string,
  status: TournamentStatusDTO,
): Promise<TournamentDTO> =>
  apiClient.patch<TournamentDTO>(`/api/v1/tournaments/${tournamentId}/status`, { status })

export const registerTournamentParticipant = async (
  tournamentId: string,
): Promise<TournamentParticipantDTO> =>
  apiClient.post<TournamentParticipantDTO>(`/api/v1/tournaments/${tournamentId}/participants`, {})

export const cancelTournamentRegistration = async (tournamentId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/tournaments/${tournamentId}/participants/me`)
}

export const checkInTournamentParticipant = async (
  tournamentId: string,
  participantId: string,
): Promise<TournamentParticipantDTO> =>
  apiClient.post<TournamentParticipantDTO>(
    `/api/v1/tournaments/${tournamentId}/participants/${participantId}/checkin`,
    {},
  )

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
): Promise<TournamentParticipantDTO> =>
  apiClient.patch<TournamentParticipantDTO>(
    `/api/v1/tournaments/${tournamentId}/participants/${participantId}/seed`,
    { seed },
  )

export const bulkAddTournamentParticipants = async (
  tournamentId: string,
  userIds: string[],
): Promise<TournamentParticipantDTO[]> =>
  apiClient.post<TournamentParticipantDTO[]>(
    `/api/v1/tournaments/${tournamentId}/participants/bulk`,
    { user_ids: userIds },
  )

export const getTournamentBracket = async (tournamentId: string): Promise<TournamentMatchDTO[]> =>
  apiClient.get<TournamentMatchDTO[]>(`/api/v1/tournaments/${tournamentId}/bracket`)

export const listTournamentMatches = async (
  tournamentId: string,
  params: {
    round?: number
    status?: string
    participant_id?: string
  } = {},
): Promise<TournamentMatchDTO[]> =>
  apiClient.get<TournamentMatchDTO[]>(
    withQuery(`/api/v1/tournaments/${tournamentId}/matches`, params),
  )

export const getTournamentMatch = async (
  tournamentId: string,
  matchId: string,
): Promise<TournamentMatchDTO> =>
  apiClient.get<TournamentMatchDTO>(`/api/v1/tournaments/${tournamentId}/matches/${matchId}`)

export const reportTournamentMatchResult = async (
  tournamentId: string,
  matchId: string,
  body: {
    winner_id: string
    score1: number
    score2: number
    screenshot_url?: string
  },
): Promise<TournamentMatchReportDTO> =>
  apiClient.post<TournamentMatchReportDTO>(
    `/api/v1/tournaments/${tournamentId}/matches/${matchId}/result`,
    body,
  )

export const disputeTournamentMatchResult = async (
  tournamentId: string,
  matchId: string,
): Promise<TournamentMatchReportDTO> =>
  apiClient.post<TournamentMatchReportDTO>(
    `/api/v1/tournaments/${tournamentId}/matches/${matchId}/dispute`,
    {},
  )

export const overrideTournamentMatchResult = async (
  tournamentId: string,
  matchId: string,
  body: {
    winner_id: string
    score1: number
    score2: number
    reason: string
  },
): Promise<TournamentMatchDTO> =>
  apiClient.patch<TournamentMatchDTO>(
    `/api/v1/tournaments/${tournamentId}/matches/${matchId}/override`,
    body,
  )

export const getTournamentStandings = async (
  tournamentId: string,
): Promise<TournamentParticipantDTO[]> =>
  apiClient.get<TournamentParticipantDTO[]>(`/api/v1/tournaments/${tournamentId}/standings`)

export const listTournamentTeams = async (tournamentId: string): Promise<TournamentTeamDTO[]> =>
  apiClient.get<TournamentTeamDTO[]>(`/api/v1/tournaments/${tournamentId}/teams`)
