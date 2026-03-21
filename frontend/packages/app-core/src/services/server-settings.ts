import type { RoleDTO, ServerDTO } from '@goportal/types'
import { apiClient } from '../lib/api-client'
import { uploadMedia } from './upload'

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
    icon_url?: string | null
    color: string
    position: number
    is_everyone: boolean
    permissions: string[]
  }>
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
    icon_url?: string
    color: string
    permissions: string[]
  }
): Promise<RoleDTO> => apiClient.post<RoleDTO>(`/api/v1/servers/${serverId}/roles`, body)

export const updateServerRole = async (
  serverId: string,
  roleId: string,
  body: {
    name?: string
    icon_url?: string
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
  const uploaded = await uploadMedia(file, 'server_icon')
  return uploaded.url
}

export const uploadServerBanner = async (file: File): Promise<string> => {
  const uploaded = await uploadMedia(file, 'server_banner')
  return uploaded.url
}

export const uploadRoleIcon = async (file: File): Promise<string> => {
  const uploaded = await uploadMedia(file, 'role_icon')
  return uploaded.url
}

export const uploadAvatar = async (file: File): Promise<string> => {
  const uploaded = await uploadMedia(file, 'avatar')
  return uploaded.url
}
