import type { ServerDTO, ChannelDTO } from '@goportal/types'

export const simulateDelay = (ms = 400): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

// ============================================================================
// Servers Mock Data
// ============================================================================

export const mockServersData: ServerDTO[] = [
  {
    id: 's1',
    name: 'Discord Clone Devs',
    owner_id: 'u1',
    is_public: true,
    default_role_id: 'role1',
  },
  {
    id: 's2',
    name: 'LiveKit Lab',
    owner_id: 'u2',
    is_public: false,
    default_role_id: 'role2',
  },
  {
    id: 's3',
    name: 'Friends',
    owner_id: 'u1',
    is_public: true,
    default_role_id: 'role3',
  },
]

export const mockChannelsData: ChannelDTO[] = [
  {
    id: 'c1',
    server_id: 's1',
    name: 'general',
    type: 'TEXT',
    position: 0,
    is_private: false,
  },
  {
    id: 'c2',
    server_id: 's1',
    name: 'random',
    type: 'TEXT',
    position: 1,
    is_private: false,
  },
  {
    id: 'c3',
    server_id: 's1',
    name: 'voice-channel',
    type: 'VOICE',
    position: 2,
    is_private: false,
  },
  {
    id: 'c4',
    server_id: 's2',
    name: 'sdk-help',
    type: 'TEXT',
    position: 0,
    is_private: false,
  },
]

// Helper to get server initials
export const getServerInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
