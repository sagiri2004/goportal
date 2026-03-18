import type { ServerDTO, CreateServerRequest } from '@goportal/types'
import { mockServersData, simulateDelay } from '../mockData'

/**
 * Servers Repository
 * Mock implementation - wire to real API in STEP 5
 */

export const serversRepo = {
  /**
   * Get all servers for current user
   */
  async getServers(): Promise<ServerDTO[]> {
    await simulateDelay()
    return mockServersData
  },

  /**
   * Get single server by ID
   */
  async getServer(serverId: string): Promise<ServerDTO> {
    await simulateDelay()
    const server = mockServersData.find(s => s.id === serverId)
    if (!server) throw new Error('Server not found')
    return server
  },

  /**
   * Create new server
   */
  async createServer(body: CreateServerRequest): Promise<ServerDTO> {
    await simulateDelay()
    const newServer: ServerDTO = {
      id: `s${Date.now()}`,
      name: body.name,
      owner_id: 'current-user-id', // Will be from auth store
      is_public: body.is_public,
      default_role_id: 'default-role',
    }
    mockServersData.push(newServer)
    return newServer
  },

  /**
   * Update server
   */
  async updateServer(
    serverId: string,
    updates: Partial<Omit<ServerDTO, 'id' | 'owner_id' | 'default_role_id'>>
  ): Promise<ServerDTO> {
    await simulateDelay()
    const server = mockServersData.find(s => s.id === serverId)
    if (!server) throw new Error('Server not found')
    Object.assign(server, updates)
    return server
  },

  /**
   * Delete server
   */
  async deleteServer(serverId: string): Promise<void> {
    await simulateDelay()
    const index = mockServersData.findIndex(s => s.id === serverId)
    if (index === -1) throw new Error('Server not found')
    mockServersData.splice(index, 1)
  },
}
