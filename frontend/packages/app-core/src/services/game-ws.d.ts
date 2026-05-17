export type GameRoomRealtimeEvent = {
    event_id: string;
    event_type: string;
    occurred_at: string;
    game_id: string;
    room_id: string;
    actor_user_id: string;
    member_user_ids: string[];
    channel_id?: string;
    room_status: string;
    state_version: number;
    state?: unknown;
};
type Listener = (event: GameRoomRealtimeEvent) => void;
export declare class GameWsClient {
    private readonly token;
    private readonly wsURL;
    private ws;
    private listeners;
    private subscribedRooms;
    private outboundQueue;
    private reconnectTimer;
    private closedByClient;
    private reconnectAttempt;
    private processedEventIDs;
    constructor(token: string, wsURL?: string);
    connect(): void;
    disconnect(): void;
    subscribeRoom(roomId: string): void;
    publishState(input: {
        game_id: string;
        room_id: string;
        state: unknown;
        state_version: number;
        room_status?: string;
        channel_id?: string;
    }): boolean;
    onRoomEvent(listener: Listener): () => void;
    private connectInternal;
    private send;
    private flushQueue;
}
export {};
//# sourceMappingURL=game-ws.d.ts.map