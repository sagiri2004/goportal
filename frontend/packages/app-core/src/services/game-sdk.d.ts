import { type GameRoomStateDTO, type GameSessionDTO } from './games';
type SDKEventMap = {
    session_started: GameSessionDTO;
    room_updated: GameRoomStateDTO;
};
type SDKListener<T> = (payload: T) => void;
type SDKErrorCode = 'ERR_BAD_REQUEST' | 'ERR_TIMEOUT' | 'ERR_UNAUTHORIZED' | 'ERR_CHANNEL_REQUIRED' | 'ERR_ROOM_REQUIRED' | 'ERR_NOT_READY' | 'ERR_UNSUPPORTED_ACTION' | 'ERR_INTERNAL';
type SDKCapabilities = {
    share_score: boolean;
    share_achievement: boolean;
    share_game: boolean;
    share_session_start?: boolean;
    rooms: boolean;
    room_state_sync: boolean;
    user_profile?: boolean;
    cloud_data?: boolean;
    leaderboard?: boolean;
    room_presence?: boolean;
    join_room_intent?: boolean;
};
export declare class GoPortalSDKServiceError extends Error {
    code: SDKErrorCode;
    retryable: boolean;
    constructor(message: string, code: SDKErrorCode, retryable?: boolean);
}
export declare class GoPortalGameSDK {
    private readonly gameId;
    private readonly channelId?;
    private session;
    private listeners;
    private readonly capabilities;
    private readonly protocolVersion;
    constructor(gameId: string, channelId?: string | undefined);
    init(payload?: {
        channel_id?: string;
        room_id?: string;
        metadata?: unknown;
    }): Promise<GameSessionDTO>;
    ready(): Promise<{
        protocol_version: string;
        capabilities: SDKCapabilities;
        context: {
            game_id: string;
            channel_id: string | undefined;
        };
    }>;
    shareScore(score: number, payload?: {
        comment?: string;
        channel_id?: string;
        share?: boolean;
        idempotency_key?: string;
        payload?: unknown;
    }): Promise<{
        event_id: string;
        session_id: string;
    }>;
    shareAchievement(payload: {
        achievement_code?: string;
        achievement_title?: string;
        comment?: string;
        channel_id?: string;
        share?: boolean;
        idempotency_key?: string;
        payload?: unknown;
    }): Promise<{
        event_id: string;
        session_id: string;
    }>;
    shareGame(payload?: {
        channel_id?: string;
        comment?: string;
    }): Promise<void>;
    shareSessionStart(payload?: {
        channel_id?: string;
        comment?: string;
        share?: boolean;
    }): Promise<{
        session_id: string;
    }>;
    createRoom(payload?: {
        channel_id?: string;
        room_name?: string;
        max_players?: number;
    }): Promise<GameRoomStateDTO>;
    joinRoom(roomId: string): Promise<GameRoomStateDTO>;
    leaveRoom(roomId: string): Promise<GameRoomStateDTO>;
    sendState(payload: {
        room_id: string;
        state: unknown;
        state_version?: number;
    }): Promise<void>;
    getRoomState(roomId: string): Promise<GameRoomStateDTO>;
    updateRoom(payload: {
        room_id: string;
        is_joinable?: boolean;
        invite_params?: Record<string, unknown>;
        metadata?: unknown;
    }): Promise<{
        room_id: string;
        is_joinable?: boolean;
        invite_params?: Record<string, unknown>;
        metadata?: unknown;
        updated: boolean;
    }>;
    leftRoom(_payload?: {
        room_id?: string;
    }): Promise<{
        left: boolean;
    }>;
    getUser(): Promise<{
        user_id: string;
        display_name: string;
        is_guest: boolean;
    }>;
    showAuthPrompt(): Promise<{
        success: boolean;
        user: {
            user_id: string;
            display_name: string;
            is_guest: boolean;
        };
    }>;
    dataGet(key: string): Promise<{
        key: string;
        found: boolean;
        value?: undefined;
    } | {
        key: string;
        found: boolean;
        value: any;
    }>;
    dataSet(key: string, value: unknown): Promise<{
        ok: boolean;
    }>;
    dataRemove(key: string): Promise<{
        ok: boolean;
    }>;
    submitScore(payload: {
        leaderboard_id: string;
        score: number;
        metadata?: unknown;
    }): Promise<{
        accepted: boolean;
        rank: number | undefined;
    }>;
    getLeaderboard(payload: {
        leaderboard_id: string;
        scope?: 'global' | 'friends' | 'channel';
        limit?: number;
    }): Promise<{
        leaderboard_id: string;
        scope: "friends" | "channel" | "global";
        entries: {
            rank: number;
            user_id: string;
            display_name: string;
            score: number;
            metadata: unknown;
            created_at: string;
        }[];
        me: {
            rank: number;
            user_id: string;
            display_name: string;
            score: number;
            metadata: unknown;
            created_at: string;
        } | undefined;
    }>;
    on<K extends keyof SDKEventMap>(event: K, listener: SDKListener<SDKEventMap[K]>): () => void;
    private ensureSession;
    private emit;
    get commands(): {
        init: (payload?: {
            channel_id?: string;
            room_id?: string;
            metadata?: unknown;
        }) => Promise<GameSessionDTO>;
        shareScore: (payload: {
            score: number;
            comment?: string;
            channel_id?: string;
            share?: boolean;
            idempotency_key?: string;
            payload?: unknown;
        }) => Promise<{
            event_id: string;
            session_id: string;
        }>;
        shareAchievement: (payload: {
            achievement_code?: string;
            achievement_title?: string;
            comment?: string;
            channel_id?: string;
            share?: boolean;
            idempotency_key?: string;
            payload?: unknown;
        }) => Promise<{
            event_id: string;
            session_id: string;
        }>;
        shareGame: (payload?: {
            channel_id?: string;
            comment?: string;
        }) => Promise<void>;
        shareSessionStart: (payload?: {
            channel_id?: string;
            comment?: string;
            share?: boolean;
        }) => Promise<{
            session_id: string;
        }>;
        createRoom: (payload?: {
            channel_id?: string;
            room_name?: string;
            max_players?: number;
        }) => Promise<GameRoomStateDTO>;
        joinRoom: (payload: {
            room_id: string;
        }) => Promise<GameRoomStateDTO>;
        leaveRoom: (payload: {
            room_id: string;
        }) => Promise<GameRoomStateDTO>;
        subscribeRoom: (payload: {
            room_id: string;
        }) => Promise<{
            subscribed: boolean;
            room_id: string;
        }>;
        getRoomState: (payload: {
            room_id: string;
        }) => Promise<GameRoomStateDTO>;
        sendState: (payload: {
            room_id: string;
            state: unknown;
            state_version?: number;
        }) => Promise<void>;
        updateRoom: (payload: {
            room_id: string;
            is_joinable?: boolean;
            invite_params?: Record<string, unknown>;
            metadata?: unknown;
        }) => Promise<{
            room_id: string;
            is_joinable?: boolean;
            invite_params?: Record<string, unknown>;
            metadata?: unknown;
            updated: boolean;
        }>;
        leftRoom: (payload?: {
            room_id?: string;
        }) => Promise<{
            left: boolean;
        }>;
        getUser: () => Promise<{
            user_id: string;
            display_name: string;
            is_guest: boolean;
        }>;
        showAuthPrompt: () => Promise<{
            success: boolean;
            user: {
                user_id: string;
                display_name: string;
                is_guest: boolean;
            };
        }>;
        dataGet: (payload: {
            key: string;
        }) => Promise<{
            key: string;
            found: boolean;
            value?: undefined;
        } | {
            key: string;
            found: boolean;
            value: any;
        }>;
        dataSet: (payload: {
            key: string;
            value: unknown;
        }) => Promise<{
            ok: boolean;
        }>;
        dataRemove: (payload: {
            key: string;
        }) => Promise<{
            ok: boolean;
        }>;
        submitScore: (payload: {
            leaderboard_id: string;
            score: number;
            metadata?: unknown;
        }) => Promise<{
            accepted: boolean;
            rank: number | undefined;
        }>;
        getLeaderboard: (payload: {
            leaderboard_id: string;
            scope?: "global" | "friends" | "channel";
            limit?: number;
        }) => Promise<{
            leaderboard_id: string;
            scope: "friends" | "channel" | "global";
            entries: {
                rank: number;
                user_id: string;
                display_name: string;
                score: number;
                metadata: unknown;
                created_at: string;
            }[];
            me: {
                rank: number;
                user_id: string;
                display_name: string;
                score: number;
                metadata: unknown;
                created_at: string;
            } | undefined;
        }>;
    };
}
export {};
//# sourceMappingURL=game-sdk.d.ts.map