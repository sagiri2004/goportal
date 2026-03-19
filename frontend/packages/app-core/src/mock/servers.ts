import type { ChannelDTO, ServerDTO } from '@goportal/types'

export type MockServer = {
  id: string
  name: string
  initials: string
  color: string
  bannerUrl?: string
  iconUrl?: string
  boostLevel?: number
}

export type MockChannel = {
  id: string
  name: string
  type: 'text' | 'voice'
  unread: number
  activeMembers?: Array<{
    id: string
    name?: string
    avatarUrl?: string
    initials: string
    color: string
    isStreaming?: boolean
  }>
  liveLabel?: string
  isLive?: boolean
}

export type MockCategory = {
  id: string
  name: string
  channels: MockChannel[]
}

export const mockServers: MockServer[] = [
  {
    id: '1',
    name: 'Discord Clone Devs',
    initials: 'DC',
    color: 'bg-indigo-500',
    bannerUrl: 'https://picsum.photos/seed/dc/400/120',
    iconUrl: undefined,
    boostLevel: 3,
  },
  {
    id: '2',
    name: 'LiveKit Labs',
    initials: 'LL',
    color: 'bg-purple-500',
    bannerUrl: undefined,
    iconUrl: undefined,
  },
  {
    id: '3',
    name: 'Frontend Guild',
    initials: 'FG',
    color: 'bg-green-500',
    bannerUrl: 'https://picsum.photos/seed/fg/400/120',
    iconUrl: undefined,
    boostLevel: 1,
  },
  {
    id: '4',
    name: 'Design System',
    initials: 'DS',
    color: 'bg-orange-500',
    bannerUrl: undefined,
    iconUrl: undefined,
  },
]

export const mockChannels: Record<
  string,
  {
    categories: MockCategory[]
  }
> = {
  '1': {
    categories: [
      {
        id: 'info',
        name: 'Thông tin',
        channels: [
          { id: 'rules', name: 'rules', type: 'text', unread: 0 },
          { id: 'announce', name: 'announcements', type: 'text', unread: 3 },
        ],
      },
      {
        id: 'text',
        name: 'Kênh Chat',
        channels: [
          { id: 'general', name: 'general', type: 'text', unread: 0 },
          { id: 'random', name: 'random', type: 'text', unread: 12 },
          { id: 'dev', name: 'dev-talk', type: 'text', unread: 0 },
          { id: 'music', name: 'music', type: 'text', unread: 0 },
        ],
      },
      {
        id: 'voice',
        name: 'Kênh Thoại',
        channels: [
          {
            id: 'vc1',
            name: 'delta-force-1',
            type: 'voice',
            unread: 0,
            isLive: true,
            liveLabel: 'Chia Se Man Hinh',
            activeMembers: [
              { id: '1', name: 'alice', initials: 'A', color: 'bg-orange-500' },
              { id: '2', name: 'bob', initials: 'B', color: 'bg-purple-500' },
              { id: '3', name: 'charlie', initials: 'C', color: 'bg-green-500' },
            ],
          },
          {
            id: 'vc2',
            name: 'Dog Guang T3, Trust Me',
            type: 'voice',
            unread: 0,
            isLive: false,
            liveLabel: '8:41:48',
            activeMembers: [
              { id: '4', name: 'diana', initials: 'D', color: 'bg-yellow-500' },
            ],
          },
          { id: 'vc3', name: 'Gaming', type: 'voice', unread: 0 },
        ],
      },
    ],
  },
}

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
    name: 'voice-lounge',
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
  {
    id: 'c5',
    server_id: 's3',
    name: 'general',
    type: 'TEXT',
    position: 0,
    is_private: false,
  },
]
