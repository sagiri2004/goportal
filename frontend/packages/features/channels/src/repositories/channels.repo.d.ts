import type { ChannelDTO, CreateChannelRequest } from '@goportal/types';
/**
 * Channels Repository
 * Supports Real API (default) and Mock Data (via VITE_USE_MOCK_DATA env)
 *
 * Usage:
 * - npm run dev:web (default, real API)
 * - npm run dev:web:mock (mock data, no backend needed)
 */
export declare const channelsRepo: {
    /**
     * Get all channels for a server
     * Endpoint: GET /api/v1/servers/:serverId/channels
     */
    getChannels(serverId: string): Promise<ChannelDTO[]>;
    /**
     * Get single channel by ID
     * Endpoint: GET /api/v1/channels/:id
     */
    getChannel(channelId: string): Promise<ChannelDTO>;
    /**
     * Create new channel
     * Endpoint: POST /api/v1/servers/:serverId/channels
     */
    createChannel(serverId: string, body: CreateChannelRequest): Promise<ChannelDTO>;
    /**
     * Update channel
     * Endpoint: PATCH /api/v1/channels/:id
     */
    updateChannel(channelId: string, updates: Partial<Omit<ChannelDTO, "id" | "server_id" | "type">>): Promise<ChannelDTO>;
    /**
     * Delete channel
     * Endpoint: DELETE /api/v1/channels/:id
     */
    deleteChannel(channelId: string): Promise<void>;
};
//# sourceMappingURL=channels.repo.d.ts.map