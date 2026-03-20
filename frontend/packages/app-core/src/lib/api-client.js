import { useAuthStore } from '@goportal/store';
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const AUTH_TOKEN_KEY = 'auth_token';
const LEGACY_AUTH_TOKEN_KEY = 'auth-token';
const AUTH_STORE_KEY = 'auth-store';
const AUTH_CREDENTIALS_KEY = 'auth_credentials';
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
    const direct = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (direct) {
        return direct;
    }
    const legacy = window.localStorage.getItem(LEGACY_AUTH_TOKEN_KEY);
    if (legacy) {
        return legacy;
    }
    const persisted = window.localStorage.getItem(AUTH_STORE_KEY);
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
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_STORE_KEY);
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
const parseCredentials = () => {
    if (typeof window === 'undefined') {
        return null;
    }
    const raw = window.localStorage.getItem(AUTH_CREDENTIALS_KEY);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        if (!parsed.username || !parsed.password) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
};
const persistToken = (token) => {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, token);
};
const reLogin = async () => {
    const credentials = parseCredentials();
    if (!credentials) {
        return null;
    }
    let response;
    try {
        response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });
    }
    catch {
        throw new Error('Unable to reach the server. Please check your connection and try again.');
    }
    if (!response.ok) {
        return null;
    }
    const payload = (await response.json());
    const token = payload.data?.token;
    if (!token) {
        return null;
    }
    persistToken(token);
    useAuthStore.getState().setToken(token);
    if (payload.data?.user) {
        useAuthStore.getState().setUser(payload.data.user);
    }
    return token;
};
const request = async (path, options = {}, allowRetry = true) => {
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
        const message = 'Unable to reach the server. Please check your connection and try again.';
        emitErrorToast(message);
        throw new Error(message);
    }
    if (response.status === 401) {
        if (allowRetry) {
            const renewedToken = await reLogin();
            if (renewedToken) {
                return request(path, options, false);
            }
        }
        handleUnauthorized();
        throw new Error('Session expired. Please log in again.');
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