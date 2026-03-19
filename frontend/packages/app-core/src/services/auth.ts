import type { AuthUser, LoginRequest, LoginResponseData, RegisterRequest } from '@goportal/types'
import { useAuthStore } from '@goportal/store'
import { apiClient } from '../lib/api-client'
import { IS_MOCK } from '../mock'
import { mockCurrentUser, mockLoginResponse, simulateDelay } from '../mock/user'

const setPersistedToken = (token: string | null) => {
  if (typeof window === 'undefined') {
    return
  }

  if (!token) {
    window.localStorage.removeItem('auth-token')
    return
  }

  window.localStorage.setItem('auth-token', token)
}

export const clearSession = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('auth-token')
    window.localStorage.removeItem('auth-store')
  }

  try {
    useAuthStore.getState().logout()
  } catch {
    // ignore store access issues
  }
}

export const register = async (body: RegisterRequest): Promise<AuthUser> => {
  if (IS_MOCK) {
    await simulateDelay()
    return {
      id: `user-${Date.now()}`,
      username: body.username,
      is_admin: false,
    }
  }

  return apiClient.post<AuthUser>('/api/v1/auth/register', body)
}

export const login = async (body: LoginRequest): Promise<LoginResponseData> => {
  const data = IS_MOCK
    ? await (async () => {
        await simulateDelay()
        return mockLoginResponse
      })()
    : await apiClient.post<LoginResponseData>('/api/v1/auth/login', body)

  setPersistedToken(data.token)
  useAuthStore.getState().setToken(data.token)
  useAuthStore.getState().setUser(data.user)

  return data
}

export const getCurrentUser = async (): Promise<AuthUser> => {
  if (IS_MOCK) {
    await simulateDelay(150)
    return {
      id: mockCurrentUser.id,
      username: mockCurrentUser.username,
      is_admin: false,
    }
  }

  return apiClient.get<AuthUser>('/api/v1/users/me')
}

export const hydrateSession = async (): Promise<AuthUser | null> => {
  const token =
    typeof window === 'undefined' ? null : window.localStorage.getItem('auth-token')

  if (!token) {
    return null
  }

  useAuthStore.getState().setToken(token)

  try {
    const user = await getCurrentUser()
    useAuthStore.getState().setUser(user)
    return user
  } catch {
    clearSession()
    return null
  }
}

export const logout = async (): Promise<void> => {
  clearSession()
}
