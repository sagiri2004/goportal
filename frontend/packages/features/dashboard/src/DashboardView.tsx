import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Separator, cn } from '@goportal/ui'
import { ChannelHeader } from '@goportal/feature-channels'
import {
  Edit,
  FileText,
  Gift,
  Gamepad2,
  Hash,
  Image,
  Loader2,
  MoreHorizontal,
  Plus,
  Reply,
  Smile,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui'
import {
  addReaction,
  deleteMessage,
  getMessages,
  markChannelRead,
  removeReaction,
  sendMessage,
  updateMessage,
  uploadMessageAttachment,
  listTrendingGames,
} from '@goportal/app-core'
import type { LinkEmbed as LinkEmbedData } from '@goportal/app-core'
import type { Message as ChatMessage } from '@goportal/app-core'
import type { ChannelDTO } from '@goportal/types'
import { useAuthStore } from '@goportal/store'
import { useDropzone } from 'react-dropzone'
import { TextContent } from './components/TextContent'
import { ReplyPreview } from './components/ReplyPreview'
import { ImageAttachment } from './components/ImageAttachment'
import { FileAttachment } from './components/FileAttachment'
import { ReactionBar } from './components/ReactionBar'
import { LinkEmbed } from './components/LinkEmbed'
import { VideoAttachment } from './components/VideoAttachment'
import { EmojiPicker } from './components/EmojiPicker'

type ShellContext = {
  showMembers: boolean
  setShowMembers: React.Dispatch<React.SetStateAction<boolean>>
  activeChannelId: string
  setActiveChannelId: React.Dispatch<React.SetStateAction<string>>
  activeCategories: Array<{
    id: string
    name: string
    channels: Array<{
      id: string
      name: string
      type: 'text' | 'voice'
    }>
  }>
  incrementChannelUnread?: (channelId: string) => void
  resetChannelUnread?: (channelId: string) => void
  setChannelUnread?: (channelId: string, unreadCount: number) => void
  applyVoiceChannelActivityUpdate?: (update: {
    serverId: string
    channelId: string
    participants: Array<{
      user_id: string
      name?: string
      avatar_url?: string
      is_screen_sharing?: boolean
    }>
  }) => void
  subscribeNotificationEvents?: (
    listener: (event: NotificationSocketEnvelope) => void,
  ) => () => void
  sendNotificationSocketMessage?: (payload: unknown) => boolean
}

type NotificationSocketEnvelope = {
  type?: string
  user_id?: string
  payload?: any
  priority?: string
  timestamp?: string
  event_id?: string
}

const canonicalizeEventType = (eventType: string): string =>
  eventType.replace(/[.\-:]/g, '_').replace(/__+/g, '_').toUpperCase()

const createCanonicalEventSet = (types: string[]): Set<string> =>
  new Set(types.map(canonicalizeEventType))

const MESSAGE_CREATED_EVENT_TYPES = createCanonicalEventSet([
  'CHAT_MESSAGE_CREATED',
  'MESSAGE_CREATED',
  'MESSAGE_CREATE',
  'MESSAGE:CREATE',
  'MESSAGE.CREATED',
])

const MESSAGE_UPDATED_EVENT_TYPES = createCanonicalEventSet([
  'CHAT_MESSAGE_UPDATED',
  'MESSAGE_UPDATED',
  'MESSAGE_UPDATE',
  'MESSAGE:UPDATE',
  'MESSAGE.UPDATED',
])

const MESSAGE_DELETED_EVENT_TYPES = createCanonicalEventSet([
  'CHAT_MESSAGE_DELETED',
  'MESSAGE_DELETED',
  'MESSAGE_DELETE',
  'MESSAGE:DELETE',
  'MESSAGE.DELETED',
])

const REACTION_ADDED_EVENT_TYPES = createCanonicalEventSet([
  'MESSAGE_REACTION_ADDED',
  'MESSAGE_REACTION_ADD',
  'REACTION_ADDED',
  'MESSAGE:REACTION:ADD',
  'REACTION.ADDED',
])

const REACTION_REMOVED_EVENT_TYPES = createCanonicalEventSet([
  'MESSAGE_REACTION_REMOVED',
  'MESSAGE_REACTION_REMOVE',
  'REACTION_REMOVED',
  'MESSAGE:REACTION:REMOVE',
  'REACTION.REMOVED',
])

const VOICE_ACTIVITY_EVENT_TYPES = createCanonicalEventSet([
  'VOICE_CHANNEL_ACTIVITY_UPDATED',
  'VOICE_ACTIVITY_UPDATED',
])

const messagePalette = [
  'bg-indigo-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-rose-500',
]

const messageColorFromId = (id: string): string => {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index)) % 1031
  }
  return messagePalette[hash % messagePalette.length]
}

const messageInitialsFromName = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)

const formatSocketTimestamp = (timestamp?: unknown): { timestamp: string; date: string } => {
  let source: Date
  if (typeof timestamp === 'number') {
    source = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp)
  } else if (typeof timestamp === 'string' && timestamp) {
    source = new Date(timestamp)
  } else {
    source = new Date()
  }
  const safeSource = Number.isNaN(source.getTime()) ? new Date() : source
  return {
    timestamp: safeSource.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    date: safeSource.toLocaleDateString([], { month: 'short', day: 'numeric' }),
  }
}

const normalizeEventType = (raw: unknown): string =>
  typeof raw === 'string' ? raw.trim().toUpperCase() : ''

const resolveEnvelopeEventType = (event: NotificationSocketEnvelope): string => {
  const payload = normalizeSocketPayload(event.payload)
  const topLevelType = normalizeEventType(event.type)
  const payloadType = normalizeEventType(payload.event_type ?? payload.type)
  if (topLevelType === 'POPUP') {
    if (payloadType) {
      return payloadType
    }
    if (payload.message_id && payload.channel_id) {
      return 'CHAT_MESSAGE_CREATED'
    }
  }
  return payloadType || topLevelType
}

const normalizeSocketPayload = (payload: unknown): Record<string, any> => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, any>
  }
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>
      }
    } catch {
      return {}
    }
  }
  return {}
}

const mapSocketAttachments = (attachments: any): ChatMessage['attachments'] => {
  if (!Array.isArray(attachments)) {
    return []
  }

  return attachments.map((item: any, index: number) => {
    const mimeType = item?.file_type ?? item?.mime_type ?? 'application/octet-stream'
    return {
      id: item?.id ?? item?.attachment_id ?? `att-${index}`,
      type: mimeType.startsWith('image/')
        ? 'image'
        : mimeType.startsWith('video/')
          ? 'video'
          : mimeType.startsWith('audio/')
            ? 'audio'
            : 'file',
      url: item?.file_url ?? item?.url ?? '',
      filename: item?.file_name ?? item?.filename ?? 'attachment',
      filesize: item?.file_size ?? item?.filesize ?? 0,
      mimeType,
    }
  })
}

const mapSocketReactions = (reactions: any, currentUserId?: string | null): ChatMessage['reactions'] => {
  if (!Array.isArray(reactions)) {
    return []
  }

  const grouped = new Map<string, string[]>()
  reactions.forEach((reaction: any) => {
    const emoji = reaction?.emoji
    if (!emoji) {
      return
    }

    const nextUserIds: string[] = Array.isArray(reaction?.user_ids)
      ? reaction.user_ids.filter((item: unknown): item is string => typeof item === 'string')
      : typeof reaction?.user_id === 'string'
        ? [reaction.user_id]
        : []

    const existing = grouped.get(emoji) ?? []
    grouped.set(emoji, [...existing, ...nextUserIds])
  })

  return Array.from(grouped.entries()).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    hasReacted: !!currentUserId && userIds.includes(currentUserId),
    userIds,
  }))
}

const mapSocketPayloadToMessage = (
  payload: any,
  envelopeTimestamp?: string,
  currentUserId?: string | null,
): ChatMessage | null => {
  const messageId = payload?.message_id ?? payload?.id
  const authorId = payload?.author_id ?? payload?.author?.id
  const channelId = payload?.channel_id
  if (!messageId || !authorId || !channelId) {
    return null
  }

  const author = payload?.author?.username ?? `user-${String(authorId).slice(0, 6)}`
  const { timestamp, date } = formatSocketTimestamp(payload?.created_at ?? envelopeTimestamp)
  const contentType = payload?.content?.type ?? 'text/plain'
  const rawContentPayload = payload?.content?.payload ?? payload?.content ?? ''
  const normalizedContent =
    typeof rawContentPayload === 'string'
      ? rawContentPayload
      : rawContentPayload !== undefined && rawContentPayload !== null
        ? JSON.stringify(rawContentPayload)
        : ''

  return {
    id: messageId,
    authorId,
    author,
    avatarUrl: payload?.author?.avatar_url,
    avatarColor: payload?.author?.avatar_color ?? messageColorFromId(authorId),
    avatarInitials: messageInitialsFromName(author),
    contentType,
    content: normalizedContent,
    contentData: rawContentPayload,
    gameShare:
      contentType === 'game/share' && rawContentPayload && typeof rawContentPayload === 'object'
        ? (rawContentPayload as ChatMessage['gameShare'])
        : undefined,
    timestamp,
    date,
    editedAt: payload?.updated_at
      ? formatSocketTimestamp(payload.updated_at).timestamp
      : undefined,
    attachments: mapSocketAttachments(payload?.attachments),
    reactions: mapSocketReactions(payload?.reactions, currentUserId),
    replyTo: payload?.reply_to
      ? {
          messageId: payload.reply_to.message_id ?? payload.reply_to.id ?? '',
          authorName: payload.reply_to.author_name ?? payload.reply_to.author_id ?? 'unknown',
          content: payload.reply_to.content ?? '',
        }
      : undefined,
  }
}

export const DashboardView: React.FC = () => {
  const navigate = useNavigate()
  const {
    showMembers,
    setShowMembers,
    activeChannelId,
    activeCategories,
    incrementChannelUnread,
    resetChannelUnread,
    setChannelUnread,
    applyVoiceChannelActivityUpdate,
    subscribeNotificationEvents,
    sendNotificationSocketMessage,
  } = useOutletContext<ShellContext>()
  const currentUser = useAuthStore((state: any) => state.user)
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessage[]>>({})
  const [pagingByChannel, setPagingByChannel] = useState<
    Record<string, { offset: number; hasMore: boolean; isLoadingMore: boolean }>
  >({})
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null)
  const messageListRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLDivElement>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [composerHasContent, setComposerHasContent] = useState(false)
  const [uploadProgressByFile, setUploadProgressByFile] = useState<Record<string, number>>({})
  const [inFlightUploadCount, setInFlightUploadCount] = useState(0)
  const [composerError, setComposerError] = useState<string | null>(null)
  const embedCacheRef = useRef<Record<string, LinkEmbedData | null>>({})
  const embedInFlightRef = useRef<Record<string, boolean>>({})
  const [autoEmbedsByUrl, setAutoEmbedsByUrl] = useState<Record<string, LinkEmbedData>>({})
  const activeChannelIdRef = useRef(activeChannelId)
  const currentUserIdRef = useRef<string | null>(currentUser?.id ?? null)
  const incrementChannelUnreadRef = useRef(incrementChannelUnread)
  const resetChannelUnreadRef = useRef(resetChannelUnread)
  const setChannelUnreadRef = useRef(setChannelUnread)
  const applyVoiceChannelActivityUpdateRef = useRef(applyVoiceChannelActivityUpdate)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const isNearBottomRef = useRef(true)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [typingUsersByChannel, setTypingUsersByChannel] = useState<Record<string, Record<string, string>>>({})
  const typingTimersRef = useRef<Record<string, number>>({})
  const lastTypingSentAtRef = useRef<Record<string, number>>({})
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState('')
  const [pendingMessageIds, setPendingMessageIds] = useState<Record<string, true>>({})
  const [failedMessageIds, setFailedMessageIds] = useState<Record<string, true>>({})
  const [isGamesLauncherOpen, setIsGamesLauncherOpen] = useState(false)
  const [quickGames, setQuickGames] = useState<Array<{ id: string; title: string; source: string; rating: number }>>([])
  const isPrependingHistoryRef = useRef(false)
  const lastRenderedMessageIdRef = useRef<string | null>(null)

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId
  }, [activeChannelId])

  useEffect(() => {
    isNearBottomRef.current = isNearBottom
  }, [isNearBottom])

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? null
  }, [currentUser?.id])

  useEffect(() => {
    incrementChannelUnreadRef.current = incrementChannelUnread
  }, [incrementChannelUnread])

  useEffect(() => {
    resetChannelUnreadRef.current = resetChannelUnread
  }, [resetChannelUnread])

  useEffect(() => {
    setChannelUnreadRef.current = setChannelUnread
  }, [setChannelUnread])

  useEffect(() => {
    applyVoiceChannelActivityUpdateRef.current = applyVoiceChannelActivityUpdate
  }, [applyVoiceChannelActivityUpdate])

  const scrollToBottom = useCallback(() => {
    const list = messageListRef.current
    if (!list) {
      return
    }
    list.scrollTop = list.scrollHeight
    setNewMessageCount(0)
    setIsNearBottom(true)
  }, [])

  const markActiveChannelAsRead = useCallback(() => {
    const channelId = activeChannelIdRef.current
    if (!channelId) {
      return
    }
    resetChannelUnreadRef.current?.(channelId)
    void markChannelRead(channelId).catch(() => {})
    sendNotificationSocketMessage?.({
      type: 'channel.focus',
      data: { channel_id: channelId },
    })
  }, [sendNotificationSocketMessage])

  useEffect(() => {
    return () => {
      Object.values(typingTimersRef.current).forEach((timer) => window.clearTimeout(timer))
      typingTimersRef.current = {}
    }
  }, [])

  useEffect(() => {
    if (!isGamesLauncherOpen) {
      return
    }
    let cancelled = false
    void listTrendingGames({ limit: 8 })
      .then((items) => {
        if (cancelled) {
          return
        }
        setQuickGames(
          items.map((item) => ({
            id: item.game.id,
            title: item.game.title,
            source: item.game.source_type,
            rating: item.game.avg_rating,
          }))
        )
      })
      .catch(() => {
        if (!cancelled) {
          setQuickGames([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [isGamesLauncherOpen])

  const activeChannel = useMemo(
    () => {
      const channels = activeCategories.flatMap((category) => category.channels)
      const match = channels.find((channel) => channel.id === activeChannelId)
      if (!match) {
        return undefined
      }
      return {
        id: match.id,
        name: match.name,
        type: match.type === 'voice' ? 'VOICE' : 'TEXT',
        server_id: '',
        position: 0,
        is_private: false,
      } as ChannelDTO
    },
    [activeCategories, activeChannelId]
  )

  const activeChannelKey = activeChannelId

  const activeMessages = useMemo(
    () => messagesByChannel[activeChannelKey] ?? [],
    [activeChannelKey, messagesByChannel]
  )

  const grouped = useMemo(() => {
    const toMinutes = (t: string) => {
      const [hh, mm] = t.split(':').map((n) => Number(n))
      return (hh || 0) * 60 + (mm || 0)
    }

    return activeMessages.map((m, idx) => {
      const prev = activeMessages[idx - 1]
      const sameAuthor = prev && prev.authorId === m.authorId
      const within5 =
        prev && Math.abs(toMinutes(m.timestamp) - toMinutes(prev.timestamp)) <= 5
      const startsGroup = !(sameAuthor && within5)
      return { ...m, startsGroup }
    })
  }, [activeMessages])

  useEffect(() => {
    let isCancelled = false

    const loadInitialMessages = async () => {
      if (!activeChannelId) {
        return
      }

      const page = await getMessages(activeChannelId, {
        limit: 50,
        offset: 0,
      })

      if (isCancelled) {
        return
      }

      setMessagesByChannel((prev) => ({
        ...prev,
        [activeChannelId]: page.items,
      }))

      setPagingByChannel((prev) => ({
        ...prev,
        [activeChannelId]: {
          offset: page.offset + page.items.length,
          hasMore: page.items.length === 50,
          isLoadingMore: false,
        },
      }))
      requestAnimationFrame(() => {
        scrollToBottom()
        markActiveChannelAsRead()
      })
    }

    void loadInitialMessages().catch(() => {})

    return () => {
      isCancelled = true
    }
  }, [activeChannelId, markActiveChannelAsRead, scrollToBottom])

  useEffect(() => {
    if (!activeChannelId) {
      return
    }
    let cancelled = false
    const timer = window.setInterval(() => {
      if (cancelled) {
        return
      }
      void getMessages(activeChannelId, { limit: 50, offset: 0 })
        .then((page) => {
          if (cancelled) {
            return
          }
          setMessagesByChannel((prev) => {
            const current = prev[activeChannelId] ?? []
            if (current.length === page.items.length && current[current.length - 1]?.id === page.items[page.items.length - 1]?.id) {
              return prev
            }
            const merged = [...current, ...page.items].filter(
              (message, index, all) => all.findIndex((candidate) => candidate.id === message.id) === index
            )
            return {
              ...prev,
              [activeChannelId]: merged,
            }
          })
        })
        .catch(() => {})
    }, 2000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeChannelId])

  useEffect(() => {
    if (!activeChannelId) {
      return
    }
    requestAnimationFrame(() => {
      scrollToBottom()
    })
  }, [activeChannelId, scrollToBottom])

  useEffect(() => {
    const lastMessageId = activeMessages[activeMessages.length - 1]?.id ?? null
    if (!lastMessageId) {
      lastRenderedMessageIdRef.current = null
      return
    }
    const changed = lastRenderedMessageIdRef.current !== lastMessageId
    lastRenderedMessageIdRef.current = lastMessageId
    if (!changed || isPrependingHistoryRef.current) {
      return
    }
    requestAnimationFrame(() => {
      scrollToBottom()
    })
  }, [activeMessages, scrollToBottom])

  useEffect(() => {
    if (!activeChannelId) {
      return
    }
    markActiveChannelAsRead()
  }, [activeChannelId, markActiveChannelAsRead])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return
    }
    void Notification.requestPermission()
  }, [])

  useEffect(() => {
    if (!subscribeNotificationEvents) {
      return
    }

    const updateMessageInChannel = (
      channelId: string | null,
      updater: (messages: ChatMessage[]) => ChatMessage[],
    ) => {
      setMessagesByChannel((prev) => {
        if (channelId) {
          const current = prev[channelId] ?? []
          return {
            ...prev,
            [channelId]: updater(current),
          }
        }

        const next: Record<string, ChatMessage[]> = { ...prev }
        Object.keys(next).forEach((key) => {
          next[key] = updater(next[key] ?? [])
        })
        return next
      })
    }

    const applyReactionDelta = (
      message: ChatMessage,
      emoji: string,
      userId: string,
      mode: 'add' | 'remove',
    ): ChatMessage => {
      const reactions = message.reactions ?? []
      const index = reactions.findIndex((reaction) => reaction.emoji === emoji)

      if (index === -1) {
        if (mode === 'remove') {
          return message
        }
        return {
          ...message,
          reactions: [
            ...reactions,
            {
              emoji,
              count: 1,
              hasReacted: currentUserIdRef.current === userId,
              userIds: [userId],
            },
          ],
        }
      }

      const target = reactions[index]
      const currentUserIds = target.userIds ?? []
      const nextUserIds =
        mode === 'add'
          ? Array.from(new Set([...currentUserIds, userId]))
          : currentUserIds.filter((id) => id !== userId)

      const nextCount = nextUserIds.length
      const nextReactions = reactions
        .map((reaction, reactionIndex) => {
          if (reactionIndex !== index) {
            return reaction
          }
          return {
            ...reaction,
            count: nextCount,
            userIds: nextUserIds,
            hasReacted: currentUserIdRef.current ? nextUserIds.includes(currentUserIdRef.current) : false,
          }
        })
        .filter((reaction) => reaction.count > 0)

      return {
        ...message,
        reactions: nextReactions,
      }
    }

    const onSocketMessage = (event: NotificationSocketEnvelope) => {

      const eventType = resolveEnvelopeEventType(event)
      const canonicalEventType = canonicalizeEventType(eventType)
      if (!canonicalEventType || canonicalEventType === 'CONNECTED') {
        return
      }

      if (VOICE_ACTIVITY_EVENT_TYPES.has(canonicalEventType)) {
        const payload = normalizeSocketPayload(event.payload)
        const serverId = typeof payload.server_id === 'string' ? payload.server_id : ''
        const channelId = typeof payload.channel_id === 'string' ? payload.channel_id : ''
        const participants = Array.isArray(payload.participants) ? payload.participants : []

        if (serverId && channelId && applyVoiceChannelActivityUpdateRef.current) {
          applyVoiceChannelActivityUpdateRef.current({
            serverId,
            channelId,
            participants,
          })
        }
        return
      }

      if (canonicalEventType === 'CHANNEL_UNREAD') {
        const payload = normalizeSocketPayload(event.payload)
        const channelId = payload.channel_id as string | undefined
        const unreadCount = Number(payload.unread_count ?? 0)
        if (!channelId) {
          return
        }
        if (channelId !== activeChannelIdRef.current) {
          setChannelUnreadRef.current?.(channelId, unreadCount)
        } else if (unreadCount > 0) {
          resetChannelUnreadRef.current?.(channelId)
        }
        return
      }

      if (canonicalEventType === 'MENTION') {
        const payload = normalizeSocketPayload(event.payload)
        if (
          typeof window !== 'undefined' &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          const title = payload.from_username ? `@mention từ ${payload.from_username}` : 'Bạn được nhắc đến'
          const body = payload.preview ?? 'Bạn có một @mention mới'
          if (document.hidden) {
            new Notification(title, { body })
          }
        }
        return
      }

      if (canonicalEventType === 'TYPING' || canonicalEventType === 'TYPING_START') {
        const payload = normalizeSocketPayload(event.payload)
        const channelId = payload.channel_id as string | undefined
        const userId = payload.user_id as string | undefined
        const username = payload.username as string | undefined
        if (!channelId || !userId || userId === currentUserIdRef.current) {
          return
        }
        setTypingUsersByChannel((prev) => ({
          ...prev,
          [channelId]: {
            ...(prev[channelId] ?? {}),
            [userId]: username ?? userId,
          },
        }))
        const timerKey = `${channelId}:${userId}`
        if (typingTimersRef.current[timerKey]) {
          window.clearTimeout(typingTimersRef.current[timerKey])
        }
        typingTimersRef.current[timerKey] = window.setTimeout(() => {
          setTypingUsersByChannel((prev) => {
            const channelUsers = { ...(prev[channelId] ?? {}) }
            delete channelUsers[userId]
            return { ...prev, [channelId]: channelUsers }
          })
          delete typingTimersRef.current[timerKey]
        }, 3000)
        return
      }

      if (canonicalEventType === 'TYPING_STOP') {
        const payload = normalizeSocketPayload(event.payload)
        const channelId = payload.channel_id as string | undefined
        const userId = payload.user_id as string | undefined
        if (!channelId || !userId) {
          return
        }
        const timerKey = `${channelId}:${userId}`
        if (typingTimersRef.current[timerKey]) {
          window.clearTimeout(typingTimersRef.current[timerKey])
          delete typingTimersRef.current[timerKey]
        }
        setTypingUsersByChannel((prev) => {
          const channelUsers = { ...(prev[channelId] ?? {}) }
          delete channelUsers[userId]
          return { ...prev, [channelId]: channelUsers }
        })
        return
      }

      if (MESSAGE_CREATED_EVENT_TYPES.has(canonicalEventType)) {
        const payload = normalizeSocketPayload(event.payload)
        const channelId = typeof payload.channel_id === 'string' ? payload.channel_id : ''
        if (!channelId) {
          return
        }
        const message = mapSocketPayloadToMessage(payload, event.timestamp, currentUserIdRef.current)
        if (!message) {
          return
        }

        setMessagesByChannel((prev) => {
          const current = prev[channelId] ?? []
          if (current.some((item) => item.id === message.id)) {
            return prev
          }

          const next = {
            ...prev,
            [channelId]: [...current, message],
          }

          if (activeChannelIdRef.current !== channelId) {
            incrementChannelUnreadRef.current?.(channelId)
          } else {
            resetChannelUnreadRef.current?.(channelId)
            void markChannelRead(channelId).catch(() => {})
            requestAnimationFrame(() => {
              scrollToBottom()
            })
          }

          return next
        })

        if (
          typeof window !== 'undefined' &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted' &&
          document.hidden
        ) {
          const authorName = message.author ?? 'New message'
          new Notification(authorName, { body: message.content.slice(0, 120) })
        }
        return
      }

      if (MESSAGE_UPDATED_EVENT_TYPES.has(canonicalEventType)) {
        const payload = normalizeSocketPayload(event.payload)
        const messageId = payload.message_id ?? payload.id
        if (!messageId) {
          return
        }

        const channelId = (payload.channel_id as string | undefined) ?? null
        updateMessageInChannel(channelId, (messages) =>
          messages.map((message) => {
            if (message.id !== messageId) {
              return message
            }

            return {
              ...message,
              contentType: payload.content?.type ?? message.contentType ?? 'text/plain',
              content:
                typeof (payload.content?.payload ?? payload.content) === 'string'
                  ? (payload.content?.payload ?? payload.content)
                  : payload.content?.payload ?? payload.content
                    ? JSON.stringify(payload.content?.payload ?? payload.content)
                    : message.content,
              contentData: payload.content?.payload ?? payload.content ?? message.contentData,
              gameShare:
                (payload.content?.type ?? message.contentType) === 'game/share' &&
                payload.content?.payload &&
                typeof payload.content.payload === 'object'
                  ? (payload.content.payload as ChatMessage['gameShare'])
                  : message.gameShare,
              attachments:
                payload.attachments !== undefined
                  ? mapSocketAttachments(payload.attachments)
                  : message.attachments,
              reactions:
                payload.reactions !== undefined
                  ? mapSocketReactions(payload.reactions, currentUserIdRef.current)
                  : message.reactions,
              editedAt: formatSocketTimestamp(payload.updated_at ?? event.timestamp).timestamp,
            }
          }),
        )
        return
      }

      if (MESSAGE_DELETED_EVENT_TYPES.has(canonicalEventType)) {
        const payload = normalizeSocketPayload(event.payload)
        const messageId = payload.message_id ?? payload.id
        if (!messageId) {
          return
        }
        const channelId = (payload.channel_id as string | undefined) ?? null
        updateMessageInChannel(channelId, (messages) => messages.filter((message) => message.id !== messageId))
        return
      }

      if (REACTION_ADDED_EVENT_TYPES.has(canonicalEventType) || REACTION_REMOVED_EVENT_TYPES.has(canonicalEventType)) {
        const payload = normalizeSocketPayload(event.payload)
        const messageId = payload.message_id ?? payload.id
        if (!messageId) {
          return
        }

        const emoji = payload.emoji as string | undefined
        const userId = (payload.user_id as string | undefined) ?? event.user_id ?? currentUserIdRef.current
        const channelId = (payload.channel_id as string | undefined) ?? null
        const mode: 'add' | 'remove' = REACTION_ADDED_EVENT_TYPES.has(canonicalEventType) ? 'add' : 'remove'

        updateMessageInChannel(channelId, (messages) =>
          messages.map((message) => {
            if (message.id !== messageId) {
              return message
            }

            if (payload.reactions !== undefined) {
              return {
                ...message,
                reactions: mapSocketReactions(payload.reactions, currentUserIdRef.current),
              }
            }

            if (!emoji || !userId) {
              return message
            }

            return applyReactionDelta(message, emoji, userId, mode)
          }),
        )
      }
    }
    const unsubscribe = subscribeNotificationEvents(onSocketMessage)
    return () => {
      unsubscribe()
    }
  }, [scrollToBottom, subscribeNotificationEvents])

  const handleScrollToLoadMore = useCallback(
    async (event: React.UIEvent<HTMLElement>) => {
      const container = event.currentTarget
      const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight)
      const nearBottom = distanceToBottom <= 150
      setIsNearBottom(nearBottom)
      if (nearBottom && newMessageCount > 0) {
        setNewMessageCount(0)
      }
      if (container.scrollTop > 48) {
        return
      }

      const pageState = pagingByChannel[activeChannelId]
      if (!pageState || !pageState.hasMore || pageState.isLoadingMore) {
        return
      }

      setPagingByChannel((prev) => ({
        ...prev,
        [activeChannelId]: {
          ...pageState,
          isLoadingMore: true,
        },
      }))

      const previousHeight = container.scrollHeight
      isPrependingHistoryRef.current = true

      try {
        const page = await getMessages(activeChannelId, {
          limit: 50,
          offset: pageState.offset,
        })

        setMessagesByChannel((prev) => {
          const current = prev[activeChannelId] ?? []
          const next = [...page.items, ...current]
          const deduped = next.filter(
            (message, index, all) => all.findIndex((candidate) => candidate.id === message.id) === index
          )

          return {
            ...prev,
            [activeChannelId]: deduped,
          }
        })

        setPagingByChannel((prev) => ({
          ...prev,
          [activeChannelId]: {
            offset: pageState.offset + page.items.length,
            hasMore: page.items.length === 50,
            isLoadingMore: false,
          },
        }))

        requestAnimationFrame(() => {
          const updatedHeight = container.scrollHeight
          container.scrollTop = updatedHeight - previousHeight + container.scrollTop
        })
      } catch {
        setPagingByChannel((prev) => ({
          ...prev,
          [activeChannelId]: {
            ...pageState,
            isLoadingMore: false,
          },
        }))
      } finally {
        requestAnimationFrame(() => {
          isPrependingHistoryRef.current = false
        })
      }
    },
    [activeChannelId, newMessageCount, pagingByChannel]
  )

  const extractFirstUrl = useCallback((text: string): string | null => {
    const match = text.match(/https?:\/\/[^\s<]+/i)
    if (!match) return null
    const cleaned = match[0].replace(/[)"',}\]]+$/g, '')
    try {
      const parsed = new URL(cleaned)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null
      }
      return parsed.toString()
    } catch {
      return null
    }
  }, [])

  const isUnsafeEmbedUrl = useCallback((url: string): boolean => {
    const lower = url.toLowerCase()
    if (lower.includes('%22') || lower.includes('%2c') || lower.includes('%7b') || lower.includes('%7d')) {
      return true
    }
    return lower.includes('","') || lower.includes('"}')
  }, [])

  const isDirectImageUrl = useCallback((url: string): boolean => {
    try {
      const parsed = new URL(url)
      return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(parsed.pathname)
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    let isCancelled = false
    const messagesNeedingEmbed = activeMessages.filter(
      (message) => (!message.embeds || message.embeds.length === 0) && !!extractFirstUrl(message.content)
    )

    messagesNeedingEmbed.forEach((message) => {
      const url = extractFirstUrl(message.content)
      if (!url) {
        return
      }
      if (isUnsafeEmbedUrl(url)) {
        embedCacheRef.current[url] = null
        return
      }

      if (embedCacheRef.current[url] !== undefined) {
        const cached = embedCacheRef.current[url]
        if (cached) {
          setAutoEmbedsByUrl((prev) => (prev[url] ? prev : { ...prev, [url]: cached }))
        }
        return
      }

      if (embedInFlightRef.current[url]) {
        return
      }

      if (isDirectImageUrl(url)) {
        let siteName: string | undefined
        try {
          siteName = new URL(url).hostname
        } catch {
          siteName = undefined
        }
        const imageEmbed = {
          url,
          title: undefined,
          description: undefined,
          image: url,
          siteName,
        }
        embedCacheRef.current[url] = imageEmbed
        setAutoEmbedsByUrl((prev) => (prev[url] ? prev : { ...prev, [url]: imageEmbed }))
        return
      }

      embedInFlightRef.current[url] = true
      const apiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 5000)

      fetch(apiUrl, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Embed proxy failed: ${response.status}`)
          }
          return response.json() as Promise<{ contents?: string }>
        })
        .then((payload) => {
          const html = payload.contents ?? ''
          if (!html) {
            embedCacheRef.current[url] = null
            return
          }

          const doc = new DOMParser().parseFromString(html, 'text/html')
          const readMeta = (name: string) =>
            doc.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ??
            doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ??
            undefined

          const title = readMeta('og:title') ?? (doc.title || undefined)
          const description = readMeta('og:description')
          const image = readMeta('og:image')
          const siteName = readMeta('og:site_name') ?? (() => {
            try {
              return new URL(url).hostname
            } catch {
              return undefined
            }
          })()

          const hasAnyPreviewData = !!(title || description || image || siteName)
          const embed = hasAnyPreviewData
            ? {
                url,
                title,
                description,
                image,
                siteName,
              }
            : null

          embedCacheRef.current[url] = embed
          if (!isCancelled && embed) {
            setAutoEmbedsByUrl((prev) => ({ ...prev, [url]: embed }))
          }
        })
        .catch(() => {
          embedCacheRef.current[url] = null
        })
        .finally(() => {
          window.clearTimeout(timeoutId)
          delete embedInFlightRef.current[url]
        })
    })

    return () => {
      isCancelled = true
    }
  }, [activeMessages, extractFirstUrl, isDirectImageUrl, isUnsafeEmbedUrl])

  const actionButtons = [
    { icon: Reply, label: 'Reply', key: 'reply' },
    { icon: Edit, label: 'Edit', key: 'edit' },
    { icon: Trash2, label: 'Delete', key: 'delete' },
    { icon: MoreHorizontal, label: 'More', key: 'more' },
  ] as const

  const toggleReaction = async (messageId: string, emoji: string) => {
    const currentUserId = currentUserIdRef.current ?? 'you'
    const message = (messagesByChannel[activeChannelKey] ?? []).find((item) => item.id === messageId)
    const reaction = (message?.reactions ?? []).find((item) => item.emoji === emoji)
    const hasReacted = !!reaction?.hasReacted
    try {
      if (hasReacted) {
        await removeReaction(messageId, emoji)
      } else {
        await addReaction(messageId, emoji)
      }
    } catch {
      // inline API errors are handled by apiClient toast event
      return
    }
    setMessagesByChannel((prev) => {
      const messages = prev[activeChannelKey] ?? []
      const nextMessages = messages.map((message) => {
        if (message.id !== messageId) {
          return message
        }

        const currentReactions = message.reactions ?? []
        const reactionIndex = currentReactions.findIndex((reaction) => reaction.emoji === emoji)

        if (reactionIndex === -1) {
          return {
            ...message,
            reactions: [
              ...currentReactions,
              { emoji, count: 1, hasReacted: true, userIds: [currentUserId] },
            ],
          }
        }

        const reaction = currentReactions[reactionIndex]
        const nextHasReacted = !reaction.hasReacted
        const nextCount = Math.max(0, reaction.count + (nextHasReacted ? 1 : -1))
        const nextUserIds = nextHasReacted
          ? Array.from(new Set([...reaction.userIds, currentUserId]))
          : reaction.userIds.filter((id) => id !== currentUserId)

        const updatedReaction = {
          ...reaction,
          hasReacted: nextHasReacted,
          count: nextCount,
          userIds: nextUserIds,
        }

        const nextReactions = currentReactions
          .map((item, index) => (index === reactionIndex ? updatedReaction : item))
          .filter((item) => item.count > 0)

        return {
          ...message,
          reactions: nextReactions,
        }
      })

      return {
        ...prev,
        [activeChannelKey]: nextMessages,
      }
    })
  }

  const pendingImagePreviewUrls = useMemo(
    () => pendingFiles.map((file) => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null)),
    [pendingFiles]
  )
  const inFlightUploadEntries = useMemo(
    () => Object.entries(uploadProgressByFile),
    [uploadProgressByFile]
  )

  useEffect(() => {
    return () => {
      pendingImagePreviewUrls.forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [pendingImagePreviewUrls])

  const updateComposerState = useCallback(() => {
    const content = inputRef.current?.innerText.trim() ?? ''
    setComposerHasContent(content.length > 0)
    if (!activeChannelId || !content) {
      return
    }
    const now = Date.now()
    const key = `${activeChannelId}:${currentUserIdRef.current ?? 'anonymous'}`
    const lastSentAt = lastTypingSentAtRef.current[key] ?? 0
    if (now - lastSentAt < 2000) {
      return
    }
    if (!sendNotificationSocketMessage) {
      return
    }
    const sent = sendNotificationSocketMessage({
      type: 'typing.start',
      data: {
        channel_id: activeChannelId,
        username: currentUser?.username ?? '',
      },
    })
    if (!sent) {
      return
    }
    lastTypingSentAtRef.current[key] = now
  }, [activeChannelId, currentUser?.username, sendNotificationSocketMessage])

  const onSend = useCallback(
    async ({
      content,
      files,
      replyTo,
    }: {
      content: string
      files: File[]
      replyTo: ChatMessage | null
    }): Promise<boolean> => {
      if (!activeChannelId) {
        return false
      }

      const now = new Date()
      const optimisticId = `local-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
      const optimisticTimestamp = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        authorId: currentUser?.id ?? 'you',
        author: currentUser?.username ?? 'you',
        avatarUrl: currentUser?.avatar_url,
        avatarColor: 'bg-indigo-500',
        avatarInitials: (currentUser?.username?.[0] ?? 'Y').toUpperCase(),
        content,
        timestamp: optimisticTimestamp,
        date: now.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      }
      const optimisticWithReply = replyTo
        ? {
            ...optimisticMessage,
            replyTo: {
              messageId: replyTo.id,
              authorName: replyTo.author,
              authorColor: replyTo.authorColor,
              content: replyTo.content,
              hasAttachment: (replyTo.attachments ?? []).length > 0,
            },
          }
        : optimisticMessage

      setMessagesByChannel((prev) => {
        const currentMessages = prev[activeChannelKey] ?? []
        return {
          ...prev,
          [activeChannelKey]: [...currentMessages, optimisticWithReply],
        }
      })
      setPendingMessageIds((prev) => ({ ...prev, [optimisticId]: true }))
      setFailedMessageIds((prev) => {
        if (!prev[optimisticId]) {
          return prev
        }
        const next = { ...prev }
        delete next[optimisticId]
        return next
      })
      requestAnimationFrame(() => {
        scrollToBottom()
      })

      try {
        setComposerError(null)
        const attachmentIds: string[] = []

        if (files.length > 0) {
          setInFlightUploadCount((count) => count + 1)
          const uploaded = await Promise.all(
            files.map(async (file, index) => {
              const uploadKey = `${optimisticId}:${index}:${file.name}`
              const result = await uploadMessageAttachment(file, (progress) => {
                setUploadProgressByFile((prev) => ({ ...prev, [uploadKey]: progress }))
              })
              return result.attachmentId
            })
          )
          attachmentIds.push(...uploaded)
        }

        const message = await sendMessage(activeChannelId, content, attachmentIds, replyTo?.id)
        const nextMessage = replyTo
          ? {
              ...message,
              replyTo: {
                messageId: replyTo.id,
                authorName: replyTo.author,
                authorColor: replyTo.authorColor,
                content: replyTo.content,
                hasAttachment: (replyTo.attachments ?? []).length > 0,
              },
            }
          : message
        setMessagesByChannel((prev) => {
          const currentMessages = prev[activeChannelKey] ?? []
          const withoutOptimistic = currentMessages.filter((item) => item.id !== optimisticId)
          return {
            ...prev,
            [activeChannelKey]: [...withoutOptimistic, nextMessage],
          }
        })
        setPendingMessageIds((prev) => {
          if (!prev[optimisticId]) {
            return prev
          }
          const next = { ...prev }
          delete next[optimisticId]
          return next
        })
        return true
      } catch (error) {
        setComposerError(error instanceof Error ? error.message : 'Failed to send message.')
        setPendingMessageIds((prev) => {
          if (!prev[optimisticId]) {
            return prev
          }
          const next = { ...prev }
          delete next[optimisticId]
          return next
        })
        setFailedMessageIds((prev) => ({ ...prev, [optimisticId]: true }))
        return false
      } finally {
        setInFlightUploadCount((count) => Math.max(0, count - (files.length > 0 ? 1 : 0)))
        setUploadProgressByFile((prev) => {
          const next = { ...prev }
          Object.keys(next).forEach((key) => {
            if (key.startsWith(`${optimisticId}:`)) {
              delete next[key]
            }
          })
          return next
        })
      }
    },
    [activeChannelId, activeChannelKey, currentUser?.avatar_url, currentUser?.id, currentUser?.username, scrollToBottom]
  )

  const submitComposer = useCallback(() => {
    const content = inputRef.current?.innerText.trim() ?? ''
    const filesToSend = pendingFiles
    if (!content && filesToSend.length === 0) {
      return
    }

    const replySnapshot = replyToMessage

    if (inputRef.current) {
      inputRef.current.innerText = ''
    }
    setPendingFiles([])
    setComposerHasContent(false)
    setReplyToMessage(null)
    void onSend({ content, files: filesToSend, replyTo: replySnapshot })
  }, [onSend, pendingFiles, replyToMessage])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        submitComposer()
      }
    },
    [submitComposer]
  )

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.clipboardData.items)
    const imageItems = items.filter((item) => item.type.startsWith('image/'))

    if (imageItems.length > 0) {
      event.preventDefault()
      const files = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[]
      setPendingFiles((prev) => [...prev, ...files])
      return
    }

    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = inputRef.current
      if (!el) {
        return
      }
      el.focus()
      document.execCommand('insertText', false, emoji)
      updateComposerState()
    },
    [updateComposerState]
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => setPendingFiles((prev) => [...prev, ...files]),
    noClick: true,
    noKeyboard: true,
  })

  const canSend = composerHasContent || pendingFiles.length > 0

  const composerPlaceholder = `Message #${activeChannel?.name ?? 'general'}`
  const typingUsers = Object.values(typingUsersByChannel[activeChannelId] ?? {})

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
  }

  const handleMessageAction = async (action: 'reply' | 'edit' | 'delete' | 'more', message: ChatMessage) => {
    if (action === 'reply') {
      setReplyToMessage(message)
      return
    }
    if (action === 'edit') {
      setEditingMessageId(message.id)
      setEditingDraft(message.content)
      return
    }
    if (action === 'delete') {
      const confirmed = window.confirm('Bạn có chắc muốn xoá tin nhắn này không?')
      if (!confirmed) {
        return
      }
      try {
        await deleteMessage(message.id)
      } catch {
        return
      }
      setMessagesByChannel((prev) => ({
        ...prev,
        [activeChannelKey]: (prev[activeChannelKey] ?? []).filter((item) => item.id !== message.id),
      }))
    }
  }

  const saveEditedMessage = async () => {
    if (!editingMessageId) {
      return
    }
    const nextContent = editingDraft.trim()
    if (!nextContent) {
      return
    }
    try {
      const updated = await updateMessage(editingMessageId, nextContent)
      setMessagesByChannel((prev) => ({
        ...prev,
        [activeChannelKey]: (prev[activeChannelKey] ?? []).map((item) =>
          item.id === editingMessageId
            ? {
                ...item,
                content: updated.content,
                editedAt: updated.editedAt ?? item.editedAt ?? updated.timestamp,
              }
            : item
        ),
      }))
      setEditingMessageId(null)
      setEditingDraft('')
    } catch {
      // no-op
    }
  }

  const renderMessageContent = (msg: ChatMessage) => {
    if (msg.contentType !== 'game/share' || !msg.gameShare) {
      return <TextContent content={msg.content} className="text-foreground" />
    }

    const share = msg.gameShare
    const detailsHref = share.details_url ?? `/games/${share.game_id}`
    const playHref = share.play_url ?? `/games/${share.game_id}/play`
    return (
      <div className="mt-1 overflow-hidden rounded-lg border border-indigo-500/40 bg-indigo-500/5">
        <div className="flex items-center gap-3 p-3">
          <div className="h-14 w-14 overflow-hidden rounded-md bg-zinc-900">
            {share.thumbnail_url || share.hero_image_url ? (
              <img src={share.thumbnail_url ?? share.hero_image_url} alt={share.title ?? 'Game'} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Gamepad2 className="h-5 w-5 text-indigo-300" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-sm font-semibold text-zinc-100">{share.title ?? 'Shared game'}</div>
            <div className="mt-1 text-xs text-zinc-300">
              {share.share_type === 'score' && share.score !== undefined ? `Score: ${share.score}` : null}
              {share.share_type === 'achievement' && share.achievement ? `Achievement: ${share.achievement}` : null}
              {(share.comment ?? '').trim() ? ` • ${share.comment}` : ''}
              {share.share_type === 'game' ? 'Shared a game card' : ''}
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-t border-indigo-500/20 px-3 py-2">
          <Link to={playHref} className="rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-400">
            Play
          </Link>
          <Link to={detailsHref} className="rounded-md border border-zinc-600 px-2.5 py-1 text-xs font-medium text-zinc-100 hover:bg-zinc-800">
            Details
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      <div className="flex-none">
        <ChannelHeader
          channel={activeChannel}
          topic="Welcome to the channel"
          showMembers={showMembers}
          onToggleMembers={() => setShowMembers((v) => !v)}
        />
      </div>

      <section
        ref={messageListRef}
        onScroll={handleScrollToLoadMore}
        onClick={markActiveChannelAsRead}
        onFocus={markActiveChannelAsRead}
        onMouseEnter={markActiveChannelAsRead}
        className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
      >
        <div className="py-4">
          <Hash className="w-16 h-16 p-3 rounded-full bg-muted text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground">
            Welcome to #{activeChannel?.name ?? 'general'}
          </h2>
          <p className="text-muted-foreground text-sm">
            This is the start of #{activeChannel?.name ?? 'general'} channel.
          </p>
        </div>

        <div className="flex items-center gap-3 my-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Today
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-1">
          {grouped.map((msg) => {
            const username = msg.author ?? 'unknown'
            const avatarLetter = msg.avatarInitials ?? username[0]?.toUpperCase() ?? '?'
            const imageAttachments = (msg.attachments ?? []).filter(
              (attachment) => attachment.type === 'image' || attachment.type === 'gif'
            )
            const videoAttachments = (msg.attachments ?? []).filter(
              (attachment) => attachment.type === 'video'
            )
            const fileAttachments = (msg.attachments ?? []).filter(
              (attachment) => attachment.type === 'file' || attachment.type === 'audio'
            )
            const reactions = msg.reactions ?? []
            const hasPersonalMention = Boolean(
              (currentUser?.username && msg.content.includes(`@${currentUser.username}`)) ||
              msg.content.includes('@everyone')
            )
            const isPending = !!pendingMessageIds[msg.id]
            const isFailed = !!failedMessageIds[msg.id]

            if (msg.startsGroup) {
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'relative group overflow-visible',
                    hasPersonalMention ? 'border-l-2 border-indigo-500 pl-1' : ''
                  )}
                >
                  {msg.replyTo && <ReplyPreview replyTo={msg.replyTo} />}
                  <div className="flex gap-3 px-2 py-1 rounded-md hover:bg-white/5">
                    {msg.avatarUrl ? (
                      <img
                        src={msg.avatarUrl}
                        alt={username}
                        className="mt-0.5 h-10 w-10 flex-shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                          msg.avatarColor ?? 'bg-muted'
                        }`}
                      >
                        {avatarLetter}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-baseline">
                        <span className={`text-sm font-semibold ${msg.authorColor ?? 'text-foreground'}`}>
                          {username}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {msg.timestamp}
                        </span>
                        {isPending && (
                          <span className="ml-2 text-xs text-amber-400">đang gửi...</span>
                        )}
                        {isFailed && (
                          <span className="ml-2 text-xs text-red-400">gửi thất bại</span>
                        )}
                        {msg.editedAt && (
                          <span className="text-xs text-muted-foreground ml-2">(đã chỉnh sửa)</span>
                        )}
                      </div>
                      {editingMessageId === msg.id ? (
                        <textarea
                          value={editingDraft}
                          onChange={(event) => setEditingDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault()
                              void saveEditedMessage()
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault()
                              setEditingMessageId(null)
                              setEditingDraft('')
                            }
                          }}
                          className="mt-1 min-h-[60px] w-full rounded-md border border-border bg-background/60 p-2 text-sm text-foreground outline-none"
                        />
                      ) : renderMessageContent(msg)}
                      {imageAttachments.length > 0 && <ImageAttachment attachments={imageAttachments} />}
                      {videoAttachments.map((attachment) => (
                        <VideoAttachment key={attachment.id} url={attachment.url} />
                      ))}
                      {fileAttachments.map((attachment) => (
                        <FileAttachment key={attachment.id} attachment={attachment} />
                      ))}
                      {(msg.embeds && msg.embeds.length > 0
                        ? msg.embeds
                        : (() => {
                            const contentUrl = extractFirstUrl(msg.content)
                            return contentUrl && autoEmbedsByUrl[contentUrl] ? [autoEmbedsByUrl[contentUrl]] : []
                          })()
                      ).map((embed, index) => (
                        <LinkEmbed key={`${msg.id}-${embed.url}-${index}`} embed={embed} />
                      ))}
                      <ReactionBar
                        reactions={reactions}
                        onToggleReaction={(emoji) => toggleReaction(msg.id, emoji)}
                      />
                    </div>
                  </div>

                  <div
                    className={cn(
                      'absolute right-2 top-1 z-20 overflow-visible bg-card border border-border rounded-md shadow-sm px-1 gap-0.5',
                      reactionPickerMessageId === msg.id ? 'flex' : 'hidden group-hover:flex'
                    )}
                  >
                    <EmojiPicker
                      open={reactionPickerMessageId === msg.id}
                      onOpenChange={(open) => setReactionPickerMessageId(open ? msg.id : null)}
                      onSelect={(emoji) => toggleReaction(msg.id, emoji)}
                      trigger={(
                        <button
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                          type="button"
                        >
                          <SmilePlus className="w-4 h-4" />
                        </button>
                      )}
                    />
                    {actionButtons.map(({ icon: Icon, label, key }) => (
                      <Tooltip key={label}>
                        <TooltipTrigger asChild>
                          <button
                            className="cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                            type="button"
                            onClick={() => void handleMessageAction(key, msg)}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className={cn(
                  'relative group overflow-visible pl-[52px] py-0.5 rounded-md hover:bg-white/5',
                  hasPersonalMention ? 'border-l-2 border-indigo-500' : ''
                )}
              >
                {msg.replyTo && <ReplyPreview replyTo={msg.replyTo} />}
                {editingMessageId === msg.id ? (
                  <textarea
                    value={editingDraft}
                    onChange={(event) => setEditingDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void saveEditedMessage()
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        setEditingMessageId(null)
                        setEditingDraft('')
                      }
                    }}
                    className="mt-1 min-h-[60px] w-full rounded-md border border-border bg-background/60 p-2 text-sm text-foreground outline-none"
                  />
                ) : renderMessageContent(msg)}
                {(isPending || isFailed) && (
                  <div className="mt-0.5 text-xs">
                    {isPending && <span className="text-amber-400">đang gửi...</span>}
                    {!isPending && isFailed && <span className="text-red-400">gửi thất bại</span>}
                  </div>
                )}
                {imageAttachments.length > 0 && <ImageAttachment attachments={imageAttachments} />}
                {videoAttachments.map((attachment) => (
                  <VideoAttachment key={attachment.id} url={attachment.url} />
                ))}
                {fileAttachments.map((attachment) => (
                  <FileAttachment key={attachment.id} attachment={attachment} />
                ))}
                {(msg.embeds && msg.embeds.length > 0
                  ? msg.embeds
                  : (() => {
                      const contentUrl = extractFirstUrl(msg.content)
                      return contentUrl && autoEmbedsByUrl[contentUrl] ? [autoEmbedsByUrl[contentUrl]] : []
                    })()
                ).map((embed, index) => (
                  <LinkEmbed key={`${msg.id}-${embed.url}-${index}`} embed={embed} />
                ))}
                <ReactionBar
                  reactions={reactions}
                  onToggleReaction={(emoji) => toggleReaction(msg.id, emoji)}
                />
                <div
                  className={cn(
                    'absolute right-2 top-0 z-20 overflow-visible bg-card border border-border rounded-md shadow-sm px-1 gap-0.5',
                    reactionPickerMessageId === msg.id ? 'flex' : 'hidden group-hover:flex'
                  )}
                >
                  <EmojiPicker
                    open={reactionPickerMessageId === msg.id}
                    onOpenChange={(open) => setReactionPickerMessageId(open ? msg.id : null)}
                    onSelect={(emoji) => toggleReaction(msg.id, emoji)}
                    trigger={(
                      <button
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                        type="button"
                      >
                        <SmilePlus className="w-4 h-4" />
                      </button>
                    )}
                  />
                  {actionButtons.map(({ icon: Icon, label, key }) => (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <button
                          className="cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                          type="button"
                          onClick={() => void handleMessageAction(key, msg)}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {newMessageCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-md"
            onClick={() => {
              const list = messageListRef.current
              if (!list) {
                return
              }
              list.scrollTop = list.scrollHeight
              setNewMessageCount(0)
              setIsNearBottom(true)
            }}
          >
            ↓ {newMessageCount} tin nhắn mới
          </button>
        </div>
      )}

      <footer className="flex-none mx-4 mb-4">
        <div
          {...getRootProps()}
          className={`relative rounded-lg bg-[hsl(240,3.7%,18%)] ${canSend ? 'ring-1 ring-indigo-500/30' : ''}`}
        >
          {isDragActive && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-indigo-500/50 bg-indigo-500/10">
              <p className="font-semibold text-indigo-400">Drop files to upload</p>
            </div>
          )}

          <input {...getInputProps()} />

          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-2">
              {pendingFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="group relative">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={pendingImagePreviewUrls[index] ?? undefined}
                      alt={file.name}
                      className="h-16 w-16 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-md border border-border bg-[hsl(240,4%,18%)]">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="w-12 truncate text-center text-[9px] text-muted-foreground">
                        {file.name}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePendingFile(index)}
                    className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-red-500 text-[10px] text-white group-hover:flex"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {inFlightUploadCount > 0 && (
            <div className="px-3 pb-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading attachments...</span>
              </div>
              {inFlightUploadEntries.map(([key, progress]) => {
                const fileLabel = key.split(':').slice(2).join(':') || 'file'
                return (
                  <p key={key} className="truncate">
                    {fileLabel}: {progress}%
                  </p>
                )
              })}
            </div>
          )}

          {composerError && (
            <p className="px-3 pb-2 text-xs text-red-400">{composerError}</p>
          )}

          {replyToMessage && (
            <div className="mx-3 mt-2 rounded-md border border-border bg-background/50 px-2 py-1">
              <ReplyPreview
                replyTo={{
                  messageId: replyToMessage.id,
                  authorName: replyToMessage.author,
                  authorColor: replyToMessage.authorColor,
                  content: replyToMessage.content,
                  hasAttachment: (replyToMessage.attachments ?? []).length > 0,
                }}
              />
              <button
                type="button"
                className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setReplyToMessage(null)}
              >
                Huỷ trả lời
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 px-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                  type="button"
                  onClick={open}
                >
                  <Plus className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Add Attachment</TooltipContent>
            </Tooltip>

            <div
              ref={inputRef}
              contentEditable
              suppressContentEditableWarning
              onFocus={markActiveChannelAsRead}
              onClick={markActiveChannelAsRead}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onInput={updateComposerState}
              className="min-h-[44px] max-h-[300px] min-w-0 flex-1 overflow-y-auto break-words bg-transparent py-[11px] text-[15px] text-foreground outline-none"
              data-placeholder={composerPlaceholder}
            />

            <div className="flex items-center gap-1 pb-2">
              {[
                { icon: Gift, label: 'Gift' },
                { icon: Image, label: 'GIF' },
                { icon: Gamepad2, label: 'Games' },
              ].map(({ icon: Icon, label }) => (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <button
                      className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground"
                      type="button"
                      onClick={() => {
                        if (label === 'Games') {
                          setIsGamesLauncherOpen(true)
                        }
                      }}
                    >
                      <Icon className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
              <EmojiPicker
                align="end"
                onSelect={insertEmoji}
                trigger={(
                  <button
                    className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground"
                    type="button"
                  >
                    <Smile className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              />
            </div>
          </div>
          {typingUsers.length > 0 && (
            <p className="px-3 pb-2 text-xs italic text-muted-foreground">
              {typingUsers.join(', ')} đang nhắn tin...
            </p>
          )}
        </div>
      </footer>
      <Dialog open={isGamesLauncherOpen} onOpenChange={setIsGamesLauncherOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Quick launcher
            </DialogTitle>
            <DialogDescription>Chon game de mo nhanh trang play.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {quickGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => {
                  setIsGamesLauncherOpen(false)
                  void navigate(`/games/${game.id}/play`)
                }}
                className="rounded-md border border-border bg-background p-3 text-left hover:bg-accent"
              >
                <div className="text-sm font-medium">{game.title}</div>
                <div className="text-xs text-muted-foreground">
                  {game.source} • {game.rating.toFixed(1)} stars
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
