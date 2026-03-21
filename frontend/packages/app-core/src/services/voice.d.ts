export type VoiceTokenResponse = {
    token: string;
    url: string;
};
export type RecordingItem = {
    id: string;
    channel_id: string;
    server_id: string;
    started_by: string;
    egress_id: string;
    type: string;
    status: string;
    file_url?: string;
    rtmp_url?: string;
    duration_seconds?: number;
    started_at: number;
    ended_at?: number;
    created_at: number;
};
export type VoiceParticipantSnapshot = {
    user_id: string;
    name: string;
    avatar_url?: string;
    is_screen_sharing?: boolean;
};
export declare const getVoiceToken: (channelId: string) => Promise<VoiceTokenResponse>;
export declare const listVoiceParticipants: (channelId: string) => Promise<{
    items: VoiceParticipantSnapshot[];
}>;
export declare const startChannelRecording: (channelId: string) => Promise<RecordingItem>;
export declare const stopChannelRecording: (channelId: string) => Promise<RecordingItem>;
export declare const listChannelRecordings: (channelId: string, opts?: {
    limit?: number;
    offset?: number;
}) => Promise<{
    items: RecordingItem[];
    limit: number;
    offset: number;
}>;
export declare const startChannelStream: (channelId: string, rtmpURL: string) => Promise<RecordingItem>;
export declare const stopChannelStream: (channelId: string) => Promise<RecordingItem>;
//# sourceMappingURL=voice.d.ts.map