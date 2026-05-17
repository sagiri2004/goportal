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
    setConnecting: (serverId, channelId) => set((state) => {
        const current = state.session;
        if (current.connectionState === 'connecting' &&
            current.serverId === serverId &&
            current.channelId === channelId &&
            current.errorMessage == null) {
            return state;
        }
        return {
            session: {
                ...current,
                connectionState: 'connecting',
                serverId,
                channelId,
                errorMessage: null,
            },
        };
    }),
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
    setError: (message) => set((state) => {
        const current = state.session;
        if (current.connectionState === 'error' && current.errorMessage === message) {
            return state;
        }
        return {
            session: {
                ...current,
                connectionState: 'error',
                errorMessage: message,
            },
        };
    }),
    patchMediaState: (next) => set((state) => {
        const current = state.session;
        if (current.isMicrophoneEnabled === next.isMicrophoneEnabled &&
            current.isCameraEnabled === next.isCameraEnabled &&
            current.isScreenShareEnabled === next.isScreenShareEnabled) {
            return state;
        }
        return {
            session: {
                ...current,
                ...next,
            },
        };
    }),
    clear: () => set({ session: initialSession }),
}));
//# sourceMappingURL=voice-session.store.js.map