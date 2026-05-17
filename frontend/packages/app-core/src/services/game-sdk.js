import { createGameEvent, createGameRoom, getGameRoomState, joinGameRoom, leaveGameRoom, shareGameToChannel, startGameSession, } from './games';
export class GoPortalSDKServiceError extends Error {
    code;
    retryable;
    constructor(message, code, retryable = false) {
        super(message);
        this.name = 'GoPortalSDKServiceError';
        this.code = code;
        this.retryable = retryable;
    }
}
export class GoPortalGameSDK {
    gameId;
    channelId;
    session = null;
    listeners = {};
    capabilities = {
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
    };
    protocolVersion = '2.0';
    constructor(gameId, channelId) {
        this.gameId = gameId;
        this.channelId = channelId;
    }
    async init(payload = {}) {
        this.session = await startGameSession(this.gameId, {
            channel_id: payload.channel_id ?? this.channelId,
            room_id: payload.room_id,
            metadata: payload.metadata,
        });
        this.emit('session_started', this.session);
        return this.session;
    }
    async ready() {
        return {
            protocol_version: this.protocolVersion,
            capabilities: this.capabilities,
            context: {
                game_id: this.gameId,
                channel_id: this.channelId,
            },
        };
    }
    async shareScore(score, payload = {}) {
        const session = await this.ensureSession(payload.channel_id);
        const event = await createGameEvent(this.gameId, session.id, {
            event_type: 'score',
            idempotency_key: payload.idempotency_key,
            score,
            payload: payload.payload,
        });
        const targetChannelId = payload.channel_id ?? this.channelId;
        if (targetChannelId && payload.share !== false) {
            await shareGameToChannel(this.gameId, {
                channel_id: targetChannelId,
                session_id: session.id,
                event_id: event.id,
                share_type: 'score',
                score,
                comment: payload.comment,
            });
        }
        return { event_id: event.id, session_id: session.id };
    }
    async shareAchievement(payload) {
        const session = await this.ensureSession(payload.channel_id);
        const event = await createGameEvent(this.gameId, session.id, {
            event_type: 'achievement',
            idempotency_key: payload.idempotency_key,
            achievement_code: payload.achievement_code,
            achievement_title: payload.achievement_title,
            payload: payload.payload,
        });
        const targetChannelId = payload.channel_id ?? this.channelId;
        if (targetChannelId && payload.share !== false) {
            await shareGameToChannel(this.gameId, {
                channel_id: targetChannelId,
                session_id: session.id,
                event_id: event.id,
                share_type: 'achievement',
                achievement: payload.achievement_title ?? payload.achievement_code,
                comment: payload.comment,
            });
        }
        return { event_id: event.id, session_id: session.id };
    }
    async shareGame(payload = {}) {
        const targetChannelId = payload.channel_id ?? this.channelId;
        if (!targetChannelId) {
            throw new GoPortalSDKServiceError('channel_id is required to share game card', 'ERR_CHANNEL_REQUIRED');
        }
        await shareGameToChannel(this.gameId, {
            channel_id: targetChannelId,
            share_type: 'game',
            comment: payload.comment,
        });
    }
    async shareSessionStart(payload = {}) {
        const session = await this.ensureSession(payload.channel_id);
        const targetChannelId = payload.channel_id ?? this.channelId;
        if (targetChannelId && payload.share !== false) {
            await shareGameToChannel(this.gameId, {
                channel_id: targetChannelId,
                session_id: session.id,
                share_type: 'game',
                comment: payload.comment,
            });
        }
        return { session_id: session.id };
    }
    async createRoom(payload = {}) {
        const room = await createGameRoom(this.gameId, payload);
        this.emit('room_updated', room);
        return room;
    }
    async joinRoom(roomId) {
        const room = await joinGameRoom(this.gameId, roomId);
        this.emit('room_updated', room);
        return room;
    }
    async leaveRoom(roomId) {
        const room = await leaveGameRoom(this.gameId, roomId);
        this.emit('room_updated', room);
        return room;
    }
    async sendState(payload) {
        if (!this.session) {
            throw new GoPortalSDKServiceError('SDK session is not initialized', 'ERR_NOT_READY');
        }
        await createGameEvent(this.gameId, this.session.id, {
            event_type: 'state',
            payload: {
                room_id: payload.room_id,
                state: payload.state,
                state_version: payload.state_version,
            },
        });
    }
    async getRoomState(roomId) {
        const room = await getGameRoomState(this.gameId, roomId);
        this.emit('room_updated', room);
        return room;
    }
    async updateRoom(payload) {
        return { updated: true, ...payload };
    }
    async leftRoom(_payload = {}) {
        return { left: true };
    }
    async getUser() {
        const userId = this.channelId ? `user-${this.channelId}` : 'guest';
        return {
            user_id: userId,
            display_name: userId,
            is_guest: userId === 'guest',
        };
    }
    async showAuthPrompt() {
        const user = await this.getUser();
        return { success: true, user };
    }
    async dataGet(key) {
        const storageKey = `goportal:sdk:data:${this.gameId}:${key}`;
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return { key, found: false };
        }
        return { key, found: true, value: JSON.parse(raw) };
    }
    async dataSet(key, value) {
        const storageKey = `goportal:sdk:data:${this.gameId}:${key}`;
        window.localStorage.setItem(storageKey, JSON.stringify(value));
        return { ok: true };
    }
    async dataRemove(key) {
        const storageKey = `goportal:sdk:data:${this.gameId}:${key}`;
        window.localStorage.removeItem(storageKey);
        return { ok: true };
    }
    async submitScore(payload) {
        const storageKey = `goportal:sdk:leaderboard:${this.gameId}:${payload.leaderboard_id}`;
        const raw = window.localStorage.getItem(storageKey);
        const rows = raw ? JSON.parse(raw) : [];
        const user = await this.getUser();
        rows.push({
            user_id: user.user_id,
            display_name: user.display_name ?? user.user_id,
            score: payload.score,
            metadata: payload.metadata,
            created_at: new Date().toISOString(),
        });
        rows.sort((a, b) => b.score - a.score);
        window.localStorage.setItem(storageKey, JSON.stringify(rows.slice(0, 200)));
        const rank = rows.findIndex((item) => item.user_id === user.user_id && item.score === payload.score) + 1;
        return { accepted: true, rank: rank > 0 ? rank : undefined };
    }
    async getLeaderboard(payload) {
        const storageKey = `goportal:sdk:leaderboard:${this.gameId}:${payload.leaderboard_id}`;
        const raw = window.localStorage.getItem(storageKey);
        const rows = raw ? JSON.parse(raw) : [];
        const entries = rows.slice(0, Math.max(1, Math.min(payload.limit ?? 20, 100))).map((item, idx) => ({
            rank: idx + 1,
            user_id: item.user_id,
            display_name: item.display_name,
            score: item.score,
            metadata: item.metadata,
            created_at: item.created_at,
        }));
        const meUser = await this.getUser();
        const me = entries.find((item) => item.user_id === meUser.user_id);
        return { leaderboard_id: payload.leaderboard_id, scope: payload.scope ?? 'global', entries, me };
    }
    on(event, listener) {
        const key = String(event);
        const next = this.listeners[key] ?? [];
        next.push(listener);
        this.listeners[key] = next;
        return () => {
            this.listeners[key] = (this.listeners[key] ?? []).filter((item) => item !== listener);
        };
    }
    async ensureSession(channelId) {
        if (this.session) {
            return this.session;
        }
        return this.init({ channel_id: channelId });
    }
    emit(event, payload) {
        const key = String(event);
        (this.listeners[key] ?? []).forEach((listener) => listener(payload));
    }
    get commands() {
        return {
            init: (payload) => this.init(payload ?? {}),
            shareScore: (payload) => this.shareScore(payload.score, {
                comment: payload.comment,
                channel_id: payload.channel_id,
                share: payload.share,
                idempotency_key: payload.idempotency_key,
                payload: payload.payload,
            }),
            shareAchievement: (payload) => this.shareAchievement(payload),
            shareGame: (payload) => this.shareGame(payload ?? {}),
            shareSessionStart: (payload) => this.shareSessionStart(payload ?? {}),
            createRoom: (payload) => this.createRoom(payload ?? {}),
            joinRoom: (payload) => this.joinRoom(payload.room_id),
            leaveRoom: (payload) => this.leaveRoom(payload.room_id),
            subscribeRoom: (payload) => Promise.resolve({
                subscribed: true,
                room_id: payload.room_id,
            }),
            getRoomState: (payload) => this.getRoomState(payload.room_id),
            sendState: (payload) => this.sendState(payload),
            updateRoom: (payload) => this.updateRoom(payload),
            leftRoom: (payload) => this.leftRoom(payload ?? {}),
            getUser: () => this.getUser(),
            showAuthPrompt: () => this.showAuthPrompt(),
            dataGet: (payload) => this.dataGet(payload.key),
            dataSet: (payload) => this.dataSet(payload.key, payload.value),
            dataRemove: (payload) => this.dataRemove(payload.key),
            submitScore: (payload) => this.submitScore(payload),
            getLeaderboard: (payload) => this.getLeaderboard(payload),
        };
    }
}
//# sourceMappingURL=game-sdk.js.map