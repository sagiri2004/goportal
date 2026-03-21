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
}

type InviteExpiryOption = '7d' | '1d' | 'never'

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
      const nextLink = `${window.location.origin}/invite/${invite.code}`
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
  const params = useParams<{ serverId?: string; channelId?: string }>()
  const isDmMode = useMemo(() => location.pathname.includes('/app/@me'), [location.pathname])
  const isVoiceMode = useMemo(() => location.pathname.includes('/app/servers/') && location.pathname.includes('/voice/'), [location.pathname])

  const [activeServerId, setActiveServerId] = useState('')
  const [activeChannelId, setActiveChannelId] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [servers, setServers] = useState<MockServer[]>([])
  const [isCreateServerModalOpen, setIsCreateServerModalOpen] = useState(false)
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
  const [voiceState, setVoiceState] = useState<VoiceState | null>(null)
  const currentUser = useAuthStore((state) => state.user)
  const currentUsername = currentUser?.username

  // Imperative handle — resize main panel when member list toggles
  const mainRef = useRef<PanelImperativeHandle>(null)
  const toastTimerRef = useRef<number | null>(null)

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
    }
  }, [])

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
    if (!isVoiceMode || !activeServerId || !activeChannelId) {
      setVoiceState(null)
      return
    }

    const categories = channelsByServer[activeServerId] ?? []
    const voiceChannel = categories
      .flatMap((category) => category.channels)
      .find((channel) => channel.id === activeChannelId)
    const serverName =
      serverDetails[activeServerId]?.name ??
      servers.find((server) => server.id === activeServerId)?.name ??
      'Server'

    setVoiceState({
      channelId: activeChannelId,
      channelName: voiceChannel?.name ?? activeChannelId,
      serverId: activeServerId,
      serverName,
    })
  }, [activeChannelId, activeServerId, channelsByServer, isVoiceMode, serverDetails, servers])

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
        const fallbackChannel = availableChannels[0]
        setActiveChannelId(fallbackChannel.id)
        navigate(`/app/servers/${activeServerId}/channels/${fallbackChannel.id}`, { replace: true })
      }
    }

    void loadChannels()

    return () => {
      isCancelled = true
    }
  }, [activeChannelId, activeServerId, navigate])

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

  const handleCreateChannel = useCallback(async (payload: { name: string; type: 'TEXT' | 'VOICE' }) => {
    if (!activeServerId) {
      return
    }

    await createChannel(activeServerId, payload)
    await refreshChannels(activeServerId)
  }, [activeServerId, refreshChannels])

  const handleLeaveVoiceChannel = useCallback(async () => {
    if (!activeServerId) {
      setVoiceState(null)
      return
    }

    const channelData = channelsByServer[activeServerId] ?? []
    const availableChannels = channelData.flatMap((category) => category.channels)
    const firstText = availableChannels.find((channel) => channel.type === 'text')
      ?? availableChannels[0]

    setVoiceState(null)

    if (!firstText) {
      navigate('/app/@me')
      return
    }

    setActiveChannelId(firstText.id)
    navigate(`/app/servers/${activeServerId}/channels/${firstText.id}`)
  }, [activeServerId, channelsByServer, navigate])

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
  const activeMembers = useMemo(
    () => membersByServer[activeServerId] ?? [],
    [activeServerId, membersByServer]
  )

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
      activeCategories,
      serverCount: servers.length,
      shouldShowOnboarding: servers.length === 0 && !hasSeenOnboarding,
      dismissOnboarding: markOnboardingSeen,
      openCreateServerModal: () => setIsCreateServerModalOpen(true),
      showDevelopingToast,
    }),
    [
      showMembers,
      toggleMembers,
      activeServerId,
      activeChannelId,
      activeCategories,
      servers.length,
      hasSeenOnboarding,
      markOnboardingSeen,
      showDevelopingToast,
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
            onCreateServer={() => setIsCreateServerModalOpen(true)}
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
                  categories={activeCategories}
                  activeChannelId={activeChannelId}
                  onSelectChannel={(channelId, type) => {
                    setActiveChannelId(channelId)
                    if (type === 'voice') {
                      const serverName = activeServer?.name ?? 'Server'
                      const channel = activeCategories.flatMap((category) => category.channels).find((item) => item.id === channelId)
                      setVoiceState({
                        channelId,
                        channelName: channel?.name ?? channelId,
                        serverId: activeServerId,
                        serverName,
                      })
                      navigate(`/app/servers/${activeServerId}/voice/${channelId}`)
                      return
                    }
                    setVoiceState(null)
                    navigate(`/app/servers/${activeServerId}/channels/${channelId}`)
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
                  voiceState={voiceState}
                  onLeaveVoiceChannel={() => void handleLeaveVoiceChannel()}
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
          onOpenChange={setIsCreateServerModalOpen}
          defaultServerName={`Server của ${currentUsername ?? 'bạn'}`}
          onCreate={handleCreateServer}
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
