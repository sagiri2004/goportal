const DEFAULT_GAME_WS_URL = 'ws://localhost:8080/ws/game';
const decodeUserIdFromJWT = (token) => {
    const raw = token.trim();
    if (!raw)
        return null;
    const parts = raw.split('.');
    if (parts.length < 2)
        return null;
    try {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const userId = payload.user_id?.trim();
        return userId || null;
    }
    catch {
        return null;
    }
};
export class GameWsClient {
    token;
    wsURL;
    ws = null;
    listeners = new Set();
    subscribedRooms = new Set();
    outboundQueue = [];
    reconnectTimer = null;
    closedByClient = false;
    reconnectAttempt = 0;
    processedEventIDs = new Map();
    constructor(token, wsURL = import.meta.env
        ?.VITE_GAME_WS_URL ?? DEFAULT_GAME_WS_URL) {
        this.token = token;
        this.wsURL = wsURL;
    }
    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }
        this.closedByClient = false;
        this.connectInternal();
    }
    disconnect() {
        this.closedByClient = true;
        if (this.reconnectTimer) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.ws?.close();
        this.ws = null;
    }
    subscribeRoom(roomId) {
        const normalized = roomId.trim();
        if (!normalized)
            return;
        this.subscribedRooms.add(normalized);
        this.send({ type: 'subscribe.room', room_id: normalized });
    }
    publishState(input) {
        const roomID = input.room_id.trim();
        const gameID = input.game_id.trim();
        if (!roomID || !gameID) {
            return false;
        }
        const payload = {
            type: 'publish.state',
            game_id: gameID,
            room_id: roomID,
            state: input.state,
            state_version: input.state_version,
            room_status: input.room_status ?? 'open',
            channel_id: input.channel_id,
        };
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.outboundQueue.push(payload);
            if (this.outboundQueue.length > 200) {
                this.outboundQueue.splice(0, this.outboundQueue.length - 200);
            }
            return true;
        }
        this.send(payload);
        return true;
    }
    onRoomEvent(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    connectInternal() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }
        const target = new URL(this.wsURL);
        target.searchParams.set('token', this.token);
        const userId = decodeUserIdFromJWT(this.token);
        if (userId) {
            target.searchParams.set('user_id', userId);
        }
        const ws = new WebSocket(target.toString());
        this.ws = ws;
        ws.onopen = () => {
            if (ws !== this.ws)
                return;
            this.reconnectAttempt = 0;
            this.subscribedRooms.forEach((roomId) => {
                this.send({ type: 'subscribe.room', room_id: roomId });
            });
            this.flushQueue();
        };
        ws.onmessage = (event) => {
            if (ws !== this.ws)
                return;
            let parsed = null;
            try {
                parsed = JSON.parse(String(event.data));
            }
            catch {
                parsed = null;
            }
            if (!parsed || parsed.type !== 'game.room.event' || !parsed.payload || typeof parsed.payload !== 'object') {
                return;
            }
            const payload = parsed.payload;
            const eventID = payload.event_id?.trim();
            if (eventID) {
                if (this.processedEventIDs.has(eventID)) {
                    return;
                }
                this.processedEventIDs.set(eventID, Date.now());
                if (this.processedEventIDs.size > 1000) {
                    const entries = [...this.processedEventIDs.entries()].sort((a, b) => a[1] - b[1]);
                    entries.slice(0, 300).forEach(([id]) => this.processedEventIDs.delete(id));
                }
            }
            this.listeners.forEach((listener) => {
                listener(payload);
            });
        };
        ws.onclose = () => {
            if (ws !== this.ws)
                return;
            if (this.closedByClient)
                return;
            const delay = Math.min(30000, 1000 * 2 ** this.reconnectAttempt);
            this.reconnectAttempt += 1;
            this.reconnectTimer = window.setTimeout(() => {
                this.reconnectTimer = null;
                this.connectInternal();
            }, delay);
        };
        ws.onerror = () => {
            if (ws !== this.ws)
                return;
            ws.close();
        };
    }
    send(payload) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
            return;
        this.ws.send(JSON.stringify(payload));
    }
    flushQueue() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.outboundQueue.length === 0) {
            return;
        }
        const queue = [...this.outboundQueue];
        this.outboundQueue = [];
        queue.forEach((payload) => this.send(payload));
    }
}
//# sourceMappingURL=game-ws.js.map