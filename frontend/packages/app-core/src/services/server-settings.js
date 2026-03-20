import { apiClient } from '../lib/api-client';
import { useAuthStore } from '@goportal/store';
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const getToken = () => {
    const token = useAuthStore.getState().token;
    if (token) {
        return token;
    }
    const direct = localStorage.getItem('auth_token');
    if (direct) {
        return direct;
    }
    const legacy = localStorage.getItem('auth-token');
    if (legacy) {
        return legacy;
    }
    const persisted = localStorage.getItem('auth-store');
    if (!persisted) {
        return null;
    }
    try {
        const parsed = JSON.parse(persisted);
        return parsed.state?.token ?? null;
    }
    catch {
        return null;
    }
};
const toAbsoluteUrl = (url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `${API_BASE_URL}${url}`;
};
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
    const token = getToken();
    if (!token) {
        throw new Error('Session expired. Please log in again.');
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/api/v1/upload`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });
    const payload = (await response.json());
    if (!response.ok || !payload.data) {
        throw new Error(payload.message ?? 'Không thể tải lên tệp.');
    }
    return toAbsoluteUrl(payload.data.url);
};
//# sourceMappingURL=server-settings.js.map