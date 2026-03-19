/**
 * Auth Repository
 *
 * Handles all authentication-related API calls.
 * Supports Real API (default) and Mock Data (via VITE_USE_MOCK_DATA env)
 *
 * Usage:
 * - npm run dev:web (default, real API)
 * - npm run dev:web:mock (mock data, no backend needed)
 */
import { shouldUseMockData } from '@goportal/config';
import { apiClient } from '../api/client';
const mockAuthCredentials = [
    { username: 'demo', password: 'Demo123!' },
    { username: 'testuser', password: 'Test123!' },
];
const simulateDelay = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
};
export const authRepo = {
    /**
     * Register new user
     * Endpoint: POST /api/v1/auth/register
     */
    register: async (body) => {
        if (shouldUseMockData()) {
            await simulateDelay();
            // Mock: Always succeed
            return {
                data: {
                    message: 'User registered successfully',
                    user: {
                        id: 'user-' + Date.now(),
                        username: body.username,
                        is_admin: false,
                    },
                },
            };
        }
        try {
            const response = await apiClient.post('/api/v1/auth/register', body);
            return response.data;
        }
        catch (error) {
            console.error('[Auth] Register error:', error);
            throw error;
        }
    },
    /**
     * Login user
     * Endpoint: POST /api/v1/auth/login
     */
    login: async (body) => {
        if (shouldUseMockData()) {
            await simulateDelay();
            // Mock: Check against mock users
            const user = mockAuthCredentials.find(u => u.username === body.username);
            if (!user || user.password !== body.password) {
                throw new Error('Invalid username or password');
            }
            return {
                token: 'mock_jwt_token_' + Date.now(),
                user: {
                    id: 'user-' + Date.now(),
                    username: body.username,
                    is_admin: false,
                },
            };
        }
        try {
            const response = await apiClient.post('/api/v1/auth/login', body);
            return response.data.data; // Backend wraps in ApiResponse<LoginResponseData>
        }
        catch (error) {
            console.error('[Auth] Login error:', error);
            throw error;
        }
    },
};
//# sourceMappingURL=auth.repo.js.map