import { apiClient } from '../lib/api-client';
import { uploadMedia } from './upload';
export const updateMyProfile = async (body) => apiClient.patch('/api/v1/users/me', body);
export const uploadUserAvatar = async (file, onProgress) => {
    const uploaded = await uploadMedia(file, 'avatar', { onProgress });
    return uploaded.url;
};
//# sourceMappingURL=users.js.map