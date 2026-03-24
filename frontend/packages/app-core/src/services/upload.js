import { useAuthStore } from '@goportal/store';
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const API_BASE_URL_NORMALIZED = API_BASE_URL.replace(/\/$/, '');
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
const toAbsoluteURL = (fileURL) => {
    const trimmed = fileURL.trim();
    if (!trimmed) {
        throw new Error('Upload completed but file URL is empty. Please verify storage configuration.');
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    if (trimmed.startsWith('/')) {
        return `${API_BASE_URL_NORMALIZED}${trimmed}`;
    }
    return `${API_BASE_URL_NORMALIZED}/${trimmed}`;
};
export const uploadMedia = (file, mediaType, options = {}) => {
    const token = getToken();
    if (!token) {
        return Promise.reject(new Error('Session expired. Please log in again.'));
    }
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/api/v1/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) {
                return;
            }
            const progress = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
            options.onProgress?.(progress);
        };
        xhr.onerror = () => {
            reject(new Error('Unable to upload file. Please try again.'));
        };
        xhr.onload = () => {
            let payload = null;
            try {
                payload = JSON.parse(xhr.responseText);
            }
            catch {
                payload = null;
            }
            if (xhr.status < 200 || xhr.status >= 300 || !payload?.data) {
                reject(new Error(payload?.message ?? 'Unable to upload file.'));
                return;
            }
            if (typeof payload.data.url !== 'string' || payload.data.url.trim() === '') {
                reject(new Error('Upload completed but file URL is missing from server response.'));
                return;
            }
            resolve({
                ...payload.data,
                url: toAbsoluteURL(payload.data.url),
            });
        };
        const formData = new FormData();
        formData.append('file', file);
        formData.append('media_type', mediaType);
        xhr.send(formData);
    });
};
//# sourceMappingURL=upload.js.map
