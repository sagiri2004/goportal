/**
 * Axios API Client
 *
 * Configures:
 * - Base URL from environment
 * - Request interceptor: adds Authorization header from Zustand store
 * - Response interceptor: handles 401 redirect to login
 * - Global error mapping
 */
import axios from 'axios';
import { API_URL } from '@goportal/config';
import { useAuthStore } from '@goportal/store';
// Create Axios instance with default config
export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10_000,
});
// Request Interceptor — attach token from Zustand
apiClient.interceptors.request.use((config) => {
    // Import here to avoid circular dependency
    // useAuthStore is created later and will be available when interceptor runs
    const token = localStorage.getItem('auth-token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Response Interceptor — handle errors and 401 redirects
apiClient.interceptors.response.use((response) => {
    return response;
}, (error) => {
    // On 401, clear token and redirect to login
    // (actual redirect handled by router guard)
    if (error.response?.status === 401) {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-store');
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
        }
    }
    // Return error for caller to handle
    return Promise.reject(error);
});
//# sourceMappingURL=client.js.map