import { apiClient } from '../lib/api-client'
import { useAuthStore } from '@goportal/store'

export type GameDTO = {
  id: string
  owner_user_id: string
  source_type: 'system' | 'community'
  title: string
  slug: string
  description?: string
  visibility: 'public' | 'private'
  status: 'published' | 'disabled'
  publish_state: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended'
  category?: string
  tags?: string[]
  age_rating?: string
  featured_score: number
  avg_rating: number
  rating_count: number
  launch_count: number
  trending_score: number
  thumbnail_url?: string
  created_at: number
  updated_at: number
}

export type GameBuildDTO = {
  id: string
  game_id: string
  version: string
  storage_zip_url: string
  play_base_path: string
  entry_file: string
  file_size: number
  checksum?: string
  status: 'ready' | 'failed'
  error_message?: string
  created_at: number
  updated_at: number
}

export type GameWithBuildDTO = {
  game: GameDTO
  build?: GameBuildDTO
}

export type PlaySessionDTO = {
  play_url: string
  title: string
  version: string
  game_id: string
  entry_file: string
}

export type GameReviewDTO = {
  id: string
  game_id: string
  user_id: string
  title?: string
  content: string
  rating_score?: number
  status: 'visible' | 'hidden' | 'flagged'
  moderated_by?: string
  moderated_at?: number
  moderation_note?: string
  helpful_count: number
  created_at: number
  updated_at: number
}

export type GameRatingDTO = {
  id: string
  game_id: string
  user_id: string
  score: number
  created_at: number
  updated_at: number
}

export type GameCurationDTO = {
  id: string
  game_id: string
  curated_by: string
  collection_key: string
  priority: number
  note?: string
  starts_at?: number
  ends_at?: number
  is_active: boolean
  created_at: number
  updated_at: number
}

export type GameMarketFilter = {
  source_type?: 'system' | 'community'
  q?: string
  category?: string
  sort?: 'trending' | 'top_rated' | 'newest' | 'most_played' | 'featured'
  limit?: number
  offset?: number
}

const toSearchParams = (filter: Record<string, string | number | undefined>): string => {
  const query = new URLSearchParams()
  Object.entries(filter).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    query.set(key, String(value))
  })
  const output = query.toString()
  return output ? `?${output}` : ''
}

export const listGames = async (filter: GameMarketFilter = {}): Promise<GameWithBuildDTO[]> =>
  apiClient.get(`/api/v1/games/market${toSearchParams(filter)}`)

export const listTrendingGames = async (filter: {
  source_type?: 'system' | 'community'
  limit?: number
} = {}): Promise<GameWithBuildDTO[]> =>
  apiClient.get(`/api/v1/games/trending${toSearchParams(filter)}`)

export const searchGames = async (filter: {
  q: string
  source_type?: 'system' | 'community'
  limit?: number
  offset?: number
}): Promise<GameWithBuildDTO[]> =>
  apiClient.get(`/api/v1/games/search${toSearchParams(filter)}`)

export const getGame = async (id: string): Promise<GameWithBuildDTO> => apiClient.get(`/api/v1/games/${id}`)

export const createGame = async (payload: {
  title: string
  slug: string
  description?: string
  visibility?: 'public' | 'private'
  thumbnail_url?: string
  category?: string
  tags?: string[]
  age_rating?: string
}): Promise<GameDTO> => apiClient.post('/api/v1/games', payload)

export const createSystemGame = async (payload: {
  title: string
  slug: string
  description?: string
  visibility?: 'public' | 'private'
  thumbnail_url?: string
  category?: string
  tags?: string[]
  age_rating?: string
}): Promise<GameDTO> => apiClient.post('/api/v1/admin/games/system', payload)

export const submitGameForReview = async (gameId: string): Promise<GameDTO> =>
  apiClient.post(`/api/v1/games/${gameId}/submit-review`, {})

export const updateGamePublishState = async (
  gameId: string,
  payload: { publish_state: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended'; note?: string },
): Promise<GameDTO> => apiClient.patch(`/api/v1/admin/games/${gameId}/publish-state`, payload)

export const featureGame = async (
  gameId: string,
  payload: {
    collection_key?: string
    priority: number
    note?: string
    starts_at?: number
    ends_at?: number
    is_active: boolean
  },
): Promise<GameCurationDTO> => apiClient.post(`/api/v1/admin/games/${gameId}/feature`, payload)

export const listMyGames = async (): Promise<GameWithBuildDTO[]> => apiClient.get('/api/v1/games/me')

export const listReviewQueue = async (params: { limit?: number; offset?: number } = {}): Promise<GameWithBuildDTO[]> =>
  apiClient.get(`/api/v1/admin/games/review-queue${toSearchParams(params)}`)

export const uploadGameBuild = async (gameId: string, file: File, version?: string): Promise<GameBuildDTO> => {
  const token = getToken()
  if (!token) {
    throw new Error('Session expired. Please log in again.')
  }

  const formData = new FormData()
  formData.append('file', file)
  if (version?.trim()) {
    formData.append('version', version.trim())
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
    xhr.open('POST', `${baseURL}/api/v1/games/${gameId}/builds`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.onerror = () => {
      reject(new Error('Unable to upload game bundle. Please try again.'))
    }

    xhr.onload = () => {
      let payload:
        | {
            message?: string
            data?: GameBuildDTO
          }
        | null = null

      try {
        payload = JSON.parse(xhr.responseText) as {
          message?: string
          data?: GameBuildDTO
        }
      } catch {
        payload = null
      }

      if (xhr.status < 200 || xhr.status >= 300 || !payload?.data) {
        reject(new Error(payload?.message ?? 'Unable to upload game bundle.'))
        return
      }

      resolve(payload.data)
    }

    xhr.send(formData)
  })
}

export const createPlaySession = async (gameId: string): Promise<PlaySessionDTO> =>
  apiClient.get(`/api/v1/games/${gameId}/play-session`)

export const rateGame = async (gameId: string, score: number): Promise<GameRatingDTO> =>
  apiClient.post(`/api/v1/games/${gameId}/ratings`, { score })

export const createReview = async (
  gameId: string,
  payload: { title?: string; content: string; score?: number },
): Promise<GameReviewDTO> => apiClient.post(`/api/v1/games/${gameId}/reviews`, payload)

export const listReviews = async (
  gameId: string,
  params: { status?: 'visible' | 'hidden' | 'flagged'; limit?: number; offset?: number } = {},
): Promise<GameReviewDTO[]> => apiClient.get(`/api/v1/games/${gameId}/reviews${toSearchParams(params)}`)

export const moderateReview = async (
  reviewId: string,
  payload: { status: 'visible' | 'hidden' | 'flagged'; note?: string },
): Promise<GameReviewDTO> => apiClient.patch(`/api/v1/admin/reviews/${reviewId}/moderate`, payload)

export const reportGame = async (gameId: string, payload: { reason: string; detail?: string }): Promise<{
  id: string
  game_id: string
  reporter_user_id: string
  reason: string
  detail?: string
  status: string
  created_at: number
}> => apiClient.post(`/api/v1/games/${gameId}/reports`, payload)

const getToken = (): string | null => {
  const token = useAuthStore.getState().token
  if (token) {
    return token
  }

  const direct = localStorage.getItem('auth_token')
  if (direct) {
    return direct
  }

  const legacy = localStorage.getItem('auth-token')
  if (legacy) {
    return legacy
  }

  const persisted = localStorage.getItem('auth-store')
  if (!persisted) {
    return null
  }
  try {
    const parsed = JSON.parse(persisted) as { state?: { token?: string | null } }
    return parsed.state?.token ?? null
  } catch {
    return null
  }
}
