import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Separator, cn } from '@goportal/ui'
import { ChannelHeader } from '@goportal/feature-channels'
import {
  Edit,
  FileText,
  Gift,
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
import { useOutletContext } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui'
import { getMessages, sendMessage, uploadMessageAttachment } from '@goportal/app-core'
import type { LinkEmbed as LinkEmbedData } from '@goportal/app-core'
import type { Message as ChatMessage } from '@goportal/app-core'
import type { ChannelDTO } from '@goportal/types'
import { useAuthStore } from '@goportal/store'
import { WS_URL } from '@goportal/config'
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
}

type NotificationSocketEnvelope = {
  type?: string
  user_id?: string
  payload?: any
  priority?: string
  timestamp?: string
  event_id?: string
}

const MESSAGE_CREATED_EVENT_TYPES = new Set([
  'CHAT_MESSAGE_CREATED',
  'MESSAGE_CREATED',
  'MESSAGE_CREATE',
  'MESSAGE:CREATE',
])

const MESSAGE_UPDATED_EVENT_TYPES = new Set([
  'CHAT_MESSAGE_UPDATED',
  'MESSAGE_UPDATED',
  'MESSAGE_UPDATE',
  'MESSAGE:UPDATE',
])

const MESSAGE_DELETED_EVENT_TYPES = new Set([
  'CHAT_MESSAGE_DELETED',
  'MESSAGE_DELETED',
  'MESSAGE_DELETE',
  'MESSAGE:DELETE',
])

const REACTION_ADDED_EVENT_TYPES = new Set([
  'MESSAGE_REACTION_ADDED',
  'REACTION_ADDED',
  'MESSAGE:REACTION:ADD',
])

const REACTION_REMOVED_EVENT_TYPES = new Set([
  'MESSAGE_REACTION_REMOVED',
  'REACTION_REMOVED',
  'MESSAGE:REACTION:REMOVE',
])

const VOICE_ACTIVITY_EVENT_TYPES = new Set([
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
  const topLevelType = normalizeEventType(event.type)
  const payloadType = normalizeEventType(event.payload?.event_type ?? event.payload?.type)
  if (topLevelType === 'POPUP') {
    if (payloadType) {
      return payloadType
    }
    if (event.payload?.message_id && event.payload?.channel_id) {
      return 'CHAT_MESSAGE_CREATED'
    }
  }
  return payloadType || topLevelType
}

const buildNotificationSocketTargets = (rawUrl: string, userId: string, token?: string | null): string[] => {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return []
  }

  if (parsed.protocol === 'http:') {
    parsed.protocol = 'ws:'
  } else if (parsed.protocol === 'https:') {
    parsed.protocol = 'wss:'
  }

  if (!parsed.pathname || parsed.pathname === '/') {
    parsed.pathname = '/ws'
  }

  const setCommonParams = (url: URL) => {
    url.searchParams.set('user_id', userId)
    if (token) {
      url.searchParams.set('token', token)
    }
  }

  const targets: URL[] = []
  const addTarget = (url: URL) => {
    setCommonParams(url)
    targets.push(url)
  }

  if (
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
    parsed.port === '8080'
  ) {
    const preferred = new URL(parsed.toString())
    preferred.port = '8090'
    addTarget(preferred)

    const fallback = new URL(parsed.toString())
    fallback.port = '8085'
    addTarget(fallback)
  }

  addTarget(parsed)
  return Array.from(new Set(targets.map((target) => target.toString())))
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

  return {
    id: messageId,
    authorId,
    author,
    avatarUrl: payload?.author?.avatar_url,
    avatarColor: payload?.author?.avatar_color ?? messageColorFromId(authorId),
    avatarInitials: messageInitialsFromName(author),
    content: payload?.content?.payload ?? payload?.content ?? '',
    timestamp,
    date,
    editedAt: payload?.updated_at
      ? formatSocketTimestamp(payload.updated_at).timestamp
      : undefined,
    attachments: mapSocketAttachments(payload?.attachments),
    reactions: mapSocketReactions(payload?.reactions, currentUserId),
  }
}

export const DashboardView: React.FC = () => {
  const {
    showMembers,
    setShowMembers,
    activeChannelId,
    activeCategories,
    incrementChannelUnread,
    resetChannelUnread,
    applyVoiceChannelActivityUpdate,
  } = useOutletContext<ShellContext>()
  const currentUser = useAuthStore((state: any) => state.user)
  const token = useAuthStore((state: any) => state.token)
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
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)
  const embedCacheRef = useRef<Record<string, LinkEmbedData | null>>({})
  const embedInFlightRef = useRef<Record<string, boolean>>({})
  const [autoEmbedsByUrl, setAutoEmbedsByUrl] = useState<Record<string, LinkEmbedData>>({})
  const activeChannelIdRef = useRef(activeChannelId)
  const currentUserIdRef = useRef<string | null>(currentUser?.id ?? null)

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId
  }, [activeChannelId])

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? null
  }, [currentUser?.id])

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
    }

    void loadInitialMessages()

    return () => {
      isCancelled = true
    }
  }, [activeChannelId])

  useEffect(() => {
    if (!activeChannelId) {
      return
    }
    resetChannelUnread?.(activeChannelId)
  }, [activeChannelId, resetChannelUnread])

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    let socket: WebSocket | null = null
    let reconnectTimer: number | null = null
    let initialConnectTimer: number | null = null
    let reconnectAttempt = 0
    let closedByClient = false

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

    const onSocketMessage = (raw: string) => {
      let event: NotificationSocketEnvelope
      try {
        event = JSON.parse(raw) as NotificationSocketEnvelope
      } catch {
        return
      }

      const eventType = resolveEnvelopeEventType(event)
      if (!eventType || eventType === 'CONNECTED') {
        return
      }

      if (VOICE_ACTIVITY_EVENT_TYPES.has(eventType)) {
        const payload = event.payload ?? {}
        const serverId = typeof payload.server_id === 'string' ? payload.server_id : ''
        const channelId = typeof payload.channel_id === 'string' ? payload.channel_id : ''
        const participants = Array.isArray(payload.participants) ? payload.participants : []

        if (serverId && channelId && applyVoiceChannelActivityUpdate) {
          applyVoiceChannelActivityUpdate({
            serverId,
            channelId,
            participants,
          })
        }
        return
      }

      if (MESSAGE_CREATED_EVENT_TYPES.has(eventType)) {
        const payload = event.payload ?? {}
        const message = mapSocketPayloadToMessage(payload, event.timestamp, currentUserIdRef.current)
        if (!message) {
          return
        }

        setMessagesByChannel((prev) => {
          const channelId = payload.channel_id as string
          const current = prev[channelId] ?? []
          if (current.some((item) => item.id === message.id)) {
            return prev
          }

          const next = {
            ...prev,
            [channelId]: [...current, message],
          }

          if (activeChannelIdRef.current !== channelId) {
            incrementChannelUnread?.(channelId)
          }

          return next
        })
        return
      }

      if (MESSAGE_UPDATED_EVENT_TYPES.has(eventType)) {
        const payload = event.payload ?? {}
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
              content: payload.content?.payload ?? payload.content ?? message.content,
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

      if (MESSAGE_DELETED_EVENT_TYPES.has(eventType)) {
        const payload = event.payload ?? {}
        const messageId = payload.message_id ?? payload.id
        if (!messageId) {
          return
        }
        const channelId = (payload.channel_id as string | undefined) ?? null
        updateMessageInChannel(channelId, (messages) => messages.filter((message) => message.id !== messageId))
        return
      }

      if (REACTION_ADDED_EVENT_TYPES.has(eventType) || REACTION_REMOVED_EVENT_TYPES.has(eventType)) {
        const payload = event.payload ?? {}
        const messageId = payload.message_id ?? payload.id
        if (!messageId) {
          return
        }

        const emoji = payload.emoji as string | undefined
        const userId = (payload.user_id as string | undefined) ?? event.user_id ?? currentUserIdRef.current
        const channelId = (payload.channel_id as string | undefined) ?? null
        const mode: 'add' | 'remove' = REACTION_ADDED_EVENT_TYPES.has(eventType) ? 'add' : 'remove'

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

    const connect = () => {
      if (closedByClient) {
        return
      }

      const targets = buildNotificationSocketTargets(WS_URL, currentUser.id, token)
      if (targets.length === 0) {
        return
      }
      const target = targets[reconnectAttempt % targets.length]
      const ws = new WebSocket(target)
      socket = ws

      ws.onopen = () => {
        if (socket !== ws) {
          return
        }
        reconnectAttempt = 0
      }

      ws.onmessage = (event) => {
        if (socket !== ws) {
          return
        }
        onSocketMessage(String(event.data))
      }

      ws.onclose = () => {
        if (socket === ws) {
          socket = null
        }
        if (closedByClient) {
          return
        }
        if (reconnectTimer) {
          window.clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt)
        reconnectAttempt += 1
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null
          connect()
        }, delay)
      }

      ws.onerror = () => {
        if (socket !== ws) {
          return
        }
        ws.close()
      }
    }

    // Delay initial connect slightly to avoid React StrictMode dev double-mount
    // from opening/closing a socket while still CONNECTING.
    initialConnectTimer = window.setTimeout(connect, 120)

    return () => {
      closedByClient = true
      if (initialConnectTimer) {
        window.clearTimeout(initialConnectTimer)
      }
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
      }
      socket?.close()
      socket = null
    }
  }, [applyVoiceChannelActivityUpdate, currentUser?.id, incrementChannelUnread, token])

  const handleScrollToLoadMore = useCallback(
    async (event: React.UIEvent<HTMLElement>) => {
      const container = event.currentTarget
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
    },
    [activeChannelId, pagingByChannel]
  )

  const extractFirstUrl = useCallback((text: string): string | null => {
    const match = text.match(/https?:\/\/[^\s<]+/i)
    return match ? match[0] : null
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

      embedInFlightRef.current[url] = true
      const apiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`

      fetch(apiUrl)
        .then((response) => response.json() as Promise<{ contents?: string }>)
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
          delete embedInFlightRef.current[url]
        })
    })

    return () => {
      isCancelled = true
    }
  }, [activeMessages, extractFirstUrl])

  const actionButtons = [
    { icon: Reply, label: 'Reply' },
    { icon: Edit, label: 'Edit' },
    { icon: Trash2, label: 'Delete' },
    { icon: MoreHorizontal, label: 'More' },
  ]

  const toggleReaction = (messageId: string, emoji: string) => {
    const currentUserId = 'you'
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
  }, [])

  const onSend = useCallback(
    async ({ content, files }: { content: string; files: File[] }): Promise<boolean> => {
      if (!activeChannelId) {
        return false
      }

      try {
        setComposerError(null)
        const attachmentIds: string[] = []

        if (files.length > 0) {
          setIsUploadingFiles(true)
          const uploaded = await Promise.all(
            files.map(async (file, index) => {
              const uploadKey = `${file.name}-${file.size}-${index}`
              const result = await uploadMessageAttachment(file, (progress) => {
                setUploadProgressByFile((prev) => ({ ...prev, [uploadKey]: progress }))
              })
              return result.attachmentId
            })
          )
          attachmentIds.push(...uploaded)
        }

        const message = await sendMessage(activeChannelId, content, attachmentIds)
        setMessagesByChannel((prev) => {
          const currentMessages = prev[activeChannelKey] ?? []
          return {
            ...prev,
            [activeChannelKey]: [...currentMessages, message],
          }
        })
        return true
      } catch (error) {
        setComposerError(error instanceof Error ? error.message : 'Failed to send message.')
        return false
      } finally {
        setIsUploadingFiles(false)
        setUploadProgressByFile({})
      }
    },
    [activeChannelId, activeChannelKey]
  )

  const handleKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        const content = inputRef.current?.innerText.trim() ?? ''
        if (!content && pendingFiles.length === 0) {
          return
        }
        const sent = await onSend({ content, files: pendingFiles })
        if (sent) {
          if (inputRef.current) {
            inputRef.current.innerText = ''
          }
          setPendingFiles([])
          setComposerHasContent(false)
        }
      }
    },
    [onSend, pendingFiles]
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

  const canSend = (composerHasContent || pendingFiles.length > 0) && !isUploadingFiles

  const composerPlaceholder = `Message #${activeChannel?.name ?? 'general'}`

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
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

            if (msg.startsGroup) {
              return (
                <div
                  key={msg.id}
                  className="relative group overflow-visible"
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
                      </div>
                      <TextContent content={msg.content} className="text-foreground" />
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
                    {actionButtons.map(({ icon: Icon, label }) => (
                      <Tooltip key={label}>
                        <TooltipTrigger asChild>
                          <button
                            className="cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                            type="button"
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
                className="relative group overflow-visible pl-[52px] py-0.5 rounded-md hover:bg-white/5"
              >
                {msg.replyTo && <ReplyPreview replyTo={msg.replyTo} />}
                <TextContent content={msg.content} className="text-foreground" />
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
                  {actionButtons.map(({ icon: Icon, label }) => (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <button
                          className="cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                          type="button"
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
                    disabled={isUploadingFiles}
                    className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-red-500 text-[10px] text-white group-hover:flex"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isUploadingFiles && (
            <div className="px-3 pb-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading attachments...</span>
              </div>
              {pendingFiles.map((file, index) => {
                const key = `${file.name}-${file.size}-${index}`
                const progress = uploadProgressByFile[key] ?? 0
                return (
                  <p key={key} className="truncate">
                    {file.name}: {progress}%
                  </p>
                )
              })}
            </div>
          )}

          {composerError && (
            <p className="px-3 pb-2 text-xs text-red-400">{composerError}</p>
          )}

          <div className="flex items-end gap-2 px-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                  type="button"
                  onClick={open}
                  disabled={isUploadingFiles}
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
              ].map(({ icon: Icon, label }) => (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <button
                      className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground"
                      type="button"
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
        </div>
      </footer>
    </div>
  )
}
