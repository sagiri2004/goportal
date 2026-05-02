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

export type GameShareContent = {
  share_type?: 'game' | 'score' | 'achievement'
  game_id: string
  title?: string
  thumbnail_url?: string
  hero_image_url?: string
  play_url?: string
  details_url?: string
  score?: number
  achievement?: string
  comment?: string
}

export type Message = {
  id: string
  authorId: string
  author: string
  authorColor?: string
  avatarUrl?: string
  avatarColor?: string
  avatarInitials?: string
  contentType?: string
  content: string
  contentData?: unknown
  gameShare?: GameShareContent
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
