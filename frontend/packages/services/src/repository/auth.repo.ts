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

import type { RegisterRequest, LoginRequest, LoginResponseData } from '@goportal/types'
import { shouldUseMockData } from '@goportal/config'
import { apiClient } from '../api/client'

// Mock data for auth
const mockUsers = [
  { username: 'demo', password: 'Demo123!' },
  { username: 'testuser', password: 'Test123!' },
]

const mockLoginResponse: LoginResponseData = {
  token: 'mock_jwt_token_' + Date.now(),
  user: {
    id: 'user-' + Date.now(),
    username: 'demo',
    is_admin: false,
  },
}

const simulateDelay = async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
}

export const authRepo = {
  /**
   * Register new user
   * Endpoint: POST /api/v1/auth/register
   */
  register: async (body: RegisterRequest): Promise<any> => {
    if (shouldUseMockData()) {
      await simulateDelay()
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
      }
    }

    try {
      const response = await apiClient.post('/api/v1/auth/register', body)
      return response.data
    } catch (error) {
      console.error('[Auth] Register error:', error)
      throw error
    }
  },

  /**
   * Login user
   * Endpoint: POST /api/v1/auth/login
   */
  login: async (body: LoginRequest): Promise<LoginResponseData> => {
    if (shouldUseMockData()) {
      await simulateDelay()
      // Mock: Check against mock users
      const user = mockUsers.find(u => u.username === body.username)
      if (!user || user.password !== body.password) {
        throw new Error('Invalid username or password')
      }
      return {
        ...mockLoginResponse,
        user: {
          ...mockLoginResponse.user,
          username: body.username,
        },
      }
    }

    try {
      const response = await apiClient.post('/api/v1/auth/login', body)
      return response.data.data // Backend wraps in ApiResponse<LoginResponseData>
    } catch (error) {
      console.error('[Auth] Login error:', error)
      throw error
    }
  },
}

