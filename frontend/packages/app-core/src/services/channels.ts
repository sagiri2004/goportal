import type { ChannelDTO, CreateChannelRequest } from '@goportal/types'
import { apiClient } from '../lib/api-client'
import { IS_MOCK_CHANNELS } from '../mock'
import { mockChannels, mockChannelsData, type MockCategory, type MockChannel } from '../mock/servers'
import { simulateDelay } from '../mock/user'

type ChannelsResult = {
  categories: MockCategory[]
}

const mapChannel = (channel: ChannelDTO): MockChannel => ({
  id: channel.id,
  name: channel.name,
  type: channel.type === 'VOICE' ? 'voice' : 'text',
  unread: 0, // TODO: remove when backend implements unread count
})

const toCategories = (channels: ChannelDTO[]): MockCategory[] => {
  const sorted = [...channels].sort((left, right) => left.position - right.position)

  const textChannels = sorted
    .filter((channel) => channel.type === 'TEXT')
    .map(mapChannel)

  const voiceChannels = sorted
    .filter((channel) => channel.type === 'VOICE')
    .map(mapChannel)

  const categories: MockCategory[] = []
  if (textChannels.length > 0) {
    categories.push({
      id: 'text',
      name: 'Text Channels',
      channels: textChannels,
    })
  }

  if (voiceChannels.length > 0) {
    categories.push({
      id: 'voice',
      name: 'Voice Channels',
      channels: voiceChannels,
    })
  }

  return categories
}

export const getChannels = async (serverId: string): Promise<ChannelsResult> => {
  if (IS_MOCK_CHANNELS) {
    await simulateDelay()
    return {
      categories: mockChannels[serverId]?.categories ?? [],
    }
  }

  const channels = await apiClient.get<ChannelDTO[]>(`/api/v1/servers/${serverId}/channels`)

  return {
    categories: toCategories(channels),
  }
}

export const createChannel = async (
  serverId: string,
  body: CreateChannelRequest
): Promise<MockChannel> => {
  if (IS_MOCK_CHANNELS) {
    await simulateDelay()

    const newChannel: ChannelDTO = {
      id: `c-${Date.now()}`,
      server_id: serverId,
      name: body.name,
      type: body.type,
      position: body.position ?? mockChannelsData.filter((item) => item.server_id === serverId).length,
      is_private: false,
      parent_id: body.parent_id,
    }

    mockChannelsData.push(newChannel)

    return mapChannel(newChannel)
  }

  const channel = await apiClient.post<ChannelDTO>(`/api/v1/servers/${serverId}/channels`, body)
  return mapChannel(channel)
}
