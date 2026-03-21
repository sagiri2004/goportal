import { apiClient } from '../lib/api-client';
import { uploadMedia } from './upload';
export const updateServerProfile = async (serverId, body) => apiClient.patch(`/api/v1/servers/${serverId}`, body);
export const getServerMembersWithRoles = async (serverId) => apiClient.get(`/api/v1/servers/${serverId}/members`);
export const kickServerMember = async (serverId, userId) => apiClient.delete(`/api/v1/servers/${serverId}/members/${userId}`);
export const updateServerMemberRoles = async (serverId, userId, role_ids) => apiClient.patch(`/api/v1/servers/${serverId}/members/${userId}/roles`, { role_ids });
export const getServerRoles = async (serverId) => apiClient.get(`/api/v1/servers/${serverId}/roles`);
export const createServerRole = async (serverId, body) => apiClient.post(`/api/v1/servers/${serverId}/roles`, body);
export const updateServerRole = async (serverId, roleId, body) => apiClient.patch(`/api/v1/servers/${serverId}/roles/${roleId}`, body);
export const deleteServerRole = async (serverId, roleId) => apiClient.delete(`/api/v1/servers/${serverId}/roles/${roleId}`);
export const createServerInvite = async (serverId, body) => apiClient.post(`/api/v1/servers/${serverId}/invites`, body);
export const uploadServerMedia = async (file) => {
    const uploaded = await uploadMedia(file, 'server_icon');
    return uploaded.url;
};
export const uploadServerBanner = async (file) => {
    const uploaded = await uploadMedia(file, 'server_banner');
    return uploaded.url;
};
export const uploadRoleIcon = async (file) => {
    const uploaded = await uploadMedia(file, 'role_icon');
    return uploaded.url;
};
export const uploadAvatar = async (file) => {
    const uploaded = await uploadMedia(file, 'avatar');
    return uploaded.url;
};
//# sourceMappingURL=server-settings.js.map