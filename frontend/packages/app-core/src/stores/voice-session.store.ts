import { create } from 'zustand'
import type { Room } from 'livekit-client'

export type VoiceConnectionState = 'idle' | 'connecting' | 'connected' | 'error'

export type VoiceSession = {
  connectionState: VoiceConnectionState
  serverId: string | null
  serverName: string | null
  channelId: string | null
  channelName: string | null
  room: Room | null
  lastTextChannelId: string | null
  isMicrophoneEnabled: boolean
  isCameraEnabled: boolean
  isScreenShareEnabled: boolean
  errorMessage: string | null
}

type VoiceSessionStore = {
  session: VoiceSession
  setConnecting: (serverId: string, channelId: string) => void
  setConnected: (next: {
    serverId: string
    serverName: string
    channelId: string
    channelName: string
    room: Room
    lastTextChannelId: string | null
    isMicrophoneEnabled: boolean
    isCameraEnabled: boolean
    isScreenShareEnabled: boolean
  }) => void
  setError: (message: string | null) => void
  patchMediaState: (next: {
    isMicrophoneEnabled: boolean
    isCameraEnabled: boolean
    isScreenShareEnabled: boolean
  }) => void
  clear: () => void
}

const initialSession: VoiceSession = {
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
}

export const useVoiceSessionStore = create<VoiceSessionStore>((set) => ({
  session: initialSession,
  setConnecting: (serverId, channelId) =>
    set((state) => ({
      session: {
        ...state.session,
        connectionState: 'connecting',
        serverId,
        channelId,
        errorMessage: null,
      },
    })),
  setConnected: (next) =>
    set({
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
  setError: (message) =>
    set((state) => ({
      session: {
        ...state.session,
        connectionState: 'error',
        errorMessage: message,
      },
    })),
  patchMediaState: (next) =>
    set((state) => ({
      session: {
        ...state.session,
        ...next,
      },
    })),
  clear: () => set({ session: initialSession }),
}))

