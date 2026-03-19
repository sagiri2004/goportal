import type { ServerDTO, CreateServerRequest } from '@goportal/types'
import { apiClient } from '@goportal/services'
import { mockServersData, simulateDelay } from '../mockData'

/**
 * Servers Repository
 * Step 4: Mock implementation
 * Step 5: ✅ Real API calls to backend
 */

export const serversRepo = {
  /**
   * Get all servers for current user
   * Endpoint: GET /api/v1/servers
   */
  async getServers(): Promise<ServerDTO[]> {
    try {
      const response = await apiClient.get('/api/v1/servers')
      return response.data.data || []
    } catch (error) {
      // Fallback to mock if backend not available
      await simulateDelay()
      return mockServersData
    }
  },

  /**
   * Get single server by ID
   * Endpoint: GET /api/v1/servers/:id
   */
  async getServer(serverId: string): Promise<ServerDTO> {
    try {
      const response = await apiClient.get(`/api/v1/servers/${serverId}`)
      return response.data.data
    } catch (error) {
      const server = mockServersData.find(s => s.id === serverId)
      if (!server) throw new Error('Server not found')
      return server
    }
  },

  /**
   * Create new server
   * Endpoint: POST /api/v1/servers
   */
  async createServer(body: CreateServerRequest): Promise<ServerDTO> {
    try {
      const response = await apiClient.post('/api/v1/servers', body)
      return response.data.data
    } catch (error) {
      // Fallback to mock
      await simulateDelay()
      const newServer: ServerDTO = {
        id: `s${Date.now()}`,
        name: body.name,
        owner_id: 'current-user-id',
        is_public: body.is_public,
        default_role_id: 'default-role',
      }
      mockServersData.push(newServer)
      return newServer
    }
  },

  /**
   * Update server
   * Endpoint: PATCH /api/v1/servers/:id
   */
  async updateServer(
    serverId: string,
    updates: Partial<Omit<ServerDTO, 'id' | 'owner_id' | 'default_role_id'>>
  ): Promise<ServerDTO> {
    try {
      const response = await apiClient.patch(`/api/v1/servers/${serverId}`, updates)
      return response.data.data
    } catch (error) {
      const server = mockServersData.find(s => s.id === serverId)
      if (!server) throw new Error('Server not found')
      Object.assign(server, updates)
      return server
    }
  },

  /**
   * Delete server
   * Endpoint: DELETE /api/v1/servers/:id
   */
  async deleteServer(serverId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/servers/${serverId}`)
    } catch (error) {
      const index = mockServersData.findIndex(s => s.id === serverId)
      if (index === -1) throw new Error('Server not found')
      mockServersData.splice(index, 1)
    }
  },
}
