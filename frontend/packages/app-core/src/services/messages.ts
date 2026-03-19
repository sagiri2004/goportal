import type { Message as UIMessage, Attachment, Reaction } from '../lib/message-types'
import { IS_MOCK } from '../mock'
import { mockMessages } from '../mock/messages'
import { simulateDelay } from '../mock/user'
import { apiClient } from '../lib/api-client'
import { useAuthStore } from '@goportal/store'

type BackendMessage = {
  id: string
  channel_id: string
  author_id: string
  author?: {
    id: string
    username: string
    avatar_url?: string
    avatar_color?: string
  }
  content?: {
    payload?: string
  }
  created_at?: number
  updated_at?: number
  attachments?: Array<{
    id?: string
    attachment_id?: string
    file_url?: string
    url?: string
    file_name?: string
    file_type?: string
    file_size?: number
  }>
  reactions?: Array<{
    emoji: string
    user_id?: string
  }>
}

type MessagePage = {
  items: UIMessage[]
  limit: number
  offset: number
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
    hash = (hash + id.charCodeAt(index)) % 1031
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

const formatTimestamp = (unixSeconds?: number): { timestamp: string; date: string } => {
  const source = unixSeconds ? new Date(unixSeconds * 1000) : new Date()

  const timestamp = source.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const date = source.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })

  return { timestamp, date }
}

const mapAttachments = (attachments: BackendMessage['attachments']): Attachment[] =>
  (attachments ?? []).map((item, index) => {
    const type = item.file_type ?? 'application/octet-stream'

    return {
      id: item.id ?? item.attachment_id ?? `att-${index}`,
      type: type.startsWith('image/')
        ? 'image'
        : type.startsWith('video/')
          ? 'video'
          : type.startsWith('audio/')
            ? 'audio'
            : 'file',
      url: item.file_url ?? item.url ?? '',
      filename: item.file_name ?? 'attachment',
      filesize: item.file_size ?? 0,
      mimeType: type,
    }
  })

const mapReactions = (reactions: BackendMessage['reactions']): Reaction[] => {
  const currentUserId = useAuthStore.getState().user?.id

  const grouped = new Map<string, string[]>()
  for (const reaction of reactions ?? []) {
    const current = grouped.get(reaction.emoji) ?? []
    if (reaction.user_id) {
      current.push(reaction.user_id)
    }
    grouped.set(reaction.emoji, current)
  }

  return Array.from(grouped.entries()).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    hasReacted: currentUserId ? userIds.includes(currentUserId) : false,
    userIds,
  }))
}

const mapMessage = (item: BackendMessage): UIMessage => {
  const fallbackAuthor = `user-${item.author_id.slice(0, 6)}`
  const author = item.author?.username ?? fallbackAuthor
  const { timestamp, date } = formatTimestamp(item.created_at)

  return {
    id: item.id,
    authorId: item.author_id,
    author,
    avatarUrl: item.author?.avatar_url,
    avatarColor: item.author?.avatar_color ?? colorFromId(item.author_id),
    avatarInitials: initialsFromName(author),
    content: item.content?.payload ?? '',
    timestamp,
    date,
    editedAt: item.updated_at && item.updated_at !== item.created_at
      ? formatTimestamp(item.updated_at).timestamp
      : undefined,
    attachments: mapAttachments(item.attachments),
    reactions: mapReactions(item.reactions),
  }
}

export const getMessages = async (
  channelId: string,
  opts: {
    limit?: number
    offset?: number
  } = {}
): Promise<MessagePage> => {
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  if (IS_MOCK) {
    await simulateDelay()
    const channelMessages = mockMessages[channelId] ?? []
    const items = channelMessages.slice(offset, offset + limit)

    return {
      items,
      limit,
      offset,
    }
  }

  const response = await apiClient.get<{
    items: BackendMessage[]
    limit: number
    offset: number
  }>(`/api/v1/channels/${channelId}/messages?limit=${limit}&offset=${offset}`)

  return {
    items: [...(response.items ?? [])].reverse().map(mapMessage),
    limit: response.limit ?? limit,
    offset: response.offset ?? offset,
  }
}

export const sendMessage = async (
  channelId: string,
  content: string
): Promise<UIMessage> => {
  if (IS_MOCK) {
    await simulateDelay(120)

    const now = new Date()
    const timestamp = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    return {
      id: `m-${now.getTime()}`,
      authorId: 'you',
      author: 'you',
      avatarColor: 'bg-indigo-500',
      avatarInitials: 'Y',
      content,
      timestamp,
      date: 'Today',
    }
  }

  const item = await apiClient.post<BackendMessage>('/api/v1/messages', {
    channel_id: channelId,
    content_type: 'text/plain',
    content,
    encoding: 'utf-8',
  })

  return mapMessage(item)
}
