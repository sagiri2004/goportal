import type { ChannelDTO, CreateChannelRequest } from '@goportal/types'
import { apiClient } from '../lib/api-client'
import { type MockCategory, type MockChannel } from '../mock/servers'

type ChannelsResult = {
  categories: MockCategory[]
}

const mapChannel = (channel: ChannelDTO): MockChannel => ({
  id: channel.id,
  name: channel.name,
  type: channel.type === 'VOICE' ? 'voice' : 'text',
  unread: channel.unread_count ?? 0,
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
  const channels = await apiClient.get<ChannelDTO[]>(`/api/v1/servers/${serverId}/channels`)

  return {
    categories: toCategories(channels),
  }
}

export const createChannel = async (
  serverId: string,
  body: CreateChannelRequest
): Promise<MockChannel> => {
  const channel = await apiClient.post<ChannelDTO>(`/api/v1/servers/${serverId}/channels`, body)
  return mapChannel(channel)
}

export type ChannelNotificationLevel = 'all' | 'mentions_only' | 'none'

export type ChannelNotificationSetting = {
  user_id: string
  channel_id: string
  level: ChannelNotificationLevel
  muted_until?: string | null
}

export const markChannelRead = async (channelId: string): Promise<void> => {
  await apiClient.post(`/api/v1/channels/${channelId}/read`, {})
}

export const getChannelNotificationSetting = async (
  channelId: string
): Promise<ChannelNotificationSetting> =>
  apiClient.get<ChannelNotificationSetting>(`/api/v1/channels/${channelId}/notification-settings`)

export const updateChannelNotificationSetting = async (
  channelId: string,
  body: { level: ChannelNotificationLevel; muted_until: string | null }
): Promise<ChannelNotificationSetting> =>
  apiClient.put<ChannelNotificationSetting>(`/api/v1/channels/${channelId}/notification-settings`, body)
