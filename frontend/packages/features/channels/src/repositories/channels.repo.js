import { apiClient } from '@goportal/services';
import { shouldUseMockData } from '@goportal/config';
import { mockChannelsData, simulateDelay } from '../mockData';
/**
 * Channels Repository
 * Supports Real API (default) and Mock Data (via VITE_USE_MOCK_DATA env)
 *
 * Usage:
 * - npm run dev:web (default, real API)
 * - npm run dev:web:mock (mock data, no backend needed)
 */
export const channelsRepo = {
    /**
     * Get all channels for a server
     * Endpoint: GET /api/v1/servers/:serverId/channels
     */
    async getChannels(serverId) {
        if (shouldUseMockData()) {
            await simulateDelay();
            return mockChannelsData.filter(c => c.server_id === serverId);
        }
        try {
            const response = await apiClient.get(`/api/v1/servers/${serverId}/channels`);
            return response.data.data || [];
        }
        catch (error) {
            // Fallback to mock
            console.warn('[Channels] API error, falling back to mock:', error);
            await simulateDelay();
            return mockChannelsData.filter(c => c.server_id === serverId);
        }
    },
    /**
     * Get single channel by ID
     * Endpoint: GET /api/v1/channels/:id
     */
    async getChannel(channelId) {
        if (shouldUseMockData()) {
            const channel = mockChannelsData.find(c => c.id === channelId);
            if (!channel)
                throw new Error('Channel not found');
            return channel;
        }
        try {
            const response = await apiClient.get(`/api/v1/channels/${channelId}`);
            return response.data.data;
        }
        catch (error) {
            const channel = mockChannelsData.find(c => c.id === channelId);
            if (!channel)
                throw new Error('Channel not found');
            return channel;
        }
    },
    /**
     * Create new channel
     * Endpoint: POST /api/v1/servers/:serverId/channels
     */
    async createChannel(serverId, body) {
        if (shouldUseMockData()) {
            await simulateDelay();
            const newChannel = {
                id: `c${Date.now()}`,
                server_id: serverId,
                name: body.name,
                type: body.type,
                position: body.position ?? mockChannelsData.filter(c => c.server_id === serverId).length,
                is_private: false,
                parent_id: body.parent_id,
            };
            mockChannelsData.push(newChannel);
            return newChannel;
        }
        try {
            const response = await apiClient.post(`/api/v1/servers/${serverId}/channels`, body);
            return response.data.data;
        }
        catch (error) {
            // Fallback to mock
            console.warn('[Channels] Create error, falling back to mock:', error);
            await simulateDelay();
            const newChannel = {
                id: `c${Date.now()}`,
                server_id: serverId,
                name: body.name,
                type: body.type,
                position: body.position ?? mockChannelsData.filter(c => c.server_id === serverId).length,
                is_private: false,
                parent_id: body.parent_id,
            };
            mockChannelsData.push(newChannel);
            return newChannel;
        }
    },
    /**
     * Update channel
     * Endpoint: PATCH /api/v1/channels/:id
     */
    async updateChannel(channelId, updates) {
        try {
            const response = await apiClient.patch(`/api/v1/channels/${channelId}`, updates);
            return response.data.data;
        }
        catch (error) {
            const channel = mockChannelsData.find(c => c.id === channelId);
            if (!channel)
                throw new Error('Channel not found');
            Object.assign(channel, updates);
            return channel;
        }
    },
    /**
     * Delete channel
     * Endpoint: DELETE /api/v1/channels/:id
     */
    async deleteChannel(channelId) {
        try {
            await apiClient.delete(`/api/v1/channels/${channelId}`);
        }
        catch (error) {
            const index = mockChannelsData.findIndex(c => c.id === channelId);
            if (index === -1)
                throw new Error('Channel not found');
            mockChannelsData.splice(index, 1);
        }
    },
};
//# sourceMappingURL=channels.repo.js.map