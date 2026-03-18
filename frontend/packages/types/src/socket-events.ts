// packages/types/src/socket-events.ts
// Centralised socket event name constants. Always import from here — never inline strings.

export const SOCKET_EVENTS = {
    // Messages
    MESSAGE_CREATE: 'message:create',
    MESSAGE_UPDATE: 'message:update',
    MESSAGE_DELETE: 'message:delete',
    // Typing
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
    // Presence
    PRESENCE_UPDATE: 'presence:update',
    USER_ONLINE: 'user:online',
    USER_OFFLINE: 'user:offline',
    // Voice
    VOICE_JOIN: 'voice:join',
    VOICE_LEAVE: 'voice:leave',
} as const

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS]
