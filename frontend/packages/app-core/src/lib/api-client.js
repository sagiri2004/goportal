import { useAuthStore } from '@goportal/store';
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
const emitErrorToast = (message) => {
    if (typeof window === 'undefined') {
        return;
    }
    window.dispatchEvent(new CustomEvent('goportal:toast', {
        detail: {
            type: 'error',
            message,
        },
    }));
};
const parsePersistedToken = () => {
    if (typeof window === 'undefined') {
        return null;
    }
    const direct = window.localStorage.getItem('auth-token');
    if (direct) {
        return direct;
    }
    const persisted = window.localStorage.getItem('auth-store');
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
const getAuthToken = () => {
    try {
        const tokenFromStore = useAuthStore.getState().token;
        if (tokenFromStore) {
            return tokenFromStore;
        }
    }
    catch {
        // ignore and fallback to localStorage parse
    }
    return parsePersistedToken();
};
const handleUnauthorized = () => {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.removeItem('auth-token');
    window.localStorage.removeItem('auth-store');
    try {
        useAuthStore.getState().logout();
    }
    catch {
        // ignore if store is unavailable
    }
    if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
    }
};
const request = async (path, options = {}) => {
    const method = options.method ?? 'GET';
    const headers = new Headers(options.headers);
    const token = getAuthToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    let body;
    if (options.body !== undefined) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(options.body);
    }
    const url = `${API_BASE_URL}${path}`;
    let response;
    try {
        response = await fetch(url, {
            method,
            headers,
            body,
        });
    }
    catch {
        emitErrorToast('Network error. Please try again.');
        throw new Error('Network error');
    }
    if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Unauthorized');
    }
    let payload = null;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        payload = await response.json();
    }
    if (!response.ok) {
        const message = payload?.message ??
            `Request failed with status ${response.status}`;
        emitErrorToast(message);
        throw new Error(message);
    }
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return payload.data;
    }
    return payload;
};
export const apiClient = {
    get: (path, headers) => request(path, { method: 'GET', headers }),
    post: (path, body, headers) => request(path, { method: 'POST', body, headers }),
    patch: (path, body, headers) => request(path, { method: 'PATCH', body, headers }),
    put: (path, body, headers) => request(path, { method: 'PUT', body, headers }),
    delete: (path, headers) => request(path, { method: 'DELETE', headers }),
};
//# sourceMappingURL=api-client.js.map