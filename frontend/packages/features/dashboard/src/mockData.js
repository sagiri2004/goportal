// ============================================================================
// Auth Mock Data
// ============================================================================
export const mockAuthUser = {
    id: "8d3f6506-6569-4b31-a74a-d9d43c359ee5",
    username: "zutomayo",
    is_admin: false,
};
export const mockLoginResponse = {
    user: mockAuthUser,
    token: "mock-jwt-token-for-development",
};
export const simulateDelay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));
// ============================================================================
// Dashboard Mock Data
// ============================================================================
export const mockCurrentUser = {
    id: "u1",
    username: "zutomayo",
    avatarColor: "#6366f1",
    status: "online",
};
export const mockServers = [
    { id: "s1", name: "Discord Clone Devs", initials: "DC" },
    { id: "s2", name: "LiveKit Lab", initials: "LK" },
    { id: "s3", name: "Friends", initials: "FR" },
];
export const mockChannels = [
    { id: "c1", serverId: "s1", name: "general", type: "text" },
    { id: "c2", serverId: "s1", name: "random", type: "text" },
    { id: "c3", serverId: "s1", name: "voice-channel", type: "voice" },
    { id: "c4", serverId: "s2", name: "sdk-help", type: "text" },
];
export const mockUsers = [
    mockCurrentUser,
    { id: "u2", username: "alice", avatarColor: "#f97316", status: "online" },
    { id: "u3", username: "bob", avatarColor: "#22c55e", status: "idle" },
    { id: "u4", username: "charlie", avatarColor: "#e11d48", status: "offline" },
];
export const mockMessages = [
    {
        id: "m1",
        channelId: "c1",
        authorId: "u2",
        content: "Welcome to the Discord clone!",
        timestamp: "10:01",
    },
    {
        id: "m2",
        channelId: "c1",
        authorId: "u1",
        content: "We are wiring LiveKit next.",
        timestamp: "10:02",
    },
    {
        id: "m3",
        channelId: "c1",
        authorId: "u3",
        content: "Tailwind dark mode looks great.",
        timestamp: "10:05",
    },
];
//# sourceMappingURL=mockData.js.map