import { apiClient } from '../lib/api-client';
import { IS_MOCK } from '../mock';
import { mockServers, mockServersData } from '../mock/servers';
import { simulateDelay } from '../mock/user';
const deriveInitials = (name) => name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
const palette = [
    'bg-indigo-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-rose-500',
];
const pickColor = (id) => {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
        hash = (hash + id.charCodeAt(index)) % 997;
    }
    return palette[hash % palette.length];
};
const mapServer = (server) => ({
    id: server.id,
    name: server.name,
    initials: deriveInitials(server.name),
    color: pickColor(server.id),
    iconUrl: undefined,
    bannerUrl: undefined,
    boostLevel: undefined,
});
export const getServers = async () => {
    if (IS_MOCK) {
        await simulateDelay();
        return mockServers;
    }
    const servers = await apiClient.get('/api/v1/servers');
    return servers.map(mapServer);
};
export const getServerById = async (serverId) => {
    if (IS_MOCK) {
        await simulateDelay(180);
        return mockServers.find((server) => server.id === serverId) ?? null;
    }
    try {
        const server = await apiClient.get(`/api/v1/servers/${serverId}`);
        return mapServer(server);
    }
    catch {
        return null;
    }
};
export const createServer = async (body) => {
    if (IS_MOCK) {
        await simulateDelay();
        const server = {
            id: `s-${Date.now()}`,
            name: body.name,
            initials: deriveInitials(body.name),
            color: 'bg-indigo-500',
            bannerUrl: undefined,
            iconUrl: undefined,
            boostLevel: undefined,
        };
        mockServers.push(server);
        mockServersData.push({
            id: server.id,
            name: server.name,
            owner_id: 'mock-owner',
            is_public: body.is_public,
            default_role_id: 'mock-default-role',
        });
        return server;
    }
    const server = await apiClient.post('/api/v1/servers', body);
    return mapServer(server);
};
export const joinServer = async (serverId) => {
    if (IS_MOCK) {
        await simulateDelay(150);
        return;
    }
    await apiClient.post(`/api/v1/servers/${serverId}/join`);
};
//# sourceMappingURL=servers.js.map