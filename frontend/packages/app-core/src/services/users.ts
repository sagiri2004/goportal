import type { AuthUser } from '@goportal/types'
import { apiClient } from '../lib/api-client'
import { uploadMedia } from './upload'

export const updateMyProfile = async (body: {
  username?: string
  avatar_url?: string
}): Promise<AuthUser> => apiClient.patch<AuthUser>('/api/v1/users/me', body)

export const uploadUserAvatar = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const uploaded = await uploadMedia(file, 'avatar', { onProgress })
  return uploaded.url
}
