import type { Room } from 'livekit-client';
export type VoiceConnectionState = 'idle' | 'connecting' | 'connected' | 'error';
export type VoiceSession = {
    connectionState: VoiceConnectionState;
    serverId: string | null;
    serverName: string | null;
    channelId: string | null;
    channelName: string | null;
    room: Room | null;
    lastTextChannelId: string | null;
    isMicrophoneEnabled: boolean;
    isCameraEnabled: boolean;
    isScreenShareEnabled: boolean;
    errorMessage: string | null;
};
type VoiceSessionStore = {
    session: VoiceSession;
    setConnecting: (serverId: string, channelId: string) => void;
    setConnected: (next: {
        serverId: string;
        serverName: string;
        channelId: string;
        channelName: string;
        room: Room;
        lastTextChannelId: string | null;
        isMicrophoneEnabled: boolean;
        isCameraEnabled: boolean;
        isScreenShareEnabled: boolean;
    }) => void;
    setError: (message: string | null) => void;
    patchMediaState: (next: {
        isMicrophoneEnabled: boolean;
        isCameraEnabled: boolean;
        isScreenShareEnabled: boolean;
    }) => void;
    clear: () => void;
};
export declare const useVoiceSessionStore: import("zustand").UseBoundStore<import("zustand").StoreApi<VoiceSessionStore>>;
export {};
//# sourceMappingURL=voice-session.store.d.ts.map