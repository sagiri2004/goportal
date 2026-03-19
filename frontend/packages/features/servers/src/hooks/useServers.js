import { useQuery, useMutation } from '@tanstack/react-query';
import { serversRepo } from '../repositories/servers.repo';
/**
 * Hook to fetch all servers
 */
export const useServers = () => {
    return useQuery({
        queryKey: ['servers'],
        queryFn: () => serversRepo.getServers(),
        staleTime: 60 * 1000, // 1 minute
    });
};
/**
 * Hook to fetch single server
 */
export const useServer = (serverId) => {
    return useQuery({
        queryKey: ['servers', serverId],
        queryFn: () => serversRepo.getServer(serverId),
        staleTime: 60 * 1000,
        enabled: !!serverId,
    });
};
/**
 * Hook to create new server
 */
export const useCreateServer = () => {
    return useMutation({
        mutationFn: (body) => serversRepo.createServer(body),
    });
};
/**
 * Hook to update server
 */
export const useUpdateServer = (serverId) => {
    return useMutation({
        mutationFn: (updates) => serversRepo.updateServer(serverId, updates),
    });
};
/**
 * Hook to delete server
 */
export const useDeleteServer = (serverId) => {
    return useMutation({
        mutationFn: () => serversRepo.deleteServer(serverId),
    });
};
//# sourceMappingURL=useServers.js.map