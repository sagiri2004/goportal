/**
 * App Shell Layout
 *
 * Discord-like layout:
 * [ServerRail 72px fixed] | [PanelGroup: Sidebar | Main | Members?]
 *
 * Key fixes vs previous version:
 * - panelRef → ref (react-resizable-panels v0/v1 correct API)
 * - PanelGroup: direction="horizontal" not orientation="horizontal"
 * - wrapper div gets min-w-0 w-full so Outlet never pushes panel wider
 * - resize() called AFTER state update via useEffect to guarantee ref is live
 * - members Panel conditionally mounted — PanelGroup re-evaluates sizes on mount
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Room, RoomEvent, Track } from 'livekit-client'
import { WS_URL } from '@goportal/config'
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
  type PanelImperativeHandle,
} from 'react-resizable-panels'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  TooltipProvider,
} from '@goportal/ui'
import { CreateServerModal, ServerRail } from '@goportal/feature-servers'
import { ChannelSidebar, CreateChannelModal } from '@goportal/feature-channels'
import { DirectMessagesSidebar } from '@goportal/feature-dashboard'
import { TournamentCreateEditDialog } from '../tournaments'
import { useAuthStore } from '@goportal/store'
import { Copy } from 'lucide-react'
import { MemberListPanel } from './MemberListPanel'
import { ServerSettingsOverlay } from './ServerSettingsOverlay'
import type { MockCategory, MockServer } from '../mock/servers'
import type { MockMember } from '../mock/members'
import {
  createChannel,
  createServerInvite,
  createServer,
  getChannels,
  getMembers,
  getServerById,
  getServers,
  getInvitePreview,
  joinByInviteCode,
  getVoiceToken,
  listTournamentsByServer,
  listVoiceParticipants,
  updateServerProfile,
  uploadServerMedia,
  updateMyProfile,
  uploadUserAvatar,
} from '../services'

// ─── Panel size constants (% of PanelGroup width, must sum ≤ 100) ────────────
const SIZE = {
  sidebar:        { default: 22, min: 18, max: 35 },
  mainWithMembers:  56,   // 22 + 56 + 22 = 100
  mainAlone:        78,   // 22 + 78      = 100
  members:        { default: 22, min: 15, max: 28 },
} as const

// ─── Resize handle ────────────────────────────────────────────────────────────
export const ResizeHandle: React.FC = () => (
  <PanelResizeHandle className="group relative w-[6px] flex-shrink-0 cursor-col-resize bg-transparent">
    <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-indigo-500/60 group-active:bg-indigo-500" />
  </PanelResizeHandle>
)

type VoiceState = {
  channelId: string
  channelName: string
  serverId: string
  serverName: string
  room: Room
  lastTextChannelId: string | null
  isMicrophoneEnabled: boolean
  isCameraEnabled: boolean
  isScreenShareEnabled: boolean
}

type VoiceChannelActivity = {
  activeMembers: Array<{
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

type VoiceParticipantSummary = {
  id: string
  name: string
  avatarUrl?: string
  isScreenSharing: boolean
}

type VoiceChannelActivityParticipant = {
  user_id: string
  name?: string
  avatar_url?: string
  is_screen_sharing?: boolean
}

type InviteExpiryOption = '7d' | '1d' | 'never'

const voicePalette = [
  'bg-indigo-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-rose-500',
]
const PENDING_INVITE_CODE_KEY = 'goportal_pending_invite_code'

const colorFromId = (id: string): string => {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index)) % 997
  }
  return voicePalette[hash % voicePalette.length]
}

const initialsFromName = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)

const parseParticipantMetadata = (metadata?: string): { avatarUrl?: string; displayName?: string } => {
  if (!metadata) {
    return {}
  }

  try {
    const parsed = JSON.parse(metadata) as {
      avatar_url?: string
      avatarUrl?: string
      display_name?: string
      displayName?: string
      username?: string
    }
    const avatarUrl = parsed.avatar_url ?? parsed.avatarUrl
    const displayName = parsed.display_name ?? parsed.displayName ?? parsed.username
    return {
      avatarUrl: typeof avatarUrl === 'string' && avatarUrl ? avatarUrl : undefined,
      displayName: typeof displayName === 'string' && displayName ? displayName : undefined,
    }
  } catch {
    return {}
  }
}

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: number | null = null
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error('LiveKit connection timeout'))
      }, timeoutMs)
    })
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  }
}

const buildConnectTargets = (url: string): string[] => {
  const targets = new Set<string>([url])
  try {
    const parsed = new URL(url)
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && parsed.protocol === 'ws:') {
      const secure = new URL(url)
      secure.protocol = 'wss:'
      targets.add(secure.toString())
    }
    if (parsed.hostname === 'localhost') {
      const ipv4 = new URL(url)
      ipv4.hostname = '127.0.0.1'
      targets.add(ipv4.toString())
    }
  } catch {
    // ignore invalid URL and keep original
  }
  return Array.from(targets)
}

const normalizeNotificationEventType = (raw: unknown): string =>
  typeof raw === 'string' ? raw.trim().toUpperCase() : ''

const resolveNotificationEventType = (event: any): string => {
  const topLevelType = normalizeNotificationEventType(event?.type)
  const payloadType = normalizeNotificationEventType(event?.payload?.event_type ?? event?.payload?.type)
  if (topLevelType === 'POPUP') {
    return payloadType || topLevelType
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

const InviteMemberDialog: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
}> = ({ open, onOpenChange, serverId }) => {
  const [expiryOption, setExpiryOption] = useState<InviteExpiryOption>('7d')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteExpiresAt, setInviteExpiresAt] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setError(null)
    setCopied(false)
  }, [open])

  const getExpiresAt = useCallback((option: InviteExpiryOption): number | undefined => {
    const now = Math.floor(Date.now() / 1000)
    if (option === '7d') return now + 7 * 24 * 60 * 60
    if (option === '1d') return now + 24 * 60 * 60
    return undefined
  }, [])

  const generateInvite = useCallback(async (option: InviteExpiryOption) => {
    if (!serverId) {
      return
    }

    setIsCreating(true)
    setError(null)
    try {
      const invite = await createServerInvite(serverId, {
        max_uses: 0,
        expires_at: getExpiresAt(option),
      })
      const nextLink = invite.invite_url || `${window.location.origin}/invite/${invite.invite_code}`
      setInviteLink(nextLink)
      setInviteExpiresAt(invite.expires_at ?? null)
    } catch (createError: any) {
      setError(createError?.message ?? 'Không thể tạo liên kết mời.')
    } finally {
      setIsCreating(false)
    }
  }, [getExpiresAt, serverId])

  useEffect(() => {
    if (!open || !serverId || inviteLink) {
      return
    }
    void generateInvite(expiryOption)
  }, [expiryOption, generateInvite, inviteLink, open, serverId])

  const handleCopy = async () => {
    if (!inviteLink) {
      return
    }
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lời mời</DialogTitle>
          <DialogDescription>Tạo hoặc sao chép liên kết mời vào server.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-expiry">Hết hạn</Label>
            <select
              id="invite-expiry"
              value={expiryOption}
              onChange={(e) => {
                const next = e.target.value as InviteExpiryOption
                setExpiryOption(next)
                setInviteLink('')
                setInviteExpiresAt(null)
              }}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="7d">7 ngày</option>
              <option value="1d">1 ngày</option>
              <option value="never">Không hết hạn</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-link">Liên kết mời</Label>
            <div className="flex items-center gap-2">
              <Input
                id="invite-link"
                readOnly
                value={inviteLink}
                placeholder={isCreating ? 'Đang tạo liên kết...' : 'Chưa có liên kết mời'}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCopy()}
                disabled={!inviteLink}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copied && <p className="text-xs text-green-400">Đã sao chép</p>}
            {inviteExpiresAt ? (
              <p className="text-xs text-muted-foreground">
                Hết hạn: {new Date(inviteExpiresAt * 1000).toLocaleString('vi-VN')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Liên kết không hết hạn.</p>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button type="button" onClick={() => void generateInvite(expiryOption)} disabled={isCreating}>
            {isCreating ? 'Đang tạo...' : 'Tạo lại'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const UserSettingsDialog: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string
  avatarURL?: string | null
  onUpdated: (username: string, avatarURL: string | null) => void
}> = ({ open, onOpenChange, username, avatarURL, onUpdated }) => {
  const [name, setName] = useState(username)
  const [avatar, setAvatar] = useState<string | null>(avatarURL ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setName(username)
    setAvatar(avatarURL ?? null)
    setError(null)
    setIsSaving(false)
    setIsUploading(false)
  }, [avatarURL, open, username])

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    setError(null)
    try {
      const uploadedURL = await uploadUserAvatar(file)
      setAvatar(uploadedURL)
    } catch (uploadError: any) {
      setError(uploadError?.message ?? 'Không thể tải ảnh đại diện.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 3) {
      setError('Tên người dùng phải có ít nhất 3 ký tự.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const payload: { username?: string; avatar_url?: string } = {}
      if (trimmed !== username) {
        payload.username = trimmed
      }
      if ((avatar ?? '') !== (avatarURL ?? '')) {
        payload.avatar_url = avatar ?? ''
      }
      if (Object.keys(payload).length > 0) {
        const updated = await updateMyProfile(payload)
        onUpdated(updated.username, updated.avatar_url ?? null)
      }
      onOpenChange(false)
    } catch (saveError: any) {
      setError(saveError?.message ?? 'Không thể cập nhật hồ sơ.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cài đặt người dùng</DialogTitle>
          <DialogDescription>Cập nhật ảnh đại diện và tên hiển thị.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-accent"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSaving}
            >
              {avatar ? (
                <img src={avatar} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-semibold">{name[0]?.toUpperCase() ?? 'U'}</span>
              )}
            </button>
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSaving}
              >
                {isUploading ? 'Đang tải...' : 'Đổi ảnh đại diện'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void handleUpload(file)
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-settings-username">Tên người dùng</Label>
            <Input
              id="user-settings-username"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving || isUploading}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Đóng
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving || isUploading}>
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
export const AppShell: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams<{ serverId?: string; channelId?: string; tournamentId?: string }>()
  const isDmMode = useMemo(() => location.pathname.includes('/app/@me'), [location.pathname])
  const isVoiceMode = useMemo(() => location.pathname.includes('/app/servers/') && location.pathname.includes('/voice/'), [location.pathname])
  const isTournamentMode = useMemo(
    () => location.pathname.includes('/app/servers/') && location.pathname.includes('/tournaments'),
    [location.pathname],
  )

  const [activeServerId, setActiveServerId] = useState('')
  const [activeChannelId, setActiveChannelId] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [servers, setServers] = useState<MockServer[]>([])
  const [isCreateServerModalOpen, setIsCreateServerModalOpen] = useState(false)
  const [createServerModalInviteCode, setCreateServerModalInviteCode] = useState<string | null>(null)
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false)
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false)
  const [serverSettingsTab, setServerSettingsTab] = useState<'profile' | 'members'>('profile')
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }
    return window.localStorage.getItem('has_seen_onboarding') === 'true'
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [serverDetails, setServerDetails] = useState<Record<string, MockServer>>({})
  const [channelsByServer, setChannelsByServer] = useState<Record<string, MockCategory[]>>({})
  const [membersByServer, setMembersByServer] = useState<Record<string, MockMember[]>>({})
  const [tournamentsByServer, setTournamentsByServer] = useState<
    Record<string, Array<{ id: string; name: string; status: 'draft' | 'registration' | 'check_in' | 'in_progress' | 'completed' | 'cancelled' }>>
  >({})
  const [isCreateTournamentModalOpen, setIsCreateTournamentModalOpen] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState | null>(null)
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false)
  const [voiceActivityByChannel, setVoiceActivityByChannel] = useState<Record<string, VoiceChannelActivity>>({})
  const currentUser = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const currentUsername = currentUser?.username

  // Imperative handle — resize main panel when member list toggles
  const mainRef = useRef<PanelImperativeHandle>(null)
  const toastTimerRef = useRef<number | null>(null)
  const voiceStateRef = useRef<VoiceState | null>(null)
  const joinVoiceInFlightRef = useRef<string | null>(null)
  const pendingVoiceRoomRef = useRef<Room | null>(null)
  const voiceJoinAttemptRef = useRef(0)

  const markOnboardingSeen = useCallback(() => {
    setHasSeenOnboarding(true)
    localStorage.setItem('has_seen_onboarding', 'true')
  }, [])

  const pushToast = useCallback((message: string) => {
    setToastMessage(message)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null)
      toastTimerRef.current = null
    }, 2500)
  }, [])

  const showDevelopingToast = useCallback(() => {
    pushToast('Tính năng đang phát triển')
  }, [pushToast])

  const handleLogout = useCallback(() => {
    try {
      useAuthStore.getState().logout()
    } catch {
      // no-op
    }
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth-token')
    localStorage.removeItem('auth-store')
    window.location.href = '/auth/login'
  }, [])

  const openCreateServerModal = useCallback((inviteCode?: string | null) => {
    setCreateServerModalInviteCode(inviteCode?.trim() || null)
    setIsCreateServerModalOpen(true)
  }, [])

  const closeCreateServerModal = useCallback((open: boolean) => {
    setIsCreateServerModalOpen(open)
    if (!open) {
      setCreateServerModalInviteCode(null)
    }
  }, [])

  const mapVoiceParticipantsToActivity = useCallback((participants: VoiceParticipantSummary[]): VoiceChannelActivity => {
    const activeMembers = participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      avatarUrl: participant.avatarUrl,
      initials: initialsFromName(participant.name || participant.id || '?'),
      color: colorFromId(participant.id || participant.name || 'member'),
      isStreaming: participant.isScreenSharing,
    }))

    const hasScreenShare = participants.some((participant) => participant.isScreenSharing)
    return {
      activeMembers,
      liveLabel: hasScreenShare ? 'Đang chia sẻ màn hình' : undefined,
      isLive: hasScreenShare,
    }
  }, [])

  const syncVoiceStateFromRoom = useCallback((room: Room) => {
    const localParticipant = room.localParticipant
    setVoiceState((prev) => {
      if (!prev || prev.room !== room) {
        return prev
      }

      return {
        ...prev,
        isMicrophoneEnabled: localParticipant.isMicrophoneEnabled,
        isCameraEnabled: localParticipant.isCameraEnabled,
        isScreenShareEnabled: localParticipant.isScreenShareEnabled,
      }
    })
  }, [])

  const syncCurrentRoomActivity = useCallback((state: VoiceState) => {
    const remoteParticipants = Array.from(state.room.remoteParticipants.values())
    const participants: VoiceParticipantSummary[] = [
      {
        id: state.room.localParticipant.identity,
        name: state.room.localParticipant.name || currentUser?.username || 'You',
        avatarUrl: currentUser?.avatar_url ?? undefined,
        isScreenSharing: state.room.localParticipant.isScreenShareEnabled,
      },
      ...remoteParticipants.map((participant) => {
        const meta = parseParticipantMetadata(participant.metadata)
        return {
          id: participant.identity,
          name: meta.displayName || participant.name || participant.identity,
          avatarUrl: meta.avatarUrl,
          isScreenSharing:
            participant.getTrackPublication(Track.Source.ScreenShare) != null ||
            participant.getTrackPublication(Track.Source.ScreenShareAudio) != null,
        }
      }),
    ]

    setVoiceActivityByChannel((prev) => ({
      ...prev,
      [state.channelId]: mapVoiceParticipantsToActivity(participants),
    }))
  }, [currentUser?.avatar_url, currentUser?.username, mapVoiceParticipantsToActivity])

  const applyVoiceChannelActivityUpdate = useCallback((update: {
    serverId: string
    channelId: string
    participants: VoiceChannelActivityParticipant[]
  }) => {
    if (!update.serverId || !update.channelId) {
      return
    }
    if (update.serverId !== activeServerId) {
      return
    }

    const participants: VoiceParticipantSummary[] = (update.participants ?? []).map((participant) => {
      const name = participant.name?.trim() || participant.user_id
      return {
        id: participant.user_id,
        name,
        avatarUrl: participant.avatar_url,
        isScreenSharing: Boolean(participant.is_screen_sharing),
      }
    })

    setVoiceActivityByChannel((prev) => ({
      ...prev,
      [update.channelId]: mapVoiceParticipantsToActivity(participants),
    }))
  }, [activeServerId, mapVoiceParticipantsToActivity])

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    let socket: WebSocket | null = null
    let reconnectTimer: number | null = null
    let initialConnectTimer: number | null = null
    let reconnectAttempt = 0
    let closedByClient = false

    const onSocketMessage = (raw: string) => {
      let event: any
      try {
        event = JSON.parse(raw)
      } catch {
        return
      }

      const eventType = resolveNotificationEventType(event)
      if (!eventType || eventType === 'CONNECTED') {
        return
      }
      if (eventType !== 'VOICE_CHANNEL_ACTIVITY_UPDATED' && eventType !== 'VOICE_ACTIVITY_UPDATED') {
        return
      }

      const payload = event.payload ?? {}
      const serverId = typeof payload.server_id === 'string' ? payload.server_id : ''
      const channelId = typeof payload.channel_id === 'string' ? payload.channel_id : ''
      const participants = Array.isArray(payload.participants) ? payload.participants : []
      if (!serverId || !channelId) {
        return
      }

      applyVoiceChannelActivityUpdate({
        serverId,
        channelId,
        participants,
      })
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

    initialConnectTimer = window.setTimeout(connect, 150)

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
  }, [applyVoiceChannelActivityUpdate, currentUser?.id, token])

  const refreshVoiceSidebarActivity = useCallback(async (serverId: string) => {
    if (!serverId) {
      return
    }

    const categories = channelsByServer[serverId] ?? []
    const voiceChannels = categories.flatMap((category) =>
      category.channels.filter((channel) => channel.type === 'voice')
    )
    if (voiceChannels.length === 0) {
      return
    }

    const results = await Promise.allSettled(
      voiceChannels.map(async (channel) => {
        const response = await listVoiceParticipants(channel.id)
        return { channelId: channel.id, participants: response.items ?? [] }
      }),
    )

    setVoiceActivityByChannel((prev) => {
      const next = { ...prev }
      voiceChannels.forEach((channel) => {
        if (!next[channel.id]) {
          next[channel.id] = mapVoiceParticipantsToActivity([])
        }
      })

      results.forEach((result) => {
        if (result.status !== 'fulfilled') {
          return
        }
        const participants: VoiceParticipantSummary[] = result.value.participants.map((participant) => ({
          id: participant.user_id,
          name: participant.name || participant.user_id,
          avatarUrl: participant.avatar_url,
          isScreenSharing: Boolean(participant.is_screen_sharing),
        }))
        next[result.value.channelId] = mapVoiceParticipantsToActivity(participants)
      })

      return next
    })
  }, [channelsByServer, mapVoiceParticipantsToActivity])

  // After showMembers flips, imperatively resize main panel.
  // useEffect runs after render so mainRef is guaranteed to be attached.
  useEffect(() => {
    const target = showMembers ? SIZE.mainWithMembers : SIZE.mainAlone
    mainRef.current?.resize(target)
  }, [showMembers])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
      if (pendingVoiceRoomRef.current) {
        void pendingVoiceRoomRef.current.disconnect()
      }
      if (voiceStateRef.current) {
        void voiceStateRef.current.room.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    voiceStateRef.current = voiceState
  }, [voiceState])

  useEffect(() => {
    if (params.serverId) {
      setActiveServerId(params.serverId)
    }
  }, [params.serverId])

  useEffect(() => {
    if (params.channelId) {
      setActiveChannelId(params.channelId)
    }
  }, [params.channelId])

  useEffect(() => {
    const isTextChannelRoute =
      location.pathname.includes('/app/servers/') && location.pathname.includes('/channels/')
    if (!isTextChannelRoute || !params.serverId || !params.channelId) {
      return
    }
    localStorage.setItem(
      'last_visited',
      JSON.stringify({ serverId: params.serverId, channelId: params.channelId }),
    )
  }, [location.pathname, params.channelId, params.serverId])

  useEffect(() => {
    if (isVoiceMode) {
      setShowMembers(false)
    }
  }, [isVoiceMode])

  useEffect(() => {
    const pendingInviteCode = localStorage.getItem(PENDING_INVITE_CODE_KEY)
    if (!pendingInviteCode) {
      return
    }
    localStorage.removeItem(PENDING_INVITE_CODE_KEY)
    openCreateServerModal(pendingInviteCode)
  }, [openCreateServerModal])

  useEffect(() => {
    let isCancelled = false

    const loadServers = async () => {
      const data = await getServers()
      if (isCancelled) {
        return
      }

      setServers(data)

      if (data.length === 0) {
        navigate('/app/@me', { replace: true })
        return
      }

      const paramServerId = params.serverId
      const nextServerId =
        paramServerId && data.some((server) => server.id === paramServerId)
          ? paramServerId
          : data[0].id
      setActiveServerId(nextServerId)

      if (location.pathname === '/app') {
        return
      }

      if ((!paramServerId || paramServerId !== nextServerId) && !isDmMode) {
        try {
          const channelData = await getChannels(nextServerId)
          if (isCancelled) {
            return
          }

          const availableChannels = channelData.categories.flatMap((category) => category.channels)
          const firstText = availableChannels.find((channel) => channel.type === 'text') ?? availableChannels[0]
          if (!firstText) {
            navigate('/app/@me', { replace: true })
            return
          }
          navigate(`/app/servers/${nextServerId}/channels/${firstText.id}`, { replace: true })
        } catch {
          navigate('/app/@me', { replace: true })
        }
      }
    }

    void loadServers().catch(() => {
      if (!isCancelled) {
        navigate('/app/@me', { replace: true })
      }
    })

    return () => {
      isCancelled = true
    }
  }, [isDmMode, location.pathname, navigate, params.serverId])

  useEffect(() => {
    let isCancelled = false

    const loadServerDetail = async () => {
      if (!activeServerId) {
        return
      }

      const detail = await getServerById(activeServerId)
      if (!detail || isCancelled) {
        return
      }

      setServerDetails((prev) => ({
        ...prev,
        [activeServerId]: detail,
      }))
    }

    void loadServerDetail()

    return () => {
      isCancelled = true
    }
  }, [activeServerId])

  useEffect(() => {
    let isCancelled = false

    const loadChannels = async () => {
      if (!activeServerId) {
        return
      }

      const data = await getChannels(activeServerId)
      if (isCancelled) {
        return
      }

      setChannelsByServer((prev) => ({
        ...prev,
        [activeServerId]: data.categories,
      }))

      const availableChannels = data.categories.flatMap((category) => category.channels)
      const hasActiveChannel = availableChannels.some((channel) => channel.id === activeChannelId)

      if (!hasActiveChannel && availableChannels.length > 0) {
        if (isVoiceMode || isTournamentMode) {
          return
        }
        const fallbackChannel = availableChannels[0]
        setActiveChannelId(fallbackChannel.id)
        navigate(`/app/servers/${activeServerId}/channels/${fallbackChannel.id}`, { replace: true })
      }
    }

    void loadChannels()

    return () => {
      isCancelled = true
    }
  }, [activeChannelId, activeServerId, isTournamentMode, isVoiceMode, navigate])

  useEffect(() => {
    let isCancelled = false

    const loadMembers = async () => {
      if (!activeServerId) {
        return
      }

      const data = await getMembers(activeServerId)
      if (isCancelled) {
        return
      }

      setMembersByServer((prev) => ({
        ...prev,
        [activeServerId]: data,
      }))
    }

    void loadMembers()

    return () => {
      isCancelled = true
    }
  }, [activeServerId])

  useEffect(() => {
    if (!activeServerId) {
      return
    }

    let cancelled = false
    const poll = async () => {
      try {
        await refreshVoiceSidebarActivity(activeServerId)
      } catch {
        // keep sidebar usable even if voice participants API is temporarily unavailable
      }
    }

    void poll()
    const timer = window.setInterval(() => {
      if (cancelled) {
        return
      }
      void poll()
    }, 30_000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeServerId, refreshVoiceSidebarActivity])

  const toggleMembers = useCallback(() => setShowMembers((v) => !v), [])

  const getFirstNavigableChannelId = useCallback(async (serverId: string): Promise<string | null> => {
    const data = await getChannels(serverId)
    const availableChannels = data.categories.flatMap((category) => category.channels)
    const firstText = availableChannels.find((channel) => channel.type === 'text') ?? availableChannels[0]
    return firstText?.id ?? null
  }, [])

  const navigateToServerFirstChannel = useCallback(
    async (serverId: string, replace = false) => {
      const firstChannelId = await getFirstNavigableChannelId(serverId)
      if (!firstChannelId) {
        navigate('/app/@me', replace ? { replace: true } : undefined)
        return
      }
      setActiveServerId(serverId)
      setActiveChannelId(firstChannelId)
      navigate(`/app/servers/${serverId}/channels/${firstChannelId}`, replace ? { replace: true } : undefined)
    },
    [getFirstNavigableChannelId, navigate],
  )

  const refreshChannels = useCallback(async (serverId: string) => {
    const refreshed = await getChannels(serverId)
    setChannelsByServer((prev) => ({
      ...prev,
      [serverId]: refreshed.categories,
    }))
    return refreshed
  }, [])

  const refreshTournaments = useCallback(async (serverId: string) => {
    if (!serverId) {
      return
    }
    try {
      const response = await listTournamentsByServer(serverId, { limit: 100 })
      setTournamentsByServer((prev) => ({
        ...prev,
        [serverId]: (response.items ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          status: item.status,
        })),
      }))
    } catch {
      setTournamentsByServer((prev) => ({
        ...prev,
        [serverId]: [],
      }))
    }
  }, [])

  useEffect(() => {
    if (!activeServerId) {
      return
    }
    void refreshTournaments(activeServerId)
  }, [activeServerId, refreshTournaments])

  const incrementChannelUnread = useCallback((channelId: string) => {
    if (!channelId) {
      return
    }

    setChannelsByServer((prev) => {
      let hasChanged = false
      const next: Record<string, MockCategory[]> = {}

      Object.entries(prev).forEach(([serverId, categories]) => {
        const nextCategories = categories.map((category) => {
          const nextChannels = category.channels.map((channel) => {
            if (channel.id !== channelId || channel.type !== 'text') {
              return channel
            }
            hasChanged = true
            return {
              ...channel,
              unread: (channel.unread ?? 0) + 1,
            }
          })
          return {
            ...category,
            channels: nextChannels,
          }
        })
        next[serverId] = nextCategories
      })

      return hasChanged ? next : prev
    })
  }, [])

  const resetChannelUnread = useCallback((channelId: string) => {
    if (!channelId) {
      return
    }

    setChannelsByServer((prev) => {
      let hasChanged = false
      const next: Record<string, MockCategory[]> = {}

      Object.entries(prev).forEach(([serverId, categories]) => {
        const nextCategories = categories.map((category) => {
          const nextChannels = category.channels.map((channel) => {
            if (channel.id !== channelId || channel.type !== 'text' || (channel.unread ?? 0) === 0) {
              return channel
            }
            hasChanged = true
            return {
              ...channel,
              unread: 0,
            }
          })
          return {
            ...category,
            channels: nextChannels,
          }
        })
        next[serverId] = nextCategories
      })

      return hasChanged ? next : prev
    })
  }, [])

  const setChannelUnread = useCallback((channelId: string, unreadCount: number) => {
    if (!channelId) {
      return
    }
    const nextUnread = Math.max(0, Math.floor(unreadCount))
    setChannelsByServer((prev) => {
      let hasChanged = false
      const next: Record<string, MockCategory[]> = {}

      Object.entries(prev).forEach(([serverId, categories]) => {
        const nextCategories = categories.map((category) => {
          const nextChannels = category.channels.map((channel) => {
            if (channel.id !== channelId || channel.type !== 'text' || (channel.unread ?? 0) === nextUnread) {
              return channel
            }
            hasChanged = true
            return {
              ...channel,
              unread: nextUnread,
            }
          })
          return {
            ...category,
            channels: nextChannels,
          }
        })
        next[serverId] = nextCategories
      })

      return hasChanged ? next : prev
    })
  }, [])

  const handleCreateChannel = useCallback(async (payload: { name: string; type: 'TEXT' | 'VOICE' }) => {
    if (!activeServerId) {
      return
    }

    await createChannel(activeServerId, payload)
    await refreshChannels(activeServerId)
  }, [activeServerId, refreshChannels])

  const resolveFallbackTextChannel = useCallback((serverId: string, preferredChannelId?: string | null) => {
    const channelData = channelsByServer[serverId] ?? []
    const availableChannels = channelData.flatMap((category) => category.channels)
    const preferred = preferredChannelId
      ? availableChannels.find((channel) => channel.id === preferredChannelId && channel.type === 'text')
      : null
    return preferred ?? availableChannels.find((channel) => channel.type === 'text') ?? availableChannels[0] ?? null
  }, [channelsByServer])

  const handleLeaveVoiceChannel = useCallback(async (opts: { navigateToText?: boolean; invalidateJoinAttempt?: boolean } = {}) => {
    const shouldNavigate = opts.navigateToText ?? true
    const shouldInvalidateJoinAttempt = opts.invalidateJoinAttempt ?? true

    if (shouldInvalidateJoinAttempt) {
      voiceJoinAttemptRef.current += 1
      joinVoiceInFlightRef.current = null
    }

    const pendingRoom = pendingVoiceRoomRef.current
    if (pendingRoom) {
      pendingVoiceRoomRef.current = null
      try {
        await pendingRoom.disconnect()
      } catch {
        // no-op
      }
    }

    const current = voiceStateRef.current
    if (!current) {
      return
    }

    try {
      await current.room.disconnect()
    } catch {
      // no-op
    }

    if (current.serverId) {
      setVoiceActivityByChannel((prev) => ({
        ...prev,
        [current.channelId]: {
          activeMembers: [],
          isLive: false,
          liveLabel: undefined,
        },
      }))
    }

    setVoiceState((prev) => (prev?.room === current.room ? null : prev))

    if (!shouldNavigate) {
      return
    }

    const fallback = resolveFallbackTextChannel(current.serverId, current.lastTextChannelId)
    if (!fallback) {
      navigate('/app/@me')
      return
    }

    setActiveServerId(current.serverId)
    setActiveChannelId(fallback.id)
    navigate(`/app/servers/${current.serverId}/channels/${fallback.id}`)
  }, [navigate, resolveFallbackTextChannel])

  const joinVoiceChannel = useCallback(async (channelId: string) => {
    if (!activeServerId) {
      pushToast('Chưa xác định server hiện tại.')
      return
    }

    const joinKey = `${activeServerId}:${channelId}`
    if (joinVoiceInFlightRef.current === joinKey) {
      return
    }

    const currentVoice = voiceStateRef.current
    if (currentVoice && currentVoice.serverId === activeServerId && currentVoice.channelId === channelId) {
      if (!location.pathname.includes(`/app/servers/${activeServerId}/voice/${channelId}`)) {
        navigate(`/app/servers/${activeServerId}/voice/${channelId}`)
      }
      return
    }

    if (isVoiceConnecting) {
      return
    }

    const categories = channelsByServer[activeServerId] ?? []
    const selectedChannel = categories
      .flatMap((category) => category.channels)
      .find((channel) => channel.id === channelId && channel.type === 'voice')
    const channelName = selectedChannel?.name ?? channelId

    const serverName =
      serverDetails[activeServerId]?.name ??
      servers.find((server) => server.id === activeServerId)?.name ??
      'Server'

    const previous = voiceStateRef.current
    const lastTextChannelId = categories
      .find((category) => category.channels.some((channel) => channel.id === activeChannelId))
      ?.channels.find((channel) => channel.id === activeChannelId && channel.type === 'text')
      ? activeChannelId
      : previous?.lastTextChannelId ?? null

    const joinAttempt = voiceJoinAttemptRef.current + 1
    voiceJoinAttemptRef.current = joinAttempt
    setIsVoiceConnecting(true)
    joinVoiceInFlightRef.current = joinKey
    try {
      if (previous) {
        await handleLeaveVoiceChannel({ navigateToText: false, invalidateJoinAttempt: false })
      } else if (pendingVoiceRoomRef.current) {
        try {
          await pendingVoiceRoomRef.current.disconnect()
        } catch {
          // no-op
        }
        pendingVoiceRoomRef.current = null
      }

      if (voiceJoinAttemptRef.current !== joinAttempt) {
        return
      }

      const { token, url } = await getVoiceToken(channelId)
      if (voiceJoinAttemptRef.current !== joinAttempt) {
        return
      }
      const room = new Room()
      pendingVoiceRoomRef.current = room
      const connectTargets = buildConnectTargets(url)
      let connectError: unknown = null

      for (const target of connectTargets) {
        if (voiceJoinAttemptRef.current !== joinAttempt) {
          break
        }

        try {
          await withTimeout(room.connect(target, token), 7000)
          connectError = null
          break
        } catch (error) {
          connectError = error
          try {
            await room.disconnect()
          } catch {
            // no-op
          }
        }
      }

      if (voiceJoinAttemptRef.current !== joinAttempt) {
        try {
          await room.disconnect()
        } catch {
          // no-op
        }
        return
      }

      if (connectError) {
        const rawMessage = (connectError as any)?.message ?? 'Không thể kết nối kênh thoại.'
        const normalized = String(rawMessage).toLowerCase()
        if (
          normalized.includes('websocket') ||
          normalized.includes('ws://') ||
          normalized.includes('wss://') ||
          normalized.includes('network')
        ) {
          pushToast('Không thể kết nối LiveKit (WS). Kiểm tra URL LiveKit/TLS ở backend.')
        } else {
          pushToast(rawMessage)
        }
        return
      }

      pendingVoiceRoomRef.current = null

      const nextVoiceState: VoiceState = {
        channelId,
        channelName,
        serverId: activeServerId,
        serverName,
        room,
        lastTextChannelId,
        isMicrophoneEnabled: room.localParticipant.isMicrophoneEnabled,
        isCameraEnabled: room.localParticipant.isCameraEnabled,
        isScreenShareEnabled: room.localParticipant.isScreenShareEnabled,
      }

      const onParticipantChanged = () => {
        syncCurrentRoomActivity(nextVoiceState)
        syncVoiceStateFromRoom(room)
      }

      room.on(RoomEvent.ParticipantConnected, onParticipantChanged)
      room.on(RoomEvent.ParticipantDisconnected, onParticipantChanged)
      room.on(RoomEvent.LocalTrackPublished, onParticipantChanged)
      room.on(RoomEvent.LocalTrackUnpublished, onParticipantChanged)
      room.on(RoomEvent.TrackPublished, onParticipantChanged)
      room.on(RoomEvent.TrackUnpublished, onParticipantChanged)
      room.on(RoomEvent.Disconnected, () => {
        setVoiceState((prev) => (prev?.room === room ? null : prev))
      })

      setVoiceState(nextVoiceState)
      syncCurrentRoomActivity(nextVoiceState)
      syncVoiceStateFromRoom(room)
      setActiveChannelId(channelId)
      navigate(`/app/servers/${activeServerId}/voice/${channelId}`)
    } catch (error: any) {
      const rawMessage = error?.message ?? 'Không thể kết nối kênh thoại.'
      const normalized = String(rawMessage).toLowerCase()
      if (
        normalized.includes('websocket') ||
        normalized.includes('ws://') ||
        normalized.includes('wss://') ||
        normalized.includes('network')
      ) {
        pushToast('Không thể kết nối LiveKit (WS). Kiểm tra URL LiveKit/TLS ở backend.')
      } else {
        pushToast(rawMessage)
      }
    } finally {
      if (pendingVoiceRoomRef.current && voiceJoinAttemptRef.current === joinAttempt) {
        pendingVoiceRoomRef.current = null
      }
      if (joinVoiceInFlightRef.current === joinKey) {
        joinVoiceInFlightRef.current = null
      }
      if (voiceJoinAttemptRef.current === joinAttempt) {
        setIsVoiceConnecting(false)
      }
    }
  }, [
    activeChannelId,
    activeServerId,
    channelsByServer,
    handleLeaveVoiceChannel,
    isVoiceConnecting,
    location.pathname,
    navigate,
    pushToast,
    serverDetails,
    servers,
    syncCurrentRoomActivity,
    syncVoiceStateFromRoom,
  ])

  const toggleMicrophone = useCallback(async () => {
    if (!voiceState) {
      return
    }
    const next = !voiceState.room.localParticipant.isMicrophoneEnabled
    await voiceState.room.localParticipant.setMicrophoneEnabled(next)
    syncVoiceStateFromRoom(voiceState.room)
  }, [syncVoiceStateFromRoom, voiceState])

  const toggleCamera = useCallback(async () => {
    if (!voiceState) {
      return
    }
    const next = !voiceState.room.localParticipant.isCameraEnabled
    await voiceState.room.localParticipant.setCameraEnabled(next)
    syncVoiceStateFromRoom(voiceState.room)
  }, [syncVoiceStateFromRoom, voiceState])

  const toggleScreenShare = useCallback(async () => {
    if (!voiceState) {
      return
    }
    const next = !voiceState.room.localParticipant.isScreenShareEnabled
    await voiceState.room.localParticipant.setScreenShareEnabled(next)
    syncVoiceStateFromRoom(voiceState.room)
    syncCurrentRoomActivity(voiceState)
  }, [syncCurrentRoomActivity, syncVoiceStateFromRoom, voiceState])

  const handleCreateServer = useCallback(async (payload: { name: string; is_public: boolean }, iconFile: File | null) => {
    const created = await createServer(payload)
    if (iconFile) {
      try {
        const iconURL = await uploadServerMedia(iconFile)
        await updateServerProfile(created.id, { icon_url: iconURL })
      } catch {
        pushToast('Tạo server thành công nhưng chưa thể tải biểu tượng.')
      }
    }
    markOnboardingSeen()
    const refreshedServers = await getServers()
    setServers(refreshedServers)
    const firstChannelId = await getFirstNavigableChannelId(created.id)
    if (firstChannelId) {
      setActiveServerId(created.id)
      setActiveChannelId(firstChannelId)
      navigate(`/app/servers/${created.id}/channels/${firstChannelId}`)
      return
    }

    const createdChannel = await createChannel(created.id, {
      name: 'general',
      type: 'TEXT',
    })
    setActiveServerId(created.id)
    setActiveChannelId(createdChannel.id)
    navigate(`/app/servers/${created.id}/channels/${createdChannel.id}`)
  }, [getFirstNavigableChannelId, markOnboardingSeen, navigate, pushToast])

  const resolveInvitePreview = useCallback(async (code: string) => {
    const preview = await getInvitePreview(code)
    return {
      code: preview.invite_code,
      expiresAt: preview.expires_at ?? null,
      server: {
        id: preview.server.id,
        name: preview.server.name,
        iconUrl: preview.server.icon_url,
        memberCount: preview.server.member_count,
      },
    }
  }, [])

  const handleJoinByInvite = useCallback(async (code: string) => {
    const joinedServer = await joinByInviteCode(code)
    markOnboardingSeen()
    const refreshedServers = await getServers()
    setServers(refreshedServers)
    setServerDetails((prev) => ({
      ...prev,
      [joinedServer.id]: joinedServer,
    }))
    await navigateToServerFirstChannel(joinedServer.id)
  }, [markOnboardingSeen, navigateToServerFirstChannel])

  const refreshActiveServer = useCallback(async (serverId: string) => {
    const list = await getServers()
    setServers(list)
    const detail = await getServerById(serverId)
    if (detail) {
      setServerDetails((prev) => ({
        ...prev,
        [serverId]: detail,
      }))
    }
  }, [])

  const activeServer = useMemo(
    () =>
      serverDetails[activeServerId] ??
      servers.find((server) => server.id === activeServerId) ??
      servers[0],
    [activeServerId, serverDetails, servers]
  )
  const activeCategories = useMemo(
    () => channelsByServer[activeServerId] ?? [],
    [activeServerId, channelsByServer]
  )
  const categoriesWithVoiceActivity = useMemo(
    () =>
      activeCategories.map((category) => ({
        ...category,
        channels: category.channels.map((channel) => {
          if (channel.type !== 'voice') {
            return channel
          }
          const activity = voiceActivityByChannel[channel.id]
          if (!activity) {
            return channel
          }
          return {
            ...channel,
            activeMembers: activity.activeMembers,
            liveLabel: activity.liveLabel,
            isLive: activity.isLive,
          }
        }),
      })),
    [activeCategories, voiceActivityByChannel]
  )
  const activeMembers = useMemo(
    () => membersByServer[activeServerId] ?? [],
    [activeServerId, membersByServer]
  )
  const activeTournaments = useMemo(
    () => tournamentsByServer[activeServerId] ?? [],
    [activeServerId, tournamentsByServer],
  )
  const hasManageVoicePermission = useMemo(() => {
    if (!currentUser) {
      return false
    }
    if (currentUser.is_admin) {
      return true
    }
    return activeServer?.ownerId === currentUser.id
  }, [activeServer?.ownerId, currentUser])
  const hasManageTournamentsPermission = useMemo(() => {
    if (!currentUser) {
      return false
    }
    if (currentUser.is_admin) {
      return true
    }
    return activeServer?.ownerId === currentUser.id
  }, [activeServer?.ownerId, currentUser])

  useEffect(() => {
    if (!voiceState) {
      return
    }
    syncCurrentRoomActivity(voiceState)
    syncVoiceStateFromRoom(voiceState.room)
  }, [syncCurrentRoomActivity, syncVoiceStateFromRoom, voiceState])

  // Context passed to all child routes via <Outlet>
  const outletContext = useMemo(
    () => ({
      showMembers,
      setShowMembers,
      toggleMembers,
      activeServerId,
      setActiveServerId,
      activeChannelId,
      setActiveChannelId,
      activeCategories: categoriesWithVoiceActivity,
      serverCount: servers.length,
      shouldShowOnboarding: servers.length === 0 && !hasSeenOnboarding,
      dismissOnboarding: markOnboardingSeen,
      openCreateServerModal: () => openCreateServerModal(),
      showDevelopingToast,
      voiceState,
      isVoiceConnecting,
      canManageVoiceTools: hasManageVoicePermission,
      joinVoiceChannel,
      leaveVoiceChannel: handleLeaveVoiceChannel,
      toggleMicrophone,
      toggleCamera,
      toggleScreenShare,
      applyVoiceChannelActivityUpdate,
      pushToast,
      incrementChannelUnread,
      resetChannelUnread,
      setChannelUnread,
      canManageTournaments: hasManageTournamentsPermission,
      openTournamentCreateDialog: () => setIsCreateTournamentModalOpen(true),
      refreshActiveServerTournaments: () => refreshTournaments(activeServerId),
      membersByServer,
    }),
    [
      showMembers,
      toggleMembers,
      activeServerId,
      activeChannelId,
      categoriesWithVoiceActivity,
      servers.length,
      hasSeenOnboarding,
      markOnboardingSeen,
      openCreateServerModal,
      showDevelopingToast,
      voiceState,
      isVoiceConnecting,
      hasManageVoicePermission,
      joinVoiceChannel,
      handleLeaveVoiceChannel,
      toggleMicrophone,
      toggleCamera,
      toggleScreenShare,
      applyVoiceChannelActivityUpdate,
      pushToast,
      incrementChannelUnread,
      resetChannelUnread,
      setChannelUnread,
      hasManageTournamentsPermission,
      refreshTournaments,
      membersByServer,
    ],
  )

  return (
    <TooltipProvider delayDuration={500}>
      {/* Root — must be exactly viewport size, no overflow */}
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">

        {/* ── Server Rail (fixed width, outside PanelGroup) ── */}
        <div className="w-[72px] flex-none overflow-hidden">
          <ServerRail
            servers={servers}
            activeServerId={activeServerId}
            onSelectServer={async (serverId) => {
              try {
                await navigateToServerFirstChannel(serverId)
              } catch {
                navigate('/app/@me')
              }
            }}
            onCreateServer={() => openCreateServerModal()}
          />
        </div>

        {/* ── Resizable zone (fills remaining width) ── */}
        <PanelGroup
          orientation="horizontal"
          className="min-w-0 flex-1 overflow-hidden"
        >
          {/* Sidebar */}
          <Panel
            id="sidebar"
            defaultSize={SIZE.sidebar.default}
            minSize={SIZE.sidebar.min}
            maxSize={SIZE.sidebar.max}
            className="overflow-hidden"
          >
            {/* Inner div: flex-col + overflow-hidden so children never push width */}
            <div className="flex h-full min-w-0 flex-col overflow-hidden">
              {isDmMode ? (
                <DirectMessagesSidebar />
              ) : (
                <ChannelSidebar
                  serverId={activeServerId}
                  serverName={activeServer?.name ?? 'Server'}
                  serverInitials={activeServer?.initials}
                  serverColor={activeServer?.color ?? 'bg-indigo-500'}
                  serverBannerUrl={activeServer?.bannerUrl}
                  serverIconUrl={activeServer?.iconUrl}
                  serverBoostLevel={activeServer?.boostLevel}
                  categories={categoriesWithVoiceActivity}
                  activeChannelId={activeChannelId}
                  onSelectChannel={(channelId, type) => {
                    if (type === 'voice') {
                      void joinVoiceChannel(channelId)
                      return
                    }

                    const navigateToText = async () => {
                      if (voiceState) {
                        await handleLeaveVoiceChannel({ navigateToText: false })
                      }
                      setActiveChannelId(channelId)
                      navigate(`/app/servers/${activeServerId}/channels/${channelId}`)
                    }

                    void navigateToText()
                  }}
                  onCreateChannel={() => setIsCreateChannelModalOpen(true)}
                  onInviteMember={() => setIsInviteDialogOpen(true)}
                  onOpenServerSettings={() => {
                    setServerSettingsTab('profile')
                    setIsServerSettingsOpen(true)
                  }}
                  onOpenServerMembers={() => {
                    setServerSettingsTab('members')
                    setIsServerSettingsOpen(true)
                  }}
                  onOpenUserSettings={() => setIsUserSettingsOpen(true)}
                  onLogout={handleLogout}
                  voiceState={voiceState}
                  onLeaveVoiceChannel={() => void handleLeaveVoiceChannel()}
                  tournaments={activeTournaments}
                  onSelectTournament={(tournamentId) => {
                    navigate(`/app/servers/${activeServerId}/tournaments/${tournamentId}`)
                  }}
                  onCreateTournament={() => setIsCreateTournamentModalOpen(true)}
                  canCreateTournament={hasManageTournamentsPermission}
                />
              )}
            </div>
          </Panel>

          <ResizeHandle />

          {/* Main chat */}
          <Panel
            id="main"
            panelRef={mainRef}             // ← ref, not panelRef
            defaultSize={showMembers ? SIZE.mainWithMembers : SIZE.mainAlone}
            minSize={35}
            maxSize={120}
            className="overflow-hidden"
          >
            {/*
              min-w-0 + w-full: prevents Outlet content from expanding
              the panel beyond its allocated percentage.
              min-h-0: prevents flex children from overflowing vertically.
            */}
            <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-background">
              <Outlet context={outletContext} />
            </div>
          </Panel>

          {/* Member list — conditionally mounted */}
          {showMembers && !isVoiceMode && (
            <>
              <ResizeHandle />
              <Panel
                id="members"
                defaultSize={SIZE.members.default}
                minSize={SIZE.members.min}
                maxSize={SIZE.members.max}
                className="overflow-hidden"
              >
                <div className="h-full overflow-hidden border-l border-border bg-[hsl(240,6%,10%)]">
                  <MemberListPanel members={activeMembers} />
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>

        <CreateServerModal
          isOpen={isCreateServerModalOpen}
          onOpenChange={closeCreateServerModal}
          defaultServerName={`Server của ${currentUsername ?? 'bạn'}`}
          onCreate={handleCreateServer}
          onResolveInvitePreview={resolveInvitePreview}
          onJoinByInvite={handleJoinByInvite}
          initialInviteCode={createServerModalInviteCode}
        />

        {activeServerId && (
          <>
            <CreateChannelModal
              isOpen={isCreateChannelModalOpen}
              onOpenChange={setIsCreateChannelModalOpen}
              onCreate={handleCreateChannel}
            />
            <InviteMemberDialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
              serverId={activeServerId}
            />
            <TournamentCreateEditDialog
              open={isCreateTournamentModalOpen}
              onOpenChange={setIsCreateTournamentModalOpen}
              serverId={activeServerId}
              onSuccess={(created) => {
                pushToast('Đã tạo giải đấu.')
                void refreshTournaments(activeServerId)
                navigate(`/app/servers/${activeServerId}/tournaments/${created.id}`)
              }}
            />
          </>
        )}

        {toastMessage && (
          <div className="fixed bottom-4 right-4 z-[100] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-lg">
            {toastMessage}
          </div>
        )}

        {activeServer && isServerSettingsOpen && (
          <ServerSettingsOverlay
            open={isServerSettingsOpen}
            initialTab={serverSettingsTab}
            serverId={activeServerId}
            server={activeServer}
            onClose={() => setIsServerSettingsOpen(false)}
            onServerUpdated={refreshActiveServer}
            onToast={pushToast}
          />
        )}

        <UserSettingsDialog
          open={isUserSettingsOpen}
          onOpenChange={setIsUserSettingsOpen}
          username={currentUser?.username ?? 'you'}
          avatarURL={currentUser?.avatar_url ?? null}
          onUpdated={(username, avatarURL) => {
            const previous = useAuthStore.getState().user
            if (!previous) {
              return
            }
            useAuthStore.getState().setUser({
              ...previous,
              username,
              avatar_url: avatarURL,
            })
            pushToast('Đã cập nhật hồ sơ người dùng.')
          }}
        />
      </div>
    </TooltipProvider>
  )
}
