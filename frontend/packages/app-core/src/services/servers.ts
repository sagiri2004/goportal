import type { CreateServerRequest, ServerDTO } from '@goportal/types'
import { apiClient } from '../lib/api-client'
import type { MockServer } from '../mock/servers'

const deriveInitials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)

const palette = [
  'bg-indigo-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-rose-500',
]

const pickColor = (id: string): string => {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index)) % 997
  }
  return palette[hash % palette.length]
}

const mapServer = (server: ServerDTO): MockServer => ({
  id: server.id,
  name: server.name,
  initials: deriveInitials(server.name),
  color: pickColor(server.id),
  iconUrl: server.icon_url ?? undefined,
  bannerUrl: server.banner_url ?? undefined,
  boostLevel: undefined,
})

export const getServers = async (): Promise<MockServer[]> => {
  const servers = await apiClient.get<ServerDTO[]>('/api/v1/servers')
  return servers.map(mapServer)
}

export const getServerById = async (serverId: string): Promise<MockServer | null> => {
  try {
    const server = await apiClient.get<ServerDTO>(`/api/v1/servers/${serverId}`)
    return mapServer(server)
  } catch {
    return null
  }
}

export const createServer = async (body: CreateServerRequest): Promise<MockServer> => {
  const server = await apiClient.post<ServerDTO>('/api/v1/servers', body)
  return mapServer(server)
}

export const joinServer = async (serverId: string): Promise<void> => {
  await apiClient.post<void>(`/api/v1/servers/${serverId}/join`)
}
