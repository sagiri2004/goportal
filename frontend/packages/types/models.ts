// packages/types/models.ts
// Source of truth for core domain types.
// Only add fields that are permanent domain fields.
// Always make new fields optional to avoid breaking existing mock data.

export type User = {
  id: string
  username: string
  avatarColor: string          // hex — use inline style only
  status: 'online' | 'offline' | 'idle' | 'dnd'
  is_admin?: boolean
}

export type Message = {
  id: string
  channelId: string
  authorId: string
  content: string
  timestamp: string            // pre-formatted display string
  isEdited?: boolean
}

export type Channel = {
  id: string
  serverId: string
  name: string
  type: 'text' | 'voice'
  position?: number
  isPrivate?: boolean
  parentId?: string | null
}

export type Server = {
  id: string
  name: string
  initials: string       // 2 characters, derived from name
  ownerId?: string
  isPublic?: boolean
  defaultRoleId?: string
}
