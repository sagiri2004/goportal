import type { RoleDTO, ServerDTO } from '@goportal/types';
export type ServerMemberWithRoles = {
    user: {
        id: string;
        username: string;
        is_admin: boolean;
        status?: 'online' | 'idle' | 'dnd' | 'offline';
        avatar_url?: string | null;
    };
    roles: Array<{
        id: string;
        server_id: string;
        name: string;
        icon_url?: string | null;
        color: string;
        position: number;
        is_everyone: boolean;
        permissions: string[];
    }>;
};
export declare const updateServerProfile: (serverId: string, body: {
    name?: string;
    icon_url?: string;
    banner_url?: string;
}) => Promise<ServerDTO>;
export declare const getServerMembersWithRoles: (serverId: string) => Promise<ServerMemberWithRoles[]>;
export declare const kickServerMember: (serverId: string, userId: string) => Promise<void>;
export declare const updateServerMemberRoles: (serverId: string, userId: string, role_ids: string[]) => Promise<void>;
export declare const getServerRoles: (serverId: string) => Promise<RoleDTO[]>;
export declare const createServerRole: (serverId: string, body: {
    name: string;
    icon_url?: string;
    color: string;
    permissions: string[];
}) => Promise<RoleDTO>;
export declare const updateServerRole: (serverId: string, roleId: string, body: {
    name?: string;
    icon_url?: string;
    color?: string;
    permissions?: string[];
}) => Promise<RoleDTO>;
export declare const deleteServerRole: (serverId: string, roleId: string) => Promise<void>;
export declare const createServerInvite: (serverId: string, body: {
    max_uses?: number;
    expires_at?: number;
}) => Promise<{
    invite_code: string;
    invite_url: string;
    expires_at?: number;
}>;
export declare const uploadServerMedia: (file: File) => Promise<string>;
export declare const uploadServerBanner: (file: File) => Promise<string>;
export declare const uploadRoleIcon: (file: File) => Promise<string>;
export declare const uploadAvatar: (file: File) => Promise<string>;
//# sourceMappingURL=server-settings.d.ts.map