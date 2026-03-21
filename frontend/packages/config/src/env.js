// packages/config/src/env.ts
// All environment variable access lives here.
// Never access import.meta.env.* directly in components, hooks, or repos.
export const IS_DEV = import.meta.env.DEV;
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
export const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8085/ws';
export const LK_URL = import.meta.env.VITE_LIVEKIT_URL ?? 'ws://localhost:7880';
//# sourceMappingURL=env.js.map