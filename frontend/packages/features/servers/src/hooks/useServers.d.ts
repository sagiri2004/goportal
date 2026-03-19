import type { ServerDTO, CreateServerRequest } from '@goportal/types';
/**
 * Hook to fetch all servers
 */
export declare const useServers: () => import("@tanstack/react-query").UseQueryResult<ServerDTO[], Error>;
/**
 * Hook to fetch single server
 */
export declare const useServer: (serverId: string) => import("@tanstack/react-query").UseQueryResult<ServerDTO, Error>;
/**
 * Hook to create new server
 */
export declare const useCreateServer: () => import("@tanstack/react-query").UseMutationResult<ServerDTO, Error, CreateServerRequest, unknown>;
/**
 * Hook to update server
 */
export declare const useUpdateServer: (serverId: string) => import("@tanstack/react-query").UseMutationResult<ServerDTO, Error, Partial<Omit<ServerDTO, "id" | "owner_id" | "default_role_id">>, unknown>;
/**
 * Hook to delete server
 */
export declare const useDeleteServer: (serverId: string) => import("@tanstack/react-query").UseMutationResult<void, Error, void, unknown>;
//# sourceMappingURL=useServers.d.ts.map