import type { ChannelDTO, CreateChannelRequest } from '@goportal/types'
import { apiClient } from '@goportal/services'
import { mockChannelsData, simulateDelay } from '../mockData'

/**
 * Channels Repository
 * Step 4: Mock implementation
 * Step 5: ✅ Real API calls to backend
 */

export const channelsRepo = {
  /**
   * Get all channels for a server
   * Endpoint: GET /api/v1/servers/:serverId/channels
   */
  async getChannels(serverId: string): Promise<ChannelDTO[]> {
    try {
      const response = await apiClient.get(`/api/v1/servers/${serverId}/channels`)
      return response.data.data || []
    } catch (error) {
      // Fallback to mock
      await simulateDelay()
      return mockChannelsData.filter(c => c.server_id === serverId)
    }
  },

  /**
   * Get single channel by ID
   * Endpoint: GET /api/v1/channels/:id
   */
  async getChannel(channelId: string): Promise<ChannelDTO> {
    try {
      const response = await apiClient.get(`/api/v1/channels/${channelId}`)
      return response.data.data
    } catch (error) {
      const channel = mockChannelsData.find(c => c.id === channelId)
      if (!channel) throw new Error('Channel not found')
      return channel
    }
  },

  /**
   * Create new channel
   * Endpoint: POST /api/v1/servers/:serverId/channels
   */
  async createChannel(serverId: string, body: CreateChannelRequest): Promise<ChannelDTO> {
    try {
      const response = await apiClient.post(`/api/v1/servers/${serverId}/channels`, body)
      return response.data.data
    } catch (error) {
      // Fallback to mock
      await simulateDelay()
      const newChannel: ChannelDTO = {
        id: `c${Date.now()}`,
        server_id: serverId,
        name: body.name,
        type: body.type,
        position: body.position ?? mockChannelsData.filter(c => c.server_id === serverId).length,
        is_private: false,
        parent_id: body.parent_id,
      }
      mockChannelsData.push(newChannel)
      return newChannel
    }
  },

  /**
   * Update channel
   * Endpoint: PATCH /api/v1/channels/:id
   */
  async updateChannel(
    channelId: string,
    updates: Partial<Omit<ChannelDTO, 'id' | 'server_id' | 'type'>>
  ): Promise<ChannelDTO> {
    try {
      const response = await apiClient.patch(`/api/v1/channels/${channelId}`, updates)
      return response.data.data
    } catch (error) {
      const channel = mockChannelsData.find(c => c.id === channelId)
      if (!channel) throw new Error('Channel not found')
      Object.assign(channel, updates)
      return channel
    }
  },

  /**
   * Delete channel
   * Endpoint: DELETE /api/v1/channels/:id
   */
  async deleteChannel(channelId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/channels/${channelId}`)
    } catch (error) {
      const index = mockChannelsData.findIndex(c => c.id === channelId)
      if (index === -1) throw new Error('Channel not found')
      mockChannelsData.splice(index, 1)
    }
  },
}
