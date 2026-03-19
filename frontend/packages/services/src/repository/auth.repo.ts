/**
 * Auth Repository
 *
 * Handles all authentication-related API calls.
 * Step 4: Uses mock data
 * Step 5: ✅ Uses real API calls to backend
 */

import type { RegisterRequest, LoginRequest, LoginResponseData } from '@goportal/types'
import { apiClient } from '../api/client'

export const authRepo = {
  /**
   * Register new user
   * Endpoint: POST /api/v1/auth/register
   */
  register: async (body: RegisterRequest): Promise<any> => {
    const response = await apiClient.post('/api/v1/auth/register', body)
    return response.data
  },

  /**
   * Login user
   * Endpoint: POST /api/v1/auth/login
   */
  login: async (body: LoginRequest): Promise<LoginResponseData> => {
    const response = await apiClient.post('/api/v1/auth/login', body)
    return response.data.data // Backend wraps in ApiResponse<LoginResponseData>
  },
}

