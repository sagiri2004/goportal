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

export class GoPortalGameSDK {
  private session: GameSessionDTO | null = null
  private listeners: Record<string, Array<(payload: unknown) => void>> = {}

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

  async shareScore(score: number, payload: { comment?: string; channel_id?: string } = {}): Promise<void> {
    const session = await this.ensureSession(payload.channel_id)
    const event = await createGameEvent(this.gameId, session.id, {
      event_type: 'score',
      score,
    })
    const targetChannelId = payload.channel_id ?? this.channelId
    if (targetChannelId) {
      await shareGameToChannel(this.gameId, {
        channel_id: targetChannelId,
        session_id: session.id,
        event_id: event.id,
        share_type: 'score',
        score,
        comment: payload.comment,
      })
    }
  }

  async shareAchievement(payload: {
    achievement_code?: string
    achievement_title?: string
    comment?: string
    channel_id?: string
  }): Promise<void> {
    const session = await this.ensureSession(payload.channel_id)
    const event = await createGameEvent(this.gameId, session.id, {
      event_type: 'achievement',
      achievement_code: payload.achievement_code,
      achievement_title: payload.achievement_title,
    })
    const targetChannelId = payload.channel_id ?? this.channelId
    if (targetChannelId) {
      await shareGameToChannel(this.gameId, {
        channel_id: targetChannelId,
        session_id: session.id,
        event_id: event.id,
        share_type: 'achievement',
        achievement: payload.achievement_title ?? payload.achievement_code,
        comment: payload.comment,
      })
    }
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
      throw new Error('SDK session is not initialized')
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
}
