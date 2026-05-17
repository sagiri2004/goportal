export type GameDTO = {
    id: string;
    owner_user_id: string;
    source_type: 'system' | 'community';
    title: string;
    slug: string;
    description?: string;
    visibility: 'public' | 'private';
    status: 'published' | 'disabled';
    publish_state: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended';
    category?: string;
    tags?: string[];
    age_rating?: string;
    featured_score: number;
    avg_rating: number;
    rating_count: number;
    launch_count: number;
    trending_score: number;
    thumbnail_url?: string;
    icon_url?: string;
    capsule_image_url?: string;
    hero_image_url?: string;
    screenshot_urls?: string[];
    trailer_url?: string;
    created_at: number;
    updated_at: number;
};
export type GameBuildDTO = {
    id: string;
    game_id: string;
    version: string;
    storage_zip_url: string;
    play_base_path: string;
    entry_file: string;
    file_size: number;
    checksum?: string;
    status: 'ready' | 'failed';
    error_message?: string;
    created_at: number;
    updated_at: number;
};
export type GameWithBuildDTO = {
    game: GameDTO;
    build?: GameBuildDTO;
};
export type PlaySessionDTO = {
    play_url: string;
    title: string;
    version: string;
    game_id: string;
    entry_file: string;
};
export type GameReviewDTO = {
    id: string;
    game_id: string;
    user_id: string;
    title?: string;
    content: string;
    rating_score?: number;
    status: 'visible' | 'hidden' | 'flagged';
    moderated_by?: string;
    moderated_at?: number;
    moderation_note?: string;
    helpful_count: number;
    created_at: number;
    updated_at: number;
};
export type GameRatingDTO = {
    id: string;
    game_id: string;
    user_id: string;
    score: number;
    created_at: number;
    updated_at: number;
};
export type GameCurationDTO = {
    id: string;
    game_id: string;
    curated_by: string;
    collection_key: string;
    priority: number;
    note?: string;
    starts_at?: number;
    ends_at?: number;
    is_active: boolean;
    created_at: number;
    updated_at: number;
};
export type GameSessionDTO = {
    id: string;
    game_id: string;
    user_id: string;
    channel_id?: string;
    room_id?: string;
    status: 'active' | 'ended' | 'expired';
    started_at: number;
    last_seen_at: number;
    ended_at?: number;
    created_at: number;
    updated_at: number;
};
export type GameEventDTO = {
    id: string;
    game_id: string;
    session_id: string;
    user_id: string;
    event_type: 'score' | 'achievement' | 'state' | 'session_end';
    idempotency_key?: string;
    score?: number;
    achievement_code?: string;
    achievement_title?: string;
    created_at: number;
    updated_at: number;
};
export type GameRoomMemberDTO = {
    id: string;
    room_id: string;
    user_id: string;
    role: 'host' | 'player';
    status: 'joined' | 'left';
    joined_at: number;
    left_at?: number;
    last_seen_at: number;
    created_at: number;
    updated_at: number;
};
export type GameRoomStateDTO = {
    room: {
        id: string;
        game_id: string;
        channel_id?: string;
        host_user_id: string;
        room_code: string;
        room_name?: string;
        status: 'open' | 'closed';
        max_players: number;
        current_state?: unknown;
        state_version: number;
        expires_at: number;
        last_active_at: number;
        created_at: number;
        updated_at: number;
        deleted_at: number;
    };
    members: GameRoomMemberDTO[];
};
export type GameMarketFilter = {
    source_type?: 'system' | 'community';
    q?: string;
    category?: string;
    sort?: 'trending' | 'top_rated' | 'newest' | 'most_played' | 'featured';
    limit?: number;
    offset?: number;
};
export declare const listGames: (filter?: GameMarketFilter) => Promise<GameWithBuildDTO[]>;
export declare const listTrendingGames: (filter?: {
    source_type?: "system" | "community";
    limit?: number;
}) => Promise<GameWithBuildDTO[]>;
export declare const searchGames: (filter: {
    q: string;
    source_type?: "system" | "community";
    limit?: number;
    offset?: number;
}) => Promise<GameWithBuildDTO[]>;
export declare const getGame: (id: string) => Promise<GameWithBuildDTO>;
export declare const createGame: (payload: {
    title: string;
    slug: string;
    description?: string;
    visibility?: "public" | "private";
    thumbnail_url?: string;
    icon_url?: string;
    capsule_image_url?: string;
    hero_image_url?: string;
    screenshot_urls?: string[];
    trailer_url?: string;
    category?: string;
    tags?: string[];
    age_rating?: string;
}) => Promise<GameDTO>;
export declare const createSystemGame: (payload: {
    title: string;
    slug: string;
    description?: string;
    visibility?: "public" | "private";
    thumbnail_url?: string;
    icon_url?: string;
    capsule_image_url?: string;
    hero_image_url?: string;
    screenshot_urls?: string[];
    trailer_url?: string;
    category?: string;
    tags?: string[];
    age_rating?: string;
}) => Promise<GameDTO>;
export declare const submitGameForReview: (gameId: string) => Promise<GameDTO>;
export declare const updateGamePublishState: (gameId: string, payload: {
    publish_state: "draft" | "pending_review" | "published" | "rejected" | "suspended";
    note?: string;
}) => Promise<GameDTO>;
export declare const featureGame: (gameId: string, payload: {
    collection_key?: string;
    priority: number;
    note?: string;
    starts_at?: number;
    ends_at?: number;
    is_active: boolean;
}) => Promise<GameCurationDTO>;
export declare const listMyGames: () => Promise<GameWithBuildDTO[]>;
export declare const listReviewQueue: (params?: {
    limit?: number;
    offset?: number;
}) => Promise<GameWithBuildDTO[]>;
export declare const uploadGameBuild: (gameId: string, file: File, version?: string) => Promise<GameBuildDTO>;
export declare const createPlaySession: (gameId: string) => Promise<PlaySessionDTO>;
export declare const rateGame: (gameId: string, score: number) => Promise<GameRatingDTO>;
export declare const createReview: (gameId: string, payload: {
    title?: string;
    content: string;
    score?: number;
}) => Promise<GameReviewDTO>;
export declare const listReviews: (gameId: string, params?: {
    status?: "visible" | "hidden" | "flagged";
    limit?: number;
    offset?: number;
}) => Promise<GameReviewDTO[]>;
export declare const moderateReview: (reviewId: string, payload: {
    status: "visible" | "hidden" | "flagged";
    note?: string;
}) => Promise<GameReviewDTO>;
export declare const reportGame: (gameId: string, payload: {
    reason: string;
    detail?: string;
}) => Promise<{
    id: string;
    game_id: string;
    reporter_user_id: string;
    reason: string;
    detail?: string;
    status: string;
    created_at: number;
}>;
export declare const startGameSession: (gameId: string, payload?: {
    channel_id?: string;
    room_id?: string;
    metadata?: unknown;
}) => Promise<GameSessionDTO>;
export declare const createGameEvent: (gameId: string, sessionId: string, payload: {
    event_type: "score" | "achievement" | "state" | "session_end";
    idempotency_key?: string;
    score?: number;
    achievement_code?: string;
    achievement_title?: string;
    payload?: unknown;
}) => Promise<GameEventDTO>;
export declare const shareGameToChannel: (gameId: string, payload: {
    channel_id: string;
    session_id?: string;
    event_id?: string;
    share_type?: "game" | "score" | "achievement" | "room";
    room_id?: string;
    room_name?: string;
    score?: number;
    achievement?: string;
    comment?: string;
}) => Promise<void>;
export declare const createGameRoom: (gameId: string, payload?: {
    channel_id?: string;
    room_name?: string;
    max_players?: number;
}) => Promise<GameRoomStateDTO>;
export declare const joinGameRoom: (gameId: string, roomId: string) => Promise<GameRoomStateDTO>;
export declare const leaveGameRoom: (gameId: string, roomId: string) => Promise<GameRoomStateDTO>;
export declare const getGameRoomState: (gameId: string, roomId: string) => Promise<GameRoomStateDTO>;
export declare const listOpenGameRooms: (gameId: string, params?: {
    limit?: number;
    offset?: number;
}) => Promise<GameRoomStateDTO[]>;
//# sourceMappingURL=games.d.ts.map