import type { AuthUser, LoginRequest, LoginResponseData, RegisterRequest } from '@goportal/types'
import { useAuthStore } from '@goportal/store'
import { apiClient } from '../lib/api-client'
import { IS_MOCK_AUTH } from '../mock'
import { mockCurrentUser, mockLoginResponse, simulateDelay } from '../mock/user'

const AUTH_TOKEN_KEY = 'auth_token'
const LEGACY_AUTH_TOKEN_KEY = 'auth-token'
const AUTH_STORE_KEY = 'auth-store'
const AUTH_CREDENTIALS_KEY = 'auth_credentials'

const setPersistedToken = (token: string | null) => {
  if (typeof window === 'undefined') {
    return
  }

  if (!token) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  window.localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, token)
}

const setPersistedCredentials = (username: string, password: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    AUTH_CREDENTIALS_KEY,
    JSON.stringify({
      username,
      password,
    })
  )
}

export const clearSession = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
    window.localStorage.removeItem(AUTH_STORE_KEY)
  }

  try {
    useAuthStore.getState().logout()
  } catch {
    // ignore store access issues
  }
}

export const register = async (body: RegisterRequest): Promise<AuthUser> => {
  if (IS_MOCK_AUTH) {
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
  const data = IS_MOCK_AUTH
    ? await (async () => {
        await simulateDelay()
        return mockLoginResponse
      })()
    : await apiClient.post<LoginResponseData>('/api/v1/auth/login', body)

  setPersistedToken(data.token)
  setPersistedCredentials(body.username, body.password)
  useAuthStore.getState().setToken(data.token)
  useAuthStore.getState().setUser(data.user)

  return data
}

export const getCurrentUser = async (): Promise<AuthUser> => {
  if (IS_MOCK_AUTH) {
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
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(AUTH_TOKEN_KEY) ??
        window.localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)

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
