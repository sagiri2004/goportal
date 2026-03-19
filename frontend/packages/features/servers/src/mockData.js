export const simulateDelay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));
// ============================================================================
// Servers Mock Data
// ============================================================================
export const mockServersData = [
    {
        id: 's1',
        name: 'Discord Clone Devs',
        owner_id: 'u1',
        is_public: true,
        default_role_id: 'role1',
    },
    {
        id: 's2',
        name: 'LiveKit Lab',
        owner_id: 'u2',
        is_public: false,
        default_role_id: 'role2',
    },
    {
        id: 's3',
        name: 'Friends',
        owner_id: 'u1',
        is_public: true,
        default_role_id: 'role3',
    },
];
export const mockChannelsData = [
    {
        id: 'c1',
        server_id: 's1',
        name: 'general',
        type: 'TEXT',
        position: 0,
        is_private: false,
    },
    {
        id: 'c2',
        server_id: 's1',
        name: 'random',
        type: 'TEXT',
        position: 1,
        is_private: false,
    },
    {
        id: 'c3',
        server_id: 's1',
        name: 'voice-channel',
        type: 'VOICE',
        position: 2,
        is_private: false,
    },
    {
        id: 'c4',
        server_id: 's2',
        name: 'sdk-help',
        type: 'TEXT',
        position: 0,
        is_private: false,
    },
];
// Helper to get server initials
export const getServerInitials = (name) => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};
//# sourceMappingURL=mockData.js.map