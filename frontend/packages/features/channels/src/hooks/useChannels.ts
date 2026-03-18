import { useQuery, useMutation } from '@tanstack/react-query'
import { channelsRepo } from '../repositories/channels.repo'
import type { ChannelDTO, CreateChannelRequest } from '@goportal/types'

/**
 * Hook to fetch channels for a server
 */
export const useChannels = (serverId: string) => {
  return useQuery({
    queryKey: ['channels', serverId],
    queryFn: () => channelsRepo.getChannels(serverId),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!serverId,
  })
}

/**
 * Hook to fetch single channel
 */
export const useChannel = (channelId: string) => {
  return useQuery({
    queryKey: ['channels', 'detail', channelId],
    queryFn: () => channelsRepo.getChannel(channelId),
    staleTime: 60 * 1000,
    enabled: !!channelId,
  })
}

/**
 * Hook to create new channel
 */
export const useCreateChannel = (serverId: string) => {
  return useMutation({
    mutationFn: (body: CreateChannelRequest) =>
      channelsRepo.createChannel(serverId, body),
  })
}

/**
 * Hook to update channel
 */
export const useUpdateChannel = (channelId: string) => {
  return useMutation({
    mutationFn: (updates: Partial<Omit<ChannelDTO, 'id' | 'server_id' | 'type'>>) =>
      channelsRepo.updateChannel(channelId, updates),
  })
}

/**
 * Hook to delete channel
 */
export const useDeleteChannel = (channelId: string) => {
  return useMutation({
    mutationFn: () => channelsRepo.deleteChannel(channelId),
  })
}
