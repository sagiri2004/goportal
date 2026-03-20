import { useAuthStore } from '@goportal/store'
import type { AuthUser } from '@goportal/types'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'

type RequestOptions = {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
}

type ToastDetail = {
  type: 'error'
  message: string
}

type StoredCredentials = {
  username: string
  password: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const AUTH_TOKEN_KEY = 'auth_token'
const LEGACY_AUTH_TOKEN_KEY = 'auth-token'
const AUTH_STORE_KEY = 'auth-store'
const AUTH_CREDENTIALS_KEY = 'auth_credentials'

const emitErrorToast = (message: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<ToastDetail>('goportal:toast', {
      detail: {
        type: 'error',
        message,
      },
    })
  )
}

const parsePersistedToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const direct = window.localStorage.getItem(AUTH_TOKEN_KEY)
  if (direct) {
    return direct
  }

  const legacy = window.localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)
  if (legacy) {
    return legacy
  }

  const persisted = window.localStorage.getItem(AUTH_STORE_KEY)
  if (!persisted) {
    return null
  }

  try {
    const parsed = JSON.parse(persisted) as {
      state?: {
        token?: string | null
      }
    }

    return parsed.state?.token ?? null
  } catch {
    return null
  }
}

const getAuthToken = (): string | null => {
  try {
    const tokenFromStore = useAuthStore.getState().token
    if (tokenFromStore) {
      return tokenFromStore
    }
  } catch {
    // ignore and fallback to localStorage parse
  }

  return parsePersistedToken()
}

const handleUnauthorized = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_STORE_KEY)

  try {
    useAuthStore.getState().logout()
  } catch {
    // ignore if store is unavailable
  }

  if (window.location.pathname !== '/auth/login') {
    window.location.href = '/auth/login'
  }
}

const parseCredentials = (): StoredCredentials | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(AUTH_CREDENTIALS_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as StoredCredentials
    if (!parsed.username || !parsed.password) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const persistToken = (token: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  window.localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, token)
}

const reLogin = async (): Promise<string | null> => {
  const credentials = parseCredentials()
  if (!credentials) {
    return null
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })
  } catch {
    throw new Error('Unable to reach the server. Please check your connection and try again.')
  }

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as {
    data?: {
      token?: string
      user?: unknown
    }
  }

  const token = payload.data?.token
  if (!token) {
    return null
  }

  persistToken(token)
  useAuthStore.getState().setToken(token)
  if (payload.data?.user) {
    useAuthStore.getState().setUser(payload.data.user as AuthUser)
  }

  return token
}

const request = async <T>(
  path: string,
  options: RequestOptions = {},
  allowRetry = true
): Promise<T> => {
  const method = options.method ?? 'GET'
  const headers = new Headers(options.headers)
  const token = getAuthToken()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const url = `${API_BASE_URL}${path}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
    })
  } catch {
    const message = 'Unable to reach the server. Please check your connection and try again.'
    emitErrorToast(message)
    throw new Error(message)
  }

  if (response.status === 401) {
    if (allowRetry) {
      const renewedToken = await reLogin()
      if (renewedToken) {
        return request<T>(path, options, false)
      }
    }
    handleUnauthorized()
    throw new Error('Session expired. Please log in again.')
  }

  let payload: unknown = null
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    payload = await response.json()
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string } | null)?.message ??
      `Request failed with status ${response.status}`

    emitErrorToast(message)
    throw new Error(message)
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }

  return payload as T
}

export const apiClient = {
  get: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'GET', headers }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body, headers }),
  patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PATCH', body, headers }),
  put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PUT', body, headers }),
  delete: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'DELETE', headers }),
}
