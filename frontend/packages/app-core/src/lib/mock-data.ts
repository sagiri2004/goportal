export type MockServer = {
  id: string
  name: string
  initials: string
  color: string
}

export type MockChannel = {
  id: string
  name: string
  type: 'text' | 'voice'
  unread: number
}

export type MockCategory = {
  id: string
  name: string
  channels: MockChannel[]
}

export type MockMemberStatus = 'online' | 'idle' | 'dnd' | 'offline'

export type MockMember = {
  id: string
  name: string
  initials: string
  color: string
  status: MockMemberStatus
  role: string
}

export type MockMessage = {
  id: string
  authorId: string
  author: string
  avatar: string
  content: string
  timestamp: string
  date: string
}

export const mockServers: MockServer[] = [
  { id: '1', name: 'Discord Clone Devs', initials: 'DC', color: 'bg-indigo-500' },
  { id: '2', name: 'LiveKit Labs', initials: 'LL', color: 'bg-purple-500' },
  { id: '3', name: 'Frontend Guild', initials: 'FG', color: 'bg-green-500' },
  { id: '4', name: 'Design System', initials: 'DS', color: 'bg-orange-500' },
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
          { id: 'vc1', name: 'Chill Lounge', type: 'voice', unread: 0 },
          { id: 'vc2', name: 'Study Room', type: 'voice', unread: 0 },
          { id: 'vc3', name: 'Gaming', type: 'voice', unread: 0 },
        ],
      },
    ],
  },
}

export const mockMembers: MockMember[] = [
  {
    id: '1',
    name: 'zutomayo',
    initials: 'Z',
    color: 'bg-purple-500',
    status: 'online',
    role: 'Admin',
  },
  {
    id: '2',
    name: 'alice',
    initials: 'A',
    color: 'bg-orange-500',
    status: 'online',
    role: 'Member',
  },
  {
    id: '3',
    name: 'bob',
    initials: 'B',
    color: 'bg-green-500',
    status: 'idle',
    role: 'Member',
  },
  {
    id: '4',
    name: 'charlie',
    initials: 'C',
    color: 'bg-red-500',
    status: 'dnd',
    role: 'Member',
  },
  {
    id: '5',
    name: 'diana',
    initials: 'D',
    color: 'bg-blue-500',
    status: 'offline',
    role: 'Member',
  },
  {
    id: '6',
    name: 'evan',
    initials: 'E',
    color: 'bg-yellow-500',
    status: 'offline',
    role: 'Member',
  },
]

export const mockMessages: Record<string, MockMessage[]> = {
  general: [
    {
      id: '1',
      authorId: '2',
      author: 'alice',
      avatar: 'bg-orange-500',
      content: 'Welcome to the Discord clone!',
      timestamp: '10:01',
      date: 'Today',
    },
    {
      id: '2',
      authorId: '1',
      author: 'zutomayo',
      avatar: 'bg-purple-500',
      content: 'We are wiring LiveKit next.',
      timestamp: '10:02',
      date: 'Today',
    },
    {
      id: '3',
      authorId: '3',
      author: 'bob',
      avatar: 'bg-green-500',
      content: 'Tailwind dark mode looks great.',
      timestamp: '10:05',
      date: 'Today',
    },
    {
      id: '4',
      authorId: '2',
      author: 'alice',
      avatar: 'bg-orange-500',
      content: 'Anyone tried the new components?',
      timestamp: '10:07',
      date: 'Today',
    },
    {
      id: '5',
      authorId: '2',
      author: 'alice',
      avatar: 'bg-orange-500',
      content: 'The sidebar resize is so smooth!',
      timestamp: '10:08',
      date: 'Today',
    },
  ],
  random: [
    {
      id: '1',
      authorId: '3',
      author: 'bob',
      avatar: 'bg-green-500',
      content: "What's everyone playing lately?",
      timestamp: '09:00',
      date: 'Today',
    },
    {
      id: '2',
      authorId: '4',
      author: 'charlie',
      avatar: 'bg-red-500',
      content: 'Hollow Knight is amazing.',
      timestamp: '09:15',
      date: 'Today',
    },
  ],
}

