/**
 * Axios API Client
 *
 * Configures:
 * - Base URL from environment
 * - Request interceptor: adds Authorization header from Zustand store
 * - Response interceptor: handles 401 redirect to login
 * - Global error mapping
 */
import { AxiosInstance } from 'axios';
export declare const apiClient: AxiosInstance;
//# sourceMappingURL=client.d.ts.map