export const GOPORTAL_PROTOCOL_VERSION = '2.0'

export type SDKCapabilities = {
  share_score: boolean
  share_achievement: boolean
  share_game: boolean
  share_session_start?: boolean
  rooms: boolean
  room_state_sync: boolean
  user_profile?: boolean
  cloud_data?: boolean
  leaderboard?: boolean
  room_presence?: boolean
  join_room_intent?: boolean
}

export type SDKContext = {
  game_id?: string
  channel_id?: string
  user_id?: string
}

export type SDKErrorCode =
  | 'ERR_BAD_REQUEST'
  | 'ERR_TIMEOUT'
  | 'ERR_UNAUTHORIZED'
  | 'ERR_CHANNEL_REQUIRED'
  | 'ERR_ROOM_REQUIRED'
  | 'ERR_NOT_READY'
  | 'ERR_UNSUPPORTED_ACTION'
  | 'ERR_INTERNAL'

export type SDKAction =
  | 'handshake'
  | 'init'
  | 'shareScore'
  | 'shareAchievement'
  | 'shareGame'
  | 'shareSessionStart'
  | 'createRoom'
  | 'joinRoom'
  | 'leaveRoom'
  | 'getRoomState'
  | 'subscribeRoom'
  | 'sendState'
  | 'listOpenRooms'
  | 'shareRoom'
  | 'updateRoom'
  | 'leftRoom'
  | 'getUser'
  | 'showAuthPrompt'
  | 'dataGet'
  | 'dataSet'
  | 'dataRemove'
  | 'submitScore'
  | 'getLeaderboard'

export type SDKShareAction = 'shareScore' | 'shareAchievement' | 'shareGame' | 'shareSessionStart'
export type SDKExtendedShareAction = SDKShareAction | 'shareRoom'

export type SDKShareTarget = {
  channel_id?: string
  server_id?: string
}

export type SDKShareResult = {
  session_id?: string
  event_id?: string
  share_action: SDKExtendedShareAction
  shared: boolean
  share_status: 'shared' | 'skipped'
  target?: SDKShareTarget
}

export type SDKRequestEnvelope<TPayload = unknown> = {
  type: 'GOPORTAL_SDK_REQUEST'
  protocol_version: string
  request_id: string
  action: SDKAction
  payload: TPayload
}

export type SDKErrorPayload = {
  error_code: SDKErrorCode
  message: string
  retryable?: boolean
}

export type SDKResponseEnvelope<TData = unknown> = {
  type: 'GOPORTAL_SDK_RESPONSE'
  protocol_version: string
  request_id: string
  ok: boolean
  data?: TData
  error?: string
  error_code?: SDKErrorCode
  retryable?: boolean
}

export type SDKHandshakeData = {
  protocol_version: string
  capabilities: SDKCapabilities
  context: SDKContext
}

export type SDKReadyOptions = {
  timeoutMs?: number
}

export type SDKInitPayload = {
  channel_id?: string
  room_id?: string
  metadata?: unknown
}

export type SDKShareScorePayload = {
  score: number
  share?: boolean
  channel_id?: string
  comment?: string
  idempotency_key?: string
  payload?: unknown
}

export type SDKShareAchievementPayload = {
  achievement_code?: string
  achievement_title?: string
  share?: boolean
  channel_id?: string
  comment?: string
  idempotency_key?: string
  payload?: unknown
}

export type SDKShareGamePayload = {
  channel_id?: string
  comment?: string
  share?: boolean
}

export type SDKShareSessionStartPayload = {
  channel_id?: string
  comment?: string
  share?: boolean
}

export type SDKCreateRoomPayload = {
  channel_id?: string
  room_name?: string
  max_players?: number
}

export type SDKUpdateRoomPayload = {
  room_id: string
  is_joinable?: boolean
  invite_params?: Record<string, unknown>
  metadata?: unknown
}

export type SDKLeftRoomPayload = {
  room_id?: string
}

export type SDKJoinLeaveRoomPayload = {
  room_id: string
}

export type SDKGetStatePayload = {
  room_id: string
}

export type SDKListOpenRoomsPayload = {
  game_id?: string
  limit?: number
  offset?: number
}

export type SDKShareRoomPayload = {
  room_id: string
  room_name?: string
  channel_id?: string
  comment?: string
  share?: boolean
}

export type SDKSendStatePayload = {
  room_id: string
  state: unknown
  state_version?: number
  idempotency_key?: string
}

export type SDKUserProfile = {
  user_id: string
  display_name?: string
  avatar_url?: string
  is_guest?: boolean
}

export type SDKAuthPromptPayload = {
  mode?: 'signin' | 'signup'
  reason?: string
}

export type SDKDataGetPayload = {
  key: string
}

export type SDKDataSetPayload = {
  key: string
  value: unknown
}

export type SDKDataRemovePayload = {
  key: string
}

export type SDKDataValueResult = {
  key: string
  value?: unknown
  found: boolean
}

export type SDKSubmitScorePayload = {
  leaderboard_id: string
  score: number
  metadata?: unknown
}

export type SDKGetLeaderboardPayload = {
  leaderboard_id: string
  scope?: 'global' | 'friends' | 'channel'
  limit?: number
}

export type SDKLeaderboardEntry = {
  rank: number
  user_id: string
  display_name?: string
  score: number
  metadata?: unknown
  created_at?: string
}

export type SDKLeaderboardResult = {
  leaderboard_id: string
  scope: 'global' | 'friends' | 'channel'
  entries: SDKLeaderboardEntry[]
  me?: SDKLeaderboardEntry
}

export type SDKEventPayload = {
  event_id?: string
  event_type?: string
  [key: string]: unknown
}
