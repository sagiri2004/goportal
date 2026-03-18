import type { ChannelDTO, CreateChannelRequest } from '@goportal/types'
import { mockChannelsData, simulateDelay } from '../mockData'

/**
 * Channels Repository
 * Mock implementation - wire to real API in STEP 5
 */

export const channelsRepo = {
  /**
   * Get all channels for a server
   */
  async getChannels(serverId: string): Promise<ChannelDTO[]> {
    await simulateDelay()
    return mockChannelsData.filter(c => c.server_id === serverId)
  },

  /**
   * Get single channel by ID
   */
  async getChannel(channelId: string): Promise<ChannelDTO> {
    await simulateDelay()
    const channel = mockChannelsData.find(c => c.id === channelId)
    if (!channel) throw new Error('Channel not found')
    return channel
  },

  /**
   * Create new channel
   */
  async createChannel(serverId: string, body: CreateChannelRequest): Promise<ChannelDTO> {
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
  },

  /**
   * Update channel
   */
  async updateChannel(
    channelId: string,
    updates: Partial<Omit<ChannelDTO, 'id' | 'server_id' | 'type'>>
  ): Promise<ChannelDTO> {
    await simulateDelay()
    const channel = mockChannelsData.find(c => c.id === channelId)
    if (!channel) throw new Error('Channel not found')
    Object.assign(channel, updates)
    return channel
  },

  /**
   * Delete channel
   */
  async deleteChannel(channelId: string): Promise<void> {
    await simulateDelay()
    const index = mockChannelsData.findIndex(c => c.id === channelId)
    if (index === -1) throw new Error('Channel not found')
    mockChannelsData.splice(index, 1)
  },
}
