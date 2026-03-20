import { apiClient } from '../lib/api-client';
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
    iconUrl: server.icon_url ?? undefined,
    bannerUrl: server.banner_url ?? undefined,
    boostLevel: undefined,
});
export const getServers = async () => {
    const servers = await apiClient.get('/api/v1/servers');
    return servers.map(mapServer);
};
export const getServerById = async (serverId) => {
    try {
        const server = await apiClient.get(`/api/v1/servers/${serverId}`);
        return mapServer(server);
    }
    catch {
        return null;
    }
};
export const createServer = async (body) => {
    const server = await apiClient.post('/api/v1/servers', body);
    return mapServer(server);
};
export const joinServer = async (serverId) => {
    await apiClient.post(`/api/v1/servers/${serverId}/join`);
};
//# sourceMappingURL=servers.js.map