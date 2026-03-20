import type { RoleDTO, ServerDTO } from '@goportal/types'
import { apiClient } from '../lib/api-client'
import { useAuthStore } from '@goportal/store'

export type ServerMemberWithRoles = {
  user: {
    id: string
    username: string
    is_admin: boolean
    status?: 'online' | 'idle' | 'dnd' | 'offline'
    avatar_url?: string | null
  }
  roles: Array<{
    id: string
    server_id: string
    name: string
    color: string
    position: number
    is_everyone: boolean
    permissions: string[]
  }>
}

type UploadResponse = {
  attachment_id: string
  url: string
  file_name: string
  file_type: string
  file_size: number
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

const getToken = (): string | null => {
  const token = useAuthStore.getState().token
  if (token) {
    return token
  }

  const direct = localStorage.getItem('auth_token')
  if (direct) {
    return direct
  }

  const legacy = localStorage.getItem('auth-token')
  if (legacy) {
    return legacy
  }

  const persisted = localStorage.getItem('auth-store')
  if (!persisted) {
    return null
  }

  try {
    const parsed = JSON.parse(persisted) as { state?: { token?: string | null } }
    return parsed.state?.token ?? null
  } catch {
    return null
  }
}

const toAbsoluteUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `${API_BASE_URL}${url}`
}

export const updateServerProfile = async (
  serverId: string,
  body: {
    name?: string
    icon_url?: string
    banner_url?: string
  }
): Promise<ServerDTO> => apiClient.patch<ServerDTO>(`/api/v1/servers/${serverId}`, body)

export const getServerMembersWithRoles = async (serverId: string): Promise<ServerMemberWithRoles[]> =>
  apiClient.get<ServerMemberWithRoles[]>(`/api/v1/servers/${serverId}/members`)

export const kickServerMember = async (serverId: string, userId: string): Promise<void> =>
  apiClient.delete<void>(`/api/v1/servers/${serverId}/members/${userId}`)

export const updateServerMemberRoles = async (
  serverId: string,
  userId: string,
  role_ids: string[]
): Promise<void> =>
  apiClient.patch<void>(`/api/v1/servers/${serverId}/members/${userId}/roles`, { role_ids })

export const getServerRoles = async (serverId: string): Promise<RoleDTO[]> =>
  apiClient.get<RoleDTO[]>(`/api/v1/servers/${serverId}/roles`)

export const createServerRole = async (
  serverId: string,
  body: {
    name: string
    color: string
    permissions: string[]
  }
): Promise<RoleDTO> => apiClient.post<RoleDTO>(`/api/v1/servers/${serverId}/roles`, body)

export const updateServerRole = async (
  serverId: string,
  roleId: string,
  body: {
    name?: string
    color?: string
    permissions?: string[]
  }
): Promise<RoleDTO> => apiClient.patch<RoleDTO>(`/api/v1/servers/${serverId}/roles/${roleId}`, body)

export const deleteServerRole = async (serverId: string, roleId: string): Promise<void> =>
  apiClient.delete<void>(`/api/v1/servers/${serverId}/roles/${roleId}`)

export const createServerInvite = async (
  serverId: string,
  body: { max_uses?: number; expires_at?: number }
): Promise<{
  id: string
  server_id: string
  inviter_id: string
  code: string
  max_uses: number
  uses: number
  expires_at?: number
}> => apiClient.post(`/api/v1/servers/${serverId}/invites`, body)

export const uploadServerMedia = async (file: File): Promise<string> => {
  const token = getToken()
  if (!token) {
    throw new Error('Session expired. Please log in again.')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/v1/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const payload = (await response.json()) as {
    message?: string
    data?: UploadResponse
  }

  if (!response.ok || !payload.data) {
    throw new Error(payload.message ?? 'Không thể tải lên tệp.')
  }

  return toAbsoluteUrl(payload.data.url)
}
