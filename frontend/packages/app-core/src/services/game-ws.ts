export type GameRoomRealtimeEvent = {
  event_id: string
  event_type: string
  occurred_at: string
  game_id: string
  room_id: string
  actor_user_id: string
  member_user_ids: string[]
  channel_id?: string
  room_status: string
  state_version: number
  state?: unknown
}

type Listener = (event: GameRoomRealtimeEvent) => void

const DEFAULT_GAME_WS_URL = 'ws://localhost:8091/ws/game'

export class GameWsClient {
  private ws: WebSocket | null = null
  private listeners = new Set<Listener>()
  private subscribedRooms = new Set<string>()
  private reconnectTimer: number | null = null
  private closedByClient = false
  private reconnectAttempt = 0
  private processedEventIDs = new Map<string, number>()

  constructor(
    private readonly token: string,
    private readonly wsURL: string = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      ?.VITE_GAME_WS_URL ?? DEFAULT_GAME_WS_URL,
  ) {}

  connect() {
    this.closedByClient = false
    this.connectInternal()
  }

  disconnect() {
    this.closedByClient = true
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  subscribeRoom(roomId: string) {
    const normalized = roomId.trim()
    if (!normalized) return
    this.subscribedRooms.add(normalized)
    this.send({ type: 'subscribe.room', room_id: normalized })
  }

  onRoomEvent(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private connectInternal() {
    const target = new URL(this.wsURL)
    target.searchParams.set('token', this.token)
    const ws = new WebSocket(target.toString())
    this.ws = ws

    ws.onopen = () => {
      this.reconnectAttempt = 0
      this.subscribedRooms.forEach((roomId) => {
        this.send({ type: 'subscribe.room', room_id: roomId })
      })
    }

    ws.onmessage = (event) => {
      let parsed: { type?: string; payload?: unknown } | null = null
      try {
        parsed = JSON.parse(String(event.data))
      } catch {
        parsed = null
      }
      if (!parsed || parsed.type !== 'game.room.event' || !parsed.payload || typeof parsed.payload !== 'object') {
        return
      }
      const payload = parsed.payload as GameRoomRealtimeEvent
      const eventID = payload.event_id?.trim()
      if (eventID) {
        if (this.processedEventIDs.has(eventID)) {
          return
        }
        this.processedEventIDs.set(eventID, Date.now())
        if (this.processedEventIDs.size > 1000) {
          const entries = [...this.processedEventIDs.entries()].sort((a, b) => a[1] - b[1])
          entries.slice(0, 300).forEach(([id]) => this.processedEventIDs.delete(id))
        }
      }
      this.listeners.forEach((listener) => {
        listener(payload)
      })
    }

    ws.onclose = () => {
      if (this.closedByClient) return
      const delay = Math.min(30000, 1000 * 2 ** this.reconnectAttempt)
      this.reconnectAttempt += 1
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null
        this.connectInternal()
      }, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  private send(payload: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify(payload))
  }
}
