export type Attachment = {
  id: string
  type: 'image' | 'video' | 'gif' | 'file' | 'audio'
  url: string
  filename: string
  filesize: number
  width?: number
  height?: number
  mimeType: string
  blurhash?: string
}

export type Reaction = {
  emoji: string
  count: number
  hasReacted: boolean
  userIds: string[]
}

export type MessageReply = {
  messageId: string
  authorName: string
  authorColor?: string
  content: string
  hasAttachment?: boolean
}

export type LinkEmbed = {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
  color?: string
}

export type Message = {
  id: string
  authorId: string
  author: string
  authorColor?: string
  avatarUrl?: string
  avatarColor?: string
  avatarInitials?: string
  content: string
  timestamp: string
  date: string
  editedAt?: string
  attachments?: Attachment[]
  reactions?: Reaction[]
  replyTo?: MessageReply
  embeds?: LinkEmbed[]
  isPinned?: boolean
  isSystem?: boolean
  startsGroup?: boolean
}
