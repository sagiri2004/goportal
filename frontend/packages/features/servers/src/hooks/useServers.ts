import { useQuery, useMutation } from '@tanstack/react-query'
import { serversRepo } from '../repositories/servers.repo'
import type { ServerDTO, CreateServerRequest } from '@goportal/types'

/**
 * Hook to fetch all servers
 */
export const useServers = () => {
  return useQuery({
    queryKey: ['servers'],
    queryFn: () => serversRepo.getServers(),
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch single server
 */
export const useServer = (serverId: string) => {
  return useQuery({
    queryKey: ['servers', serverId],
    queryFn: () => serversRepo.getServer(serverId),
    staleTime: 60 * 1000,
    enabled: !!serverId,
  })
}

/**
 * Hook to create new server
 */
export const useCreateServer = () => {
  return useMutation({
    mutationFn: (body: CreateServerRequest) => serversRepo.createServer(body),
  })
}

/**
 * Hook to update server
 */
export const useUpdateServer = (serverId: string) => {
  return useMutation({
    mutationFn: (updates: Partial<Omit<ServerDTO, 'id' | 'owner_id' | 'default_role_id'>>) =>
      serversRepo.updateServer(serverId, updates),
  })
}

/**
 * Hook to delete server
 */
export const useDeleteServer = (serverId: string) => {
  return useMutation({
    mutationFn: () => serversRepo.deleteServer(serverId),
  })
}
