import type { MockMember } from '../mock/members'
import { mockMembers } from '../mock/members'
import { IS_MOCK } from '../mock'
import { simulateDelay } from '../mock/user'
import { apiClient } from '../lib/api-client'

type BackendMemberWithRoles = {
  user: {
    id: string
    username: string
    is_admin: boolean
    status?: 'online' | 'idle' | 'dnd' | 'offline'
  }
  roles: Array<{
    id: string
    name: string
  }>
}

const palette = [
  'bg-indigo-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-rose-500',
]

const colorFromId = (id: string): string => {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index)) % 631
  }
  return palette[hash % palette.length]
}

const initialsFromName = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)

const mapMember = (item: BackendMemberWithRoles): MockMember => ({
  id: item.user.id,
  name: item.user.username,
  initials: initialsFromName(item.user.username),
  color: colorFromId(item.user.id),
  status: item.user.status ?? 'offline', // TODO: remove when backend exposes realtime status consistently
  role: item.roles[0]?.name ?? 'Member',
})

export const getMembers = async (serverId: string): Promise<MockMember[]> => {
  if (IS_MOCK) {
    await simulateDelay()
    return mockMembers
  }

  const members = await apiClient.get<BackendMemberWithRoles[]>(`/api/v1/servers/${serverId}/members`)
  return members.map(mapMember)
}
