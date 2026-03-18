/**
 * Auth Repository
 *
 * Handles all authentication-related API calls.
 * Step 4: Uses mock data
 * Step 5: Will be replaced with real API calls
 */

import type { RegisterRequest, LoginRequest, LoginResponseData, AuthUser } from '@goportal/types'
import { mockAuthUser, mockLoginResponse, simulateDelay } from '@goportal/feature-dashboard'

export const authRepo = {
  register: async (body: RegisterRequest): Promise<AuthUser> => {
    // TODO: replace with real API — STEP 5
    await simulateDelay()
    return { ...mockAuthUser, username: body.username.trim() }
  },

  login: async (_body: LoginRequest): Promise<LoginResponseData> => {
    // TODO: replace with real API — STEP 5
    await simulateDelay()
    return mockLoginResponse
  },
}
