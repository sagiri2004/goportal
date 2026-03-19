import { apiClient } from '@goportal/services';
import { shouldUseMockData } from '@goportal/config';
import { mockServersData, simulateDelay } from '../mockData';
/**
 * Servers Repository
 * Supports Real API (default) and Mock Data (via VITE_USE_MOCK_DATA env)
 *
 * Usage:
 * - npm run dev:web (default, real API)
 * - npm run dev:web:mock (mock data, no backend needed)
 */
export const serversRepo = {
    /**
     * Get all servers for current user
     * Endpoint: GET /api/v1/servers
     */
    async getServers() {
        // Use mock if flag enabled
        if (shouldUseMockData()) {
            await simulateDelay();
            return mockServersData;
        }
        try {
            const response = await apiClient.get('/api/v1/servers');
            return response.data.data || [];
        }
        catch (error) {
            // Fallback to mock if backend not available
            console.warn('[Servers] API error, falling back to mock:', error);
            await simulateDelay();
            return mockServersData;
        }
    },
    /**
     * Get single server by ID
     * Endpoint: GET /api/v1/servers/:id
     */
    async getServer(serverId) {
        if (shouldUseMockData()) {
            const server = mockServersData.find(s => s.id === serverId);
            if (!server)
                throw new Error('Server not found');
            return server;
        }
        try {
            const response = await apiClient.get(`/api/v1/servers/${serverId}`);
            return response.data.data;
        }
        catch (error) {
            const server = mockServersData.find(s => s.id === serverId);
            if (!server)
                throw new Error('Server not found');
            return server;
        }
    },
    /**
     * Create new server
     * Endpoint: POST /api/v1/servers
     */
    async createServer(body) {
        if (shouldUseMockData()) {
            await simulateDelay();
            const newServer = {
                id: `s${Date.now()}`,
                name: body.name,
                owner_id: 'current-user-id',
                is_public: body.is_public,
                default_role_id: 'default-role',
            };
            mockServersData.push(newServer);
            return newServer;
        }
        try {
            const response = await apiClient.post('/api/v1/servers', body);
            return response.data.data;
        }
        catch (error) {
            // Fallback to mock
            console.warn('[Servers] Create error, falling back to mock:', error);
            await simulateDelay();
            const newServer = {
                id: `s${Date.now()}`,
                name: body.name,
                owner_id: 'current-user-id',
                is_public: body.is_public,
                default_role_id: 'default-role',
            };
            mockServersData.push(newServer);
            return newServer;
        }
    },
    /**
     * Update server
     * Endpoint: PATCH /api/v1/servers/:id
     */
    async updateServer(serverId, updates) {
        try {
            const response = await apiClient.patch(`/api/v1/servers/${serverId}`, updates);
            return response.data.data;
        }
        catch (error) {
            const server = mockServersData.find(s => s.id === serverId);
            if (!server)
                throw new Error('Server not found');
            Object.assign(server, updates);
            return server;
        }
    },
    /**
     * Delete server
     * Endpoint: DELETE /api/v1/servers/:id
     */
    async deleteServer(serverId) {
        try {
            await apiClient.delete(`/api/v1/servers/${serverId}`);
        }
        catch (error) {
            const index = mockServersData.findIndex(s => s.id === serverId);
            if (index === -1)
                throw new Error('Server not found');
            mockServersData.splice(index, 1);
        }
    },
};
//# sourceMappingURL=servers.repo.js.map