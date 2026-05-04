import { createRequestEnvelope, isResponseEnvelope } from './protocol'
import {
  GOPORTAL_PROTOCOL_VERSION,
  type SDKCapabilities,
  type SDKContext,
  type SDKCreateRoomPayload,
  type SDKEventPayload,
  type SDKGetStatePayload,
  type SDKHandshakeData,
  type SDKInitPayload,
  type SDKJoinLeaveRoomPayload,
  type SDKReadyOptions,
  type SDKResponseEnvelope,
  type SDKShareResult,
  type SDKSendStatePayload,
  type SDKShareAchievementPayload,
  type SDKShareGamePayload,
  type SDKShareSessionStartPayload,
  type SDKShareScorePayload,
} from '../types'

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  timeoutId: number
}

type SDKClientOptions = {
  targetWindow?: Window
  targetOrigin?: string
  requestTimeoutMs?: number
  protocolVersion?: string
}

type Listener = (payload: SDKEventPayload) => void

const DEFAULT_TIMEOUT_MS = 15000

export class GoPortalSDKError extends Error {
  code: string
  retryable: boolean
  data?: unknown

  constructor(message: string, options?: { code?: string; retryable?: boolean; data?: unknown }) {
    super(message)
    this.name = 'GoPortalSDKError'
    this.code = options?.code ?? 'ERR_INTERNAL'
    this.retryable = Boolean(options?.retryable)
    this.data = options?.data
  }
}

export class GoPortalSDKClient {
  private readonly pending = new Map<string, PendingRequest>()
  private readonly listeners = new Map<string, Listener[]>()
  private readonly processedEventIDs = new Map<string, number>()
  private readonly roomVersions = new Map<string, number>()
  private readonly targetOrigin: string
  private readonly requestTimeoutMs: number
  private readonly protocolVersion: string
  private readonly onMessageBound: (event: MessageEvent) => void
  private targetWindow: Window
  private readyPromise: Promise<SDKHandshakeData> | null = null
  private handshakeData: SDKHandshakeData | null = null

  constructor(options: SDKClientOptions = {}) {
    this.targetWindow = options.targetWindow ?? window.parent
    this.targetOrigin = options.targetOrigin ?? '*'
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS
    this.protocolVersion = options.protocolVersion ?? GOPORTAL_PROTOCOL_VERSION
    this.onMessageBound = this.onMessage.bind(this)
    window.addEventListener('message', this.onMessageBound)
  }

  destroy() {
    window.removeEventListener('message', this.onMessageBound)
    this.pending.forEach((item) => {
      window.clearTimeout(item.timeoutId)
      item.reject(new GoPortalSDKError('SDK client destroyed', { code: 'ERR_INTERNAL', retryable: false }))
    })
    this.pending.clear()
    this.listeners.clear()
  }

  get context(): SDKContext {
    return this.handshakeData?.context ?? {}
  }

  get capabilities(): SDKCapabilities {
    return (
      this.handshakeData?.capabilities ?? {
        share_score: false,
        share_achievement: false,
        share_game: false,
        share_session_start: false,
        rooms: false,
        room_state_sync: false,
      }
    )
  }

  async ready(options: SDKReadyOptions = {}): Promise<SDKHandshakeData> {
    if (this.readyPromise) return this.readyPromise
    const timeout = options.timeoutMs ?? this.requestTimeoutMs
    this.readyPromise = this.send('handshake', {}, timeout).then((response) => {
      const data = (response ?? {}) as Partial<SDKHandshakeData>
      this.handshakeData = {
        protocol_version: String(data.protocol_version ?? this.protocolVersion),
        capabilities: {
          share_score: Boolean(data.capabilities?.share_score),
          share_achievement: Boolean(data.capabilities?.share_achievement),
          share_game: Boolean(data.capabilities?.share_game),
          share_session_start: Boolean(data.capabilities?.share_session_start),
          rooms: Boolean(data.capabilities?.rooms),
          room_state_sync: Boolean(data.capabilities?.room_state_sync),
        },
        context: data.context ?? {},
      }
      return this.handshakeData
    })
    return this.readyPromise
  }

  async command<TPayload, TResult>(action: Parameters<typeof createRequestEnvelope<TPayload>>[0]['action'], payload: TPayload): Promise<TResult> {
    await this.ready()
    return this.send(action, payload) as Promise<TResult>
  }

  async init(payload: SDKInitPayload = {}) {
    return this.command<SDKInitPayload, { session_id: string }>('init', payload)
  }

  async shareScore(score: number, payload: Omit<SDKShareScorePayload, 'score'> = {}) {
    return this.command<SDKShareScorePayload, SDKShareResult>('shareScore', { ...payload, score })
  }

  async shareAchievement(payload: SDKShareAchievementPayload = {}) {
    return this.command<SDKShareAchievementPayload, SDKShareResult>('shareAchievement', payload)
  }

  async shareGame(payload: SDKShareGamePayload = {}) {
    return this.command<SDKShareGamePayload, SDKShareResult>('shareGame', payload)
  }

  async shareSessionStart(payload: SDKShareSessionStartPayload = {}) {
    return this.command<SDKShareSessionStartPayload, SDKShareResult>('shareSessionStart', payload)
  }

  async createRoom(payload: SDKCreateRoomPayload = {}) {
    return this.command<SDKCreateRoomPayload, unknown>('createRoom', payload)
  }

  async joinRoom(roomId: string) {
    return this.command<SDKJoinLeaveRoomPayload, unknown>('joinRoom', { room_id: roomId })
  }

  async leaveRoom(roomId: string) {
    return this.command<SDKJoinLeaveRoomPayload, unknown>('leaveRoom', { room_id: roomId })
  }

  async subscribeRoom(roomId: string) {
    return this.command<SDKJoinLeaveRoomPayload, { subscribed: boolean; room_id: string }>('subscribeRoom', { room_id: roomId })
  }

  async getRoomState(roomId: string) {
    return this.command<SDKGetStatePayload, unknown>('getRoomState', { room_id: roomId })
  }

  async sendState(roomId: string, state: unknown, stateVersion?: number, idempotencyKey?: string) {
    return this.command<SDKSendStatePayload, { event_id: string }>('sendState', {
      room_id: roomId,
      state,
      state_version: stateVersion,
      idempotency_key: idempotencyKey,
    })
  }

  on(eventType: string, handler: Listener): () => void {
    const key = eventType || '*'
    const current = this.listeners.get(key) ?? []
    current.push(handler)
    this.listeners.set(key, current)
    return () => {
      const next = (this.listeners.get(key) ?? []).filter((item) => item !== handler)
      this.listeners.set(key, next)
    }
  }

  get commands() {
    return {
      init: (payload?: SDKInitPayload) => this.init(payload),
      shareScore: (payload: SDKShareScorePayload) => this.command<SDKShareScorePayload, SDKShareResult>('shareScore', payload),
      shareAchievement: (payload: SDKShareAchievementPayload) =>
        this.command<SDKShareAchievementPayload, SDKShareResult>('shareAchievement', payload),
      shareGame: (payload?: SDKShareGamePayload) => this.command<SDKShareGamePayload, SDKShareResult>('shareGame', payload ?? {}),
      shareSessionStart: (payload?: SDKShareSessionStartPayload) =>
        this.command<SDKShareSessionStartPayload, SDKShareResult>('shareSessionStart', payload ?? {}),
      createRoom: (payload?: SDKCreateRoomPayload) => this.command<SDKCreateRoomPayload, unknown>('createRoom', payload ?? {}),
      joinRoom: (payload: SDKJoinLeaveRoomPayload) => this.command<SDKJoinLeaveRoomPayload, unknown>('joinRoom', payload),
      leaveRoom: (payload: SDKJoinLeaveRoomPayload) => this.command<SDKJoinLeaveRoomPayload, unknown>('leaveRoom', payload),
      subscribeRoom: (payload: SDKJoinLeaveRoomPayload) =>
        this.command<SDKJoinLeaveRoomPayload, { subscribed: boolean; room_id: string }>('subscribeRoom', payload),
      getRoomState: (payload: SDKGetStatePayload) => this.command<SDKGetStatePayload, unknown>('getRoomState', payload),
      sendState: (payload: SDKSendStatePayload) => this.command<SDKSendStatePayload, { event_id: string }>('sendState', payload),
    }
  }

  private async send<TPayload>(action: Parameters<typeof createRequestEnvelope<TPayload>>[0]['action'], payload: TPayload, timeoutMs?: number) {
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const envelope = createRequestEnvelope({
      requestId,
      action,
      payload,
      protocolVersion: this.protocolVersion,
    })
    const waitMs = timeoutMs ?? this.requestTimeoutMs
    const response = await new Promise<unknown>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pending.delete(requestId)
        reject(new GoPortalSDKError(`SDK request timeout: ${action}`, { code: 'ERR_TIMEOUT', retryable: true }))
      }, waitMs)
      this.pending.set(requestId, { resolve, reject, timeoutId })
      this.targetWindow.postMessage(envelope, this.targetOrigin)
    })
    return response
  }

  private onMessage(event: MessageEvent) {
    if (this.targetOrigin !== '*' && event.origin !== this.targetOrigin) {
      return
    }
    if (event.source !== this.targetWindow) {
      return
    }
    const data = event.data
    if (this.isSDKEvent(data)) {
      this.handleSDKEvent(data.payload)
      return
    }
    if (!isResponseEnvelope(data)) return
    const response = data as SDKResponseEnvelope
    const ref = this.pending.get(response.request_id)
    if (!ref) return
    this.pending.delete(response.request_id)
    window.clearTimeout(ref.timeoutId)
    if (response.ok) {
      ref.resolve(response.data)
      return
    }
    ref.reject(
      new GoPortalSDKError(response.error ?? 'SDK request failed', {
        code: response.error_code ?? 'ERR_INTERNAL',
        retryable: Boolean(response.retryable),
        data: response.data,
      }),
    )
  }

  private isSDKEvent(input: unknown): input is { type: 'GOPORTAL_GAME_EVENT'; payload: SDKEventPayload } {
    if (!input || typeof input !== 'object') return false
    const raw = input as Record<string, unknown>
    return raw.type === 'GOPORTAL_GAME_EVENT' && typeof raw.payload === 'object' && raw.payload !== null
  }

  private handleSDKEvent(payload: SDKEventPayload) {
    const eventID = typeof payload.event_id === 'string' ? payload.event_id.trim() : ''
    if (eventID && this.processedEventIDs.has(eventID)) {
      return
    }
    if (eventID) {
      this.processedEventIDs.set(eventID, Date.now())
      if (this.processedEventIDs.size > 1000) {
        const items = [...this.processedEventIDs.entries()].sort((a, b) => a[1] - b[1])
        items.slice(0, 300).forEach(([id]) => this.processedEventIDs.delete(id))
      }
    }

    const roomId = typeof payload.room_id === 'string' ? payload.room_id : ''
    const incomingVersion = Number(payload.state_version ?? 0)
    const currentVersion = roomId ? Number(this.roomVersions.get(roomId) ?? 0) : 0
    if (roomId && incomingVersion > 0) {
      if (incomingVersion < currentVersion) return
      this.roomVersions.set(roomId, incomingVersion)
    }

    const eventType = typeof payload.event_type === 'string' ? payload.event_type : 'game.room.event'
    const targets = [...(this.listeners.get(eventType) ?? []), ...(this.listeners.get('*') ?? [])]
    targets.forEach((listener) => {
      try {
        listener(payload)
      } catch {
        // no-op by design for consumer callback failures
      }
    })
  }
}
