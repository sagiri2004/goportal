import type { ServerDTO, CreateServerRequest } from '@goportal/types';
/**
 * Servers Repository
 * Supports Real API (default) and Mock Data (via VITE_USE_MOCK_DATA env)
 *
 * Usage:
 * - npm run dev:web (default, real API)
 * - npm run dev:web:mock (mock data, no backend needed)
 */
export declare const serversRepo: {
    /**
     * Get all servers for current user
     * Endpoint: GET /api/v1/servers
     */
    getServers(): Promise<ServerDTO[]>;
    /**
     * Get single server by ID
     * Endpoint: GET /api/v1/servers/:id
     */
    getServer(serverId: string): Promise<ServerDTO>;
    /**
     * Create new server
     * Endpoint: POST /api/v1/servers
     */
    createServer(body: CreateServerRequest): Promise<ServerDTO>;
    /**
     * Update server
     * Endpoint: PATCH /api/v1/servers/:id
     */
    updateServer(serverId: string, updates: Partial<Omit<ServerDTO, "id" | "owner_id" | "default_role_id">>): Promise<ServerDTO>;
    /**
     * Delete server
     * Endpoint: DELETE /api/v1/servers/:id
     */
    deleteServer(serverId: string): Promise<void>;
};
//# sourceMappingURL=servers.repo.d.ts.map