import { useQuery, useMutation } from '@tanstack/react-query';
import { channelsRepo } from '../repositories/channels.repo';
/**
 * Hook to fetch channels for a server
 */
export const useChannels = (serverId) => {
    return useQuery({
        queryKey: ['channels', serverId],
        queryFn: () => channelsRepo.getChannels(serverId),
        staleTime: 60 * 1000, // 1 minute
        enabled: !!serverId,
    });
};
/**
 * Hook to fetch single channel
 */
export const useChannel = (channelId) => {
    return useQuery({
        queryKey: ['channels', 'detail', channelId],
        queryFn: () => channelsRepo.getChannel(channelId),
        staleTime: 60 * 1000,
        enabled: !!channelId,
    });
};
/**
 * Hook to create new channel
 */
export const useCreateChannel = (serverId) => {
    return useMutation({
        mutationFn: (body) => channelsRepo.createChannel(serverId, body),
    });
};
/**
 * Hook to update channel
 */
export const useUpdateChannel = (channelId) => {
    return useMutation({
        mutationFn: (updates) => channelsRepo.updateChannel(channelId, updates),
    });
};
/**
 * Hook to delete channel
 */
export const useDeleteChannel = (channelId) => {
    return useMutation({
        mutationFn: () => channelsRepo.deleteChannel(channelId),
    });
};
//# sourceMappingURL=useChannels.js.map