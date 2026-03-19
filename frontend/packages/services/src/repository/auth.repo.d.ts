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
import type { RegisterRequest, LoginRequest, LoginResponseData } from '@goportal/types';
export declare const authRepo: {
    /**
     * Register new user
     * Endpoint: POST /api/v1/auth/register
     */
    register: (body: RegisterRequest) => Promise<any>;
    /**
     * Login user
     * Endpoint: POST /api/v1/auth/login
     */
    login: (body: LoginRequest) => Promise<LoginResponseData>;
};
//# sourceMappingURL=auth.repo.d.ts.map