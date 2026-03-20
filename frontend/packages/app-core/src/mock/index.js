export const IS_MOCK_AUTH = false;
export const IS_MOCK_SERVERS = false;
export const IS_MOCK_CHANNELS = false;
export const IS_MOCK_MEMBERS = false;
export const IS_MOCK_MESSAGES = false;
// Backward-compatible aggregate flag.
export const IS_MOCK = IS_MOCK_AUTH &&
    IS_MOCK_SERVERS &&
    IS_MOCK_CHANNELS &&
    IS_MOCK_MEMBERS &&
    IS_MOCK_MESSAGES;
export * from './servers';
export * from './messages';
export * from './members';
export * from './user';
//# sourceMappingURL=index.js.map