import { create } from 'zustand';
const initialSession = {
    connectionState: 'idle',
    serverId: null,
    serverName: null,
    channelId: null,
    channelName: null,
    room: null,
    lastTextChannelId: null,
    isMicrophoneEnabled: false,
    isCameraEnabled: false,
    isScreenShareEnabled: false,
    errorMessage: null,
};
export const useVoiceSessionStore = create((set) => ({
    session: initialSession,
    setConnecting: (serverId, channelId) => set((state) => ({
        session: {
            ...state.session,
            connectionState: 'connecting',
            serverId,
            channelId,
            errorMessage: null,
        },
    })),
    setConnected: (next) => set({
        session: {
            connectionState: 'connected',
            serverId: next.serverId,
            serverName: next.serverName,
            channelId: next.channelId,
            channelName: next.channelName,
            room: next.room,
            lastTextChannelId: next.lastTextChannelId,
            isMicrophoneEnabled: next.isMicrophoneEnabled,
            isCameraEnabled: next.isCameraEnabled,
            isScreenShareEnabled: next.isScreenShareEnabled,
            errorMessage: null,
        },
    }),
    setError: (message) => set((state) => ({
        session: {
            ...state.session,
            connectionState: 'error',
            errorMessage: message,
        },
    })),
    patchMediaState: (next) => set((state) => ({
        session: {
            ...state.session,
            ...next,
        },
    })),
    clear: () => set({ session: initialSession }),
}));
//# sourceMappingURL=voice-session.store.js.map