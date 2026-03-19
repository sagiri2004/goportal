import { useAuthStore } from '@goportal/store'

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

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

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

  const direct = window.localStorage.getItem('auth-token')
  if (direct) {
    return direct
  }

  const persisted = window.localStorage.getItem('auth-store')
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

  window.localStorage.removeItem('auth-token')
  window.localStorage.removeItem('auth-store')

  try {
    useAuthStore.getState().logout()
  } catch {
    // ignore if store is unavailable
  }

  if (window.location.pathname !== '/auth/login') {
    window.location.href = '/auth/login'
  }
}

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
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
    emitErrorToast('Network error. Please try again.')
    throw new Error('Network error')
  }

  if (response.status === 401) {
    handleUnauthorized()
    throw new Error('Unauthorized')
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
