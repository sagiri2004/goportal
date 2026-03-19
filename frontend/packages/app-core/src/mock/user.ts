import type { AuthUser, LoginResponseData } from '@goportal/types'
import type { User } from '@goportal/types'

export const simulateDelay = (ms = 400): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const mockCurrentUser: User & {
  name: string
  initials: string
  color: string
  avatarUrl?: string
} = {
  id: 'u1',
  username: 'zutomayo',
  avatarColor: '#6366f1',
  status: 'online',
  name: 'You',
  initials: 'Y',
  color: 'bg-indigo-500',
  avatarUrl: undefined,
}

export const mockUsers: User[] = [
  mockCurrentUser,
  { id: 'u2', username: 'alice', avatarColor: '#f97316', status: 'online' },
  { id: 'u3', username: 'bob', avatarColor: '#22c55e', status: 'idle' },
  { id: 'u4', username: 'charlie', avatarColor: '#e11d48', status: 'offline' },
]

export const mockAuthUser: AuthUser = {
  id: '8d3f6506-6569-4b31-a74a-d9d43c359ee5',
  username: 'zutomayo',
  is_admin: false,
}

export const mockAuthCredentials = [
  { username: 'demo', password: 'Demo123!' },
  { username: 'testuser', password: 'Test123!' },
]

export const mockLoginResponse: LoginResponseData = {
  user: mockAuthUser,
  token: 'mock-jwt-token-for-development',
}
