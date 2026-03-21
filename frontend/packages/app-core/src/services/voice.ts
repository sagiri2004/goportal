import { apiClient } from '../lib/api-client'

export type VoiceTokenResponse = {
  token: string
  url: string
}

export type RecordingItem = {
  id: string
  channel_id: string
  server_id: string
  started_by: string
  egress_id: string
  type: string
  status: string
  file_url?: string
  rtmp_url?: string
  duration_seconds?: number
  started_at: number
  ended_at?: number
  created_at: number
}

export type VoiceParticipantSnapshot = {
  user_id: string
  name: string
  avatar_url?: string
  is_screen_sharing?: boolean
}

export const getVoiceToken = async (channelId: string): Promise<VoiceTokenResponse> =>
  apiClient.post<VoiceTokenResponse>(`/api/v1/channels/${channelId}/voice/token`)

export const listVoiceParticipants = async (channelId: string): Promise<{ items: VoiceParticipantSnapshot[] }> =>
  apiClient.get<{ items: VoiceParticipantSnapshot[] }>(`/api/v1/channels/${channelId}/voice/participants`)

export const startChannelRecording = async (channelId: string): Promise<RecordingItem> =>
  apiClient.post<RecordingItem>(`/api/v1/channels/${channelId}/recording/start`)

export const stopChannelRecording = async (channelId: string): Promise<RecordingItem> =>
  apiClient.post<RecordingItem>(`/api/v1/channels/${channelId}/recording/stop`)

export const listChannelRecordings = async (
  channelId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<{ items: RecordingItem[]; limit: number; offset: number }> => {
  const limit = opts.limit ?? 20
  const offset = opts.offset ?? 0
  return apiClient.get<{ items: RecordingItem[]; limit: number; offset: number }>(
    `/api/v1/channels/${channelId}/recordings?limit=${limit}&offset=${offset}`
  )
}

export const startChannelStream = async (
  channelId: string,
  rtmpURL: string
): Promise<RecordingItem> =>
  apiClient.post<RecordingItem>(`/api/v1/channels/${channelId}/stream/start`, {
    rtmp_url: rtmpURL,
  })

export const stopChannelStream = async (channelId: string): Promise<RecordingItem> =>
  apiClient.post<RecordingItem>(`/api/v1/channels/${channelId}/stream/stop`)
