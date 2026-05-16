import {
  createGameEvent,
  createGameRoom,
  getGameRoomState,
  joinGameRoom,
  leaveGameRoom,
  shareGameToChannel,
  startGameSession,
  type GameRoomStateDTO,
  type GameSessionDTO,
} from './games'

type SDKEventMap = {
  session_started: GameSessionDTO
  room_updated: GameRoomStateDTO
}

type SDKListener<T> = (payload: T) => void

type SDKErrorCode =
  | 'ERR_BAD_REQUEST'
  | 'ERR_TIMEOUT'
  | 'ERR_UNAUTHORIZED'
  | 'ERR_CHANNEL_REQUIRED'
  | 'ERR_ROOM_REQUIRED'
  | 'ERR_NOT_READY'
  | 'ERR_UNSUPPORTED_ACTION'
  | 'ERR_INTERNAL'

type SDKCapabilities = {
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

export class GoPortalSDKServiceError extends Error {
  code: SDKErrorCode
  retryable: boolean

  constructor(message: string, code: SDKErrorCode, retryable = false) {
    super(message)
    this.name = 'GoPortalSDKServiceError'
    this.code = code
    this.retryable = retryable
  }
}

export class GoPortalGameSDK {
  private session: GameSessionDTO | null = null
  private listeners: Record<string, Array<(payload: unknown) => void>> = {}
  private readonly capabilities: SDKCapabilities = {
    share_score: true,
    share_achievement: true,
    share_game: true,
    rooms: true,
    room_state_sync: true,
    user_profile: true,
    cloud_data: true,
    leaderboard: true,
    room_presence: true,
    join_room_intent: true,
  }
  private readonly protocolVersion = '2.0'

  constructor(private readonly gameId: string, private readonly channelId?: string) {}

  async init(payload: { channel_id?: string; room_id?: string; metadata?: unknown } = {}): Promise<GameSessionDTO> {
    this.session = await startGameSession(this.gameId, {
      channel_id: payload.channel_id ?? this.channelId,
      room_id: payload.room_id,
      metadata: payload.metadata,
    })
    this.emit('session_started', this.session)
    return this.session
  }

  async ready() {
    return {
      protocol_version: this.protocolVersion,
      capabilities: this.capabilities,
      context: {
        game_id: this.gameId,
        channel_id: this.channelId,
      },
    }
  }

  async shareScore(
    score: number,
    payload: {
      comment?: string
      channel_id?: string
      share?: boolean
      idempotency_key?: string
      payload?: unknown
    } = {},
  ): Promise<{ event_id: string; session_id: string }> {
    const session = await this.ensureSession(payload.channel_id)
    const event = await createGameEvent(this.gameId, session.id, {
      event_type: 'score',
      idempotency_key: payload.idempotency_key,
      score,
      payload: payload.payload,
    })
    const targetChannelId = payload.channel_id ?? this.channelId
    if (targetChannelId && payload.share !== false) {
      await shareGameToChannel(this.gameId, {
        channel_id: targetChannelId,
        session_id: session.id,
        event_id: event.id,
        share_type: 'score',
        score,
        comment: payload.comment,
      })
    }
    return { event_id: event.id, session_id: session.id }
  }

  async shareAchievement(payload: {
    achievement_code?: string
    achievement_title?: string
    comment?: string
    channel_id?: string
    share?: boolean
    idempotency_key?: string
    payload?: unknown
  }): Promise<{ event_id: string; session_id: string }> {
    const session = await this.ensureSession(payload.channel_id)
    const event = await createGameEvent(this.gameId, session.id, {
      event_type: 'achievement',
      idempotency_key: payload.idempotency_key,
      achievement_code: payload.achievement_code,
      achievement_title: payload.achievement_title,
      payload: payload.payload,
    })
    const targetChannelId = payload.channel_id ?? this.channelId
    if (targetChannelId && payload.share !== false) {
      await shareGameToChannel(this.gameId, {
        channel_id: targetChannelId,
        session_id: session.id,
        event_id: event.id,
        share_type: 'achievement',
        achievement: payload.achievement_title ?? payload.achievement_code,
        comment: payload.comment,
      })
    }
    return { event_id: event.id, session_id: session.id }
  }

  async shareGame(payload: { channel_id?: string; comment?: string } = {}): Promise<void> {
    const targetChannelId = payload.channel_id ?? this.channelId
    if (!targetChannelId) {
      throw new GoPortalSDKServiceError('channel_id is required to share game card', 'ERR_CHANNEL_REQUIRED')
    }
    await shareGameToChannel(this.gameId, {
      channel_id: targetChannelId,
      share_type: 'game',
      comment: payload.comment,
    })
  }

  async shareSessionStart(payload: { channel_id?: string; comment?: string; share?: boolean } = {}): Promise<{ session_id: string }> {
    const session = await this.ensureSession(payload.channel_id)
    const targetChannelId = payload.channel_id ?? this.channelId
    if (targetChannelId && payload.share !== false) {
      await shareGameToChannel(this.gameId, {
        channel_id: targetChannelId,
        session_id: session.id,
        share_type: 'game',
        comment: payload.comment,
      })
    }
    return { session_id: session.id }
  }

  async createRoom(payload: { channel_id?: string; room_name?: string; max_players?: number } = {}): Promise<GameRoomStateDTO> {
    const room = await createGameRoom(this.gameId, payload)
    this.emit('room_updated', room)
    return room
  }

  async joinRoom(roomId: string): Promise<GameRoomStateDTO> {
    const room = await joinGameRoom(this.gameId, roomId)
    this.emit('room_updated', room)
    return room
  }

  async leaveRoom(roomId: string): Promise<GameRoomStateDTO> {
    const room = await leaveGameRoom(this.gameId, roomId)
    this.emit('room_updated', room)
    return room
  }

  async sendState(payload: { room_id: string; state: unknown; state_version?: number }): Promise<void> {
    if (!this.session) {
      throw new GoPortalSDKServiceError('SDK session is not initialized', 'ERR_NOT_READY')
    }
    await createGameEvent(this.gameId, this.session.id, {
      event_type: 'state',
      payload: {
        room_id: payload.room_id,
        state: payload.state,
        state_version: payload.state_version,
      },
    })
  }

  async getRoomState(roomId: string): Promise<GameRoomStateDTO> {
    const room = await getGameRoomState(this.gameId, roomId)
    this.emit('room_updated', room)
    return room
  }

  async updateRoom(payload: { room_id: string; is_joinable?: boolean; invite_params?: Record<string, unknown>; metadata?: unknown }) {
    return { updated: true, ...payload }
  }

  async leftRoom(_payload: { room_id?: string } = {}) {
    return { left: true }
  }

  async getUser() {
    const userId = this.channelId ? `user-${this.channelId}` : 'guest'
    return {
      user_id: userId,
      display_name: userId,
      is_guest: userId === 'guest',
    }
  }

  async showAuthPrompt() {
    const user = await this.getUser()
    return { success: true, user }
  }

  async dataGet(key: string) {
    const storageKey = `goportal:sdk:data:${this.gameId}:${key}`
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return { key, found: false }
    }
    return { key, found: true, value: JSON.parse(raw) }
  }

  async dataSet(key: string, value: unknown) {
    const storageKey = `goportal:sdk:data:${this.gameId}:${key}`
    window.localStorage.setItem(storageKey, JSON.stringify(value))
    return { ok: true }
  }

  async dataRemove(key: string) {
    const storageKey = `goportal:sdk:data:${this.gameId}:${key}`
    window.localStorage.removeItem(storageKey)
    return { ok: true }
  }

  async submitScore(payload: { leaderboard_id: string; score: number; metadata?: unknown }) {
    const storageKey = `goportal:sdk:leaderboard:${this.gameId}:${payload.leaderboard_id}`
    const raw = window.localStorage.getItem(storageKey)
    const rows = raw ? (JSON.parse(raw) as Array<{ user_id: string; display_name: string; score: number; metadata?: unknown; created_at: string }>) : []
    const user = await this.getUser()
    rows.push({
      user_id: user.user_id,
      display_name: user.display_name ?? user.user_id,
      score: payload.score,
      metadata: payload.metadata,
      created_at: new Date().toISOString(),
    })
    rows.sort((a, b) => b.score - a.score)
    window.localStorage.setItem(storageKey, JSON.stringify(rows.slice(0, 200)))
    const rank = rows.findIndex((item) => item.user_id === user.user_id && item.score === payload.score) + 1
    return { accepted: true, rank: rank > 0 ? rank : undefined }
  }

  async getLeaderboard(payload: { leaderboard_id: string; scope?: 'global' | 'friends' | 'channel'; limit?: number }) {
    const storageKey = `goportal:sdk:leaderboard:${this.gameId}:${payload.leaderboard_id}`
    const raw = window.localStorage.getItem(storageKey)
    const rows = raw ? (JSON.parse(raw) as Array<{ user_id: string; display_name: string; score: number; metadata?: unknown; created_at: string }>) : []
    const entries = rows.slice(0, Math.max(1, Math.min(payload.limit ?? 20, 100))).map((item, idx) => ({
      rank: idx + 1,
      user_id: item.user_id,
      display_name: item.display_name,
      score: item.score,
      metadata: item.metadata,
      created_at: item.created_at,
    }))
    const meUser = await this.getUser()
    const me = entries.find((item) => item.user_id === meUser.user_id)
    return { leaderboard_id: payload.leaderboard_id, scope: payload.scope ?? 'global', entries, me }
  }

  on<K extends keyof SDKEventMap>(event: K, listener: SDKListener<SDKEventMap[K]>): () => void {
    const key = String(event)
    const next = this.listeners[key] ?? []
    next.push(listener as (payload: unknown) => void)
    this.listeners[key] = next
    return () => {
      this.listeners[key] = (this.listeners[key] ?? []).filter((item) => item !== listener)
    }
  }

  private async ensureSession(channelId?: string): Promise<GameSessionDTO> {
    if (this.session) {
      return this.session
    }
    return this.init({ channel_id: channelId })
  }

  private emit<K extends keyof SDKEventMap>(event: K, payload: SDKEventMap[K]) {
    const key = String(event)
    ;(this.listeners[key] ?? []).forEach((listener) => listener(payload))
  }

  get commands() {
    return {
      init: (payload?: { channel_id?: string; room_id?: string; metadata?: unknown }) => this.init(payload ?? {}),
      shareScore: (payload: {
        score: number
        comment?: string
        channel_id?: string
        share?: boolean
        idempotency_key?: string
        payload?: unknown
      }) =>
        this.shareScore(payload.score, {
          comment: payload.comment,
          channel_id: payload.channel_id,
          share: payload.share,
          idempotency_key: payload.idempotency_key,
          payload: payload.payload,
        }),
      shareAchievement: (payload: {
        achievement_code?: string
        achievement_title?: string
        comment?: string
        channel_id?: string
        share?: boolean
        idempotency_key?: string
        payload?: unknown
      }) => this.shareAchievement(payload),
      shareGame: (payload?: { channel_id?: string; comment?: string }) => this.shareGame(payload ?? {}),
      shareSessionStart: (payload?: { channel_id?: string; comment?: string; share?: boolean }) => this.shareSessionStart(payload ?? {}),
      createRoom: (payload?: { channel_id?: string; room_name?: string; max_players?: number }) => this.createRoom(payload ?? {}),
      joinRoom: (payload: { room_id: string }) => this.joinRoom(payload.room_id),
      leaveRoom: (payload: { room_id: string }) => this.leaveRoom(payload.room_id),
      subscribeRoom: (payload: { room_id: string }) =>
        Promise.resolve({
          subscribed: true,
          room_id: payload.room_id,
        }),
      getRoomState: (payload: { room_id: string }) => this.getRoomState(payload.room_id),
      sendState: (payload: { room_id: string; state: unknown; state_version?: number }) => this.sendState(payload),
      updateRoom: (payload: { room_id: string; is_joinable?: boolean; invite_params?: Record<string, unknown>; metadata?: unknown }) =>
        this.updateRoom(payload),
      leftRoom: (payload?: { room_id?: string }) => this.leftRoom(payload ?? {}),
      getUser: () => this.getUser(),
      showAuthPrompt: () => this.showAuthPrompt(),
      dataGet: (payload: { key: string }) => this.dataGet(payload.key),
      dataSet: (payload: { key: string; value: unknown }) => this.dataSet(payload.key, payload.value),
      dataRemove: (payload: { key: string }) => this.dataRemove(payload.key),
      submitScore: (payload: { leaderboard_id: string; score: number; metadata?: unknown }) => this.submitScore(payload),
      getLeaderboard: (payload: { leaderboard_id: string; scope?: 'global' | 'friends' | 'channel'; limit?: number }) =>
        this.getLeaderboard(payload),
    }
  }
}
