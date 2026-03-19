import type { ChannelDTO, CreateChannelRequest } from '@goportal/types';
/**
 * Hook to fetch channels for a server
 */
export declare const useChannels: (serverId: string) => import("@tanstack/react-query").UseQueryResult<ChannelDTO[], Error>;
/**
 * Hook to fetch single channel
 */
export declare const useChannel: (channelId: string) => import("@tanstack/react-query").UseQueryResult<ChannelDTO, Error>;
/**
 * Hook to create new channel
 */
export declare const useCreateChannel: (serverId: string) => import("@tanstack/react-query").UseMutationResult<ChannelDTO, Error, CreateChannelRequest, unknown>;
/**
 * Hook to update channel
 */
export declare const useUpdateChannel: (channelId: string) => import("@tanstack/react-query").UseMutationResult<ChannelDTO, Error, Partial<Omit<ChannelDTO, "type" | "id" | "server_id">>, unknown>;
/**
 * Hook to delete channel
 */
export declare const useDeleteChannel: (channelId: string) => import("@tanstack/react-query").UseMutationResult<void, Error, void, unknown>;
//# sourceMappingURL=useChannels.d.ts.map