export type MockMemberStatus = 'online' | 'idle' | 'dnd' | 'offline'

export type MockMember = {
  id: string
  name: string
  initials: string
  color: string
  status: MockMemberStatus
  role: string
}

export type VoiceParticipant = {
  id: string
  name: string
  avatarUrl?: string
  avatarColor: string
  isSpeaking: boolean
  isMuted: boolean
  isDeafened: boolean
  isScreenSharing: boolean
  isCameraOn: boolean
  streamUrl?: string
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

export const mockVoiceParticipants: VoiceParticipant[] = [
  {
    id: '1',
    name: 'Elaina',
    avatarColor: 'bg-purple-500',
    isSpeaking: true,
    isMuted: false,
    isDeafened: false,
    isScreenSharing: true,
    isCameraOn: false,
    streamUrl: 'https://picsum.photos/seed/stream1/900/600',
  },
  {
    id: '2',
    name: 'professionalcheekslapper',
    avatarColor: 'bg-blue-500',
    isSpeaking: false,
    isMuted: true,
    isDeafened: false,
    isScreenSharing: false,
    isCameraOn: false,
  },
]
