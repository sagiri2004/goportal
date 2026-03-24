import React, { useState } from 'react'
import { useChannels } from '../hooks/useChannels'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@goportal/ui'
import {
  Plus,
  Hash,
  Volume2,
  ChevronDown,
  UserPlus,
  Settings,
  Mic,
  Headphones,
  Bell,
  Users,
  LogOut,
  Zap,
  Monitor,
  Activity,
  MonitorOff,
  PhoneOff,
  Sparkles,
  Wifi,
} from 'lucide-react'

type ChannelSidebarProps = {
  serverId?: string
  serverName?: string
  serverInitials?: string
  serverColor?: string
  serverBannerUrl?: string
  serverIconUrl?: string
  serverBoostLevel?: number
  categories?: Array<{
    id: string
    name: string
    channels: Array<{
      id: string
      name: string
      type: 'text' | 'voice'
      unread: number
      activeMembers?: ChannelMember[]
      liveLabel?: string
      isLive?: boolean
    }>
  }>
  activeChannelId?: string
  onSelectChannel?: (channelId: string, type: 'text' | 'voice') => void
  onCreateChannel?: () => void
  onInviteMember?: () => void
  onOpenServerSettings?: () => void
  onOpenServerMembers?: () => void
  onOpenUserSettings?: () => void
  voiceState?: {
    channelId: string
    channelName: string
    serverId: string
    serverName: string
  } | null
  onLeaveVoiceChannel?: () => void
  onLogout?: () => void
  tournaments?: Array<{
    id: string
    name: string
    status: 'draft' | 'registration' | 'check_in' | 'in_progress' | 'completed' | 'cancelled'
  }>
  onSelectTournament?: (tournamentId: string) => void
  onCreateTournament?: () => void
  canCreateTournament?: boolean
}

type ChannelMember = {
  id: string
  name?: string
  avatarUrl?: string
  initials: string
  color: string
  isStreaming?: boolean
}

type SidebarChannel = {
  id: string
  name: string
  type: 'text' | 'voice'
  unread?: number
  activeMembers?: ChannelMember[]
  liveLabel?: string
  isLive?: boolean
}

const sectionLabelClassName =
  'text-[11px] uppercase tracking-[0.04em] font-semibold text-muted-foreground/70 whitespace-nowrap'

const tournamentStatusBadgeClass = (status: string): string => {
  if (status === 'registration') return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
  if (status === 'check_in') return 'bg-amber-500/20 text-amber-300 border-amber-400/30'
  if (status === 'in_progress') return 'bg-rose-500/20 text-rose-300 border-rose-400/30'
  if (status === 'completed') return 'bg-zinc-500/20 text-zinc-300 border-zinc-400/30'
  if (status === 'draft') return 'bg-slate-500/20 text-slate-300 border-slate-400/30'
  return 'bg-zinc-700/30 text-zinc-200 border-zinc-500/40'
}

const tournamentStatusLabel = (status: string): string => {
  if (status === 'registration') return 'Đăng ký'
  if (status === 'check_in') return 'Check-in'
  if (status === 'in_progress') return 'Đang diễn ra'
  if (status === 'completed') return 'Hoàn thành'
  if (status === 'draft') return 'Nháp'
  return 'Đã huỷ'
}

const SectionHeader: React.FC<{
  name: string
  expanded: boolean
  onToggle: () => void
  onCreateChannel: () => void
  className?: string
}> = ({ name, expanded, onToggle, onCreateChannel, className = 'mt-4' }) => (
  <div className={`flex items-center gap-2 ${className} mb-0.5 px-2 group`}>
    <button
      type="button"
      onClick={onToggle}
      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
    >
      <ChevronDown
        className={`h-3 w-3 flex-shrink-0 text-muted-foreground/70 transition-transform ${
          !expanded ? '-rotate-90' : ''
        }`}
      />
      <span className={sectionLabelClassName}>{name}</span>
    </button>
    <div className="h-px flex-1 bg-muted-foreground/20" />
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onCreateChannel}
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Add Channel</TooltipContent>
    </Tooltip>
  </div>
)

const ChannelRow: React.FC<{
  channel: SidebarChannel
  active: boolean
  onSelect: () => void
  onInviteMember: () => void
}> = ({ channel, active, onSelect, onInviteMember }) => {
  const unreadCount = typeof channel.unread === 'number' ? channel.unread : 0
  const hasUnread = unreadCount > 0
  const isVoice = channel.type === 'voice'
  const Icon = isVoice ? Volume2 : Hash

  const rowClassName = active
    ? 'bg-[hsl(240,5%,17%)] text-[hsl(0,0%,96%)]'
    : hasUnread
      ? 'text-[hsl(0,0%,82%)] hover:bg-[hsl(240,5%,17%)] hover:text-[hsl(0,0%,82%)]'
      : 'text-[hsl(0,0%,55%)] hover:bg-[hsl(240,5%,17%)] hover:text-[hsl(0,0%,82%)]'

  const iconClassName = active
    ? 'text-[hsl(0,0%,82%)]'
    : hasUnread
      ? 'text-[hsl(0,0%,72%)] group-hover:text-[hsl(0,0%,82%)]'
      : 'text-[hsl(0,0%,55%)] group-hover:text-[hsl(0,0%,82%)]'

  return (
    <div className="relative overflow-visible">
      {hasUnread && <span className="absolute -left-1 top-1/2 h-2 w-[3px] -translate-y-1/2 rounded-r-full bg-white" />}
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        }}
        className={`group relative flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-[5px] text-left text-[14px] font-normal leading-5 transition-colors ${rowClassName}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Icon className={`h-4 w-4 flex-shrink-0 ${iconClassName}`} />
          <span className="min-w-0 truncate">{channel.name}</span>
        </div>

        <div className="relative flex h-[18px] w-[46px] flex-shrink-0 items-center justify-end">
          {!isVoice && hasUnread && (
            <span className="inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-[9px] bg-[#f23f43] px-1.5 text-[11px] font-semibold leading-none text-white transition-opacity group-hover:opacity-0">
              {unreadCount}
            </span>
          )}

          <div className="absolute inset-0 flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onInviteMember()
                  }}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm text-[hsl(0,0%,70%)] transition-colors hover:bg-black/15 hover:text-[hsl(0,0%,96%)]"
                >
                  <UserPlus className="h-[14px] w-[14px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Invite</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm text-[hsl(0,0%,70%)] transition-colors hover:bg-black/15 hover:text-[hsl(0,0%,96%)]">
                  <Settings className="h-[14px] w-[14px]" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}

const VoiceActivityRow: React.FC<{
  channel: SidebarChannel
}> = ({ channel }) => {
  if (channel.type !== 'voice' || !channel.activeMembers?.length) return null

  return (
    <div className="mb-0.5 ml-[22px]">
      <div className="flex items-center gap-1.5 px-2 py-[3px]">
        {channel.liveLabel && (
          <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground/70">
            {channel.liveLabel}
          </span>
        )}

        {channel.isLive && (
          <span className="flex-shrink-0 rounded-sm bg-red-500 px-1.5 py-[2px] text-[10px] font-bold leading-none tracking-wide text-white">
            TRỰC TIẾP
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 px-2 py-[2px]">
        <div className="flex items-center">
          {channel.activeMembers.slice(0, 4).map((member, index) => (
            <Tooltip key={member.id}>
              <TooltipTrigger asChild>
                <div
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ring-[1.5px] ring-[hsl(240,6%,10%)] ${member.color} ${
                    index > 0 ? '-ml-1.5' : ''
                  }`}
                >
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name ?? member.initials}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    member.initials
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>{member.name ?? member.initials}</TooltipContent>
            </Tooltip>
          ))}

          {channel.activeMembers.length > 4 && (
            <div className="flex h-5 w-5 -ml-1.5 items-center justify-center rounded-full bg-[hsl(240,4%,22%)] text-[9px] font-semibold text-muted-foreground ring-[1.5px] ring-[hsl(240,6%,10%)]">
              +{channel.activeMembers.length - 4}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const UserPanel: React.FC<{
  voiceState?: {
    channelId: string
    channelName: string
    serverId: string
    serverName: string
  } | null
  onLeaveVoiceChannel: () => void
  onOpenUserSettings?: () => void
  onLogout?: () => void
}> = ({ voiceState, onLeaveVoiceChannel, onOpenUserSettings, onLogout }) => {
  const [muted, setMuted] = useState(false)
  const [deafened, setDeafened] = useState(false)
  const [isScreenShareOff, setIsScreenShareOff] = useState(false)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const isInVoice = Boolean(voiceState)

  return (
    <div className={`bg-[hsl(240,7%,7%)] px-2 transition-all duration-200 ${isInVoice ? 'py-2' : 'h-[52px] py-0'}`}>
      {isInVoice && voiceState ? (
        <>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-1.5">
                <Wifi className="h-3.5 w-3.5 text-green-500" />
                <p className="text-xs font-semibold text-green-400">Đã Kết Nối Giọng Nói</p>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {voiceState.channelName} / {voiceState.serverName}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[hsl(0,0%,70%)] transition-colors hover:bg-accent hover:text-[hsl(0,0%,96%)]"
                  >
                    <Activity className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Tín hiệu</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onLeaveVoiceChannel}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
                  >
                    <PhoneOff className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Ngắt kết nối</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="mb-2 flex items-center gap-1">
            {[
              { label: 'Tắt chia sẻ màn hình', icon: MonitorOff, onClick: () => setIsScreenShareOff((v) => !v), active: isScreenShareOff },
              { label: 'Hoạt động', icon: Monitor, onClick: () => setIsVoiceActive((v) => !v), active: isVoiceActive },
              { label: 'Người tham gia', icon: Users },
              { label: 'Hiệu ứng', icon: Sparkles },
            ].map(({ label, icon: Icon, onClick, active }) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onClick}
                    className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                      active
                        ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/25'
                        : 'text-[hsl(0,0%,70%)] hover:bg-accent hover:text-[hsl(0,0%,96%)]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </>
      ) : null}

      <div className={`flex items-center justify-between ${isInVoice ? '' : 'h-[52px]'}`}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.06]"
            >
              <div className="relative h-8 w-8 flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
                  <span className="text-xs font-bold text-accent-foreground">Y</span>
                </div>
                <span className="absolute bottom-0 right-0 h-[10px] w-[10px] rounded-full border-2 border-[hsl(240,7%,7%)] bg-[#23a55a]" />
                {isInVoice && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[hsl(240,7%,7%)] bg-green-400" />
                )}
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-[13px] font-semibold leading-4 text-[hsl(0,0%,96%)]">
                  You
                </p>
                <p className="truncate text-[11px] leading-3 text-[hsl(0,0%,60%)]">Online</p>
              </div>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-40">
            <ContextMenuItem onClick={onLogout}>Log out</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setMuted((v) => !v)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  muted
                    ? 'text-red-400 hover:bg-red-500/20'
                    : 'text-[hsl(0,0%,70%)] hover:bg-white/[0.06] hover:text-[hsl(0,0%,96%)]'
                }`}
              >
                <Mic className="h-4 w-4" />
                {muted && <span className="pointer-events-none absolute h-[2px] w-5 rotate-[-35deg] bg-red-400" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>Mic</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setDeafened((v) => !v)}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  deafened
                    ? 'text-red-400 hover:bg-red-500/20'
                    : 'text-[hsl(0,0%,70%)] hover:bg-white/[0.06] hover:text-[hsl(0,0%,96%)]'
                }`}
              >
                <Headphones className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Headphones</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onOpenUserSettings}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[hsl(0,0%,70%)] transition-colors hover:bg-white/[0.06] hover:text-[hsl(0,0%,96%)]"
              >
                <Settings className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

/**
 * ChannelSidebar - 240px wide sidebar showing channels for a server
 */
export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  serverId = 'default',
  serverName = 'Server',
  serverInitials,
  serverColor = 'bg-indigo-500',
  serverBannerUrl,
  serverIconUrl,
  serverBoostLevel,
  categories,
  activeChannelId,
  onSelectChannel = () => {},
  onCreateChannel = () => {},
  onInviteMember = () => {},
  onOpenServerSettings = () => {},
  onOpenServerMembers = () => {},
  onOpenUserSettings,
  voiceState = null,
  onLeaveVoiceChannel = () => {},
  onLogout = () => {},
  tournaments = [],
  onSelectTournament = () => {},
  onCreateTournament = () => {},
  canCreateTournament = false,
}) => {
  const { data: channels = [] } = useChannels(serverId)
  const [expandedText, setExpandedText] = useState(true)
  const [expandedVoice, setExpandedVoice] = useState(true)
  const [expandedTournaments, setExpandedTournaments] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const fromCategories = Array.isArray(categories) && categories.length > 0
  const textChannels = fromCategories
    ? categories.flatMap((c) => c.channels.filter((ch) => ch.type === 'text'))
    : channels.filter((c) => c.type === 'TEXT')
  const voiceChannels = fromCategories
    ? categories.flatMap((c) => c.channels.filter((ch) => ch.type === 'voice'))
    : channels.filter((c) => c.type === 'VOICE')

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }))
  }

  const initials = (serverInitials ?? serverName)
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
    .slice(0, 2)

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-white/5 bg-[hsl(240,6%,10%)]">
      <DropdownMenu>
        {serverBannerUrl ? (
          <div className="flex-shrink-0 border-b border-[hsl(240,4%,13%)]">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group relative w-full cursor-pointer overflow-hidden text-left"
                style={{ height: '110px' }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${serverBannerUrl})` }}
                />
                <div className="absolute inset-0 backdrop-blur-[1px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-150 group-hover:bg-black/20" />

                <div className="absolute right-2 top-2 z-20">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          onInviteMember()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            onInviteMember()
                          }
                        }}
                        className="rounded-md bg-black/30 p-1.5 text-white/70 transition-colors hover:bg-black/50 hover:text-white"
                      >
                        <UserPlus className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Invite People</TooltipContent>
                  </Tooltip>
                </div>

                <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-2 px-3 pb-2.5 pt-1">
                  {serverIconUrl ? (
                    <img
                      src={serverIconUrl}
                      alt={serverName}
                      className="h-8 w-8 flex-shrink-0 rounded-full object-cover ring-2 ring-black/30"
                    />
                  ) : (
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${serverColor} text-sm font-bold text-white ring-2 ring-black/30`}
                    >
                      {initials}
                    </div>
                  )}

                  <span className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold text-white drop-shadow-md">
                    {serverName}
                  </span>

                  {typeof serverBoostLevel === 'number' && serverBoostLevel > 0 && (
                    <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-indigo-500/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      <Zap className="h-2.5 w-2.5" />
                      BOOST {serverBoostLevel}
                    </span>
                  )}

                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-white/80 drop-shadow-md" />
                </div>
              </button>
            </DropdownMenuTrigger>
          </div>
        ) : (
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-12 w-full items-center gap-3 border-b border-[hsl(240,4%,13%)] px-3 transition-colors hover:bg-white/[0.03]"
            >
              {serverIconUrl ? (
                <img
                  src={serverIconUrl}
                  alt={serverName}
                  className="h-8 w-8 flex-shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${serverColor} text-sm font-bold text-white`}
                >
                  {initials}
                </div>
              )}
              <span className="flex-1 truncate text-left text-[15px] font-semibold text-[hsl(0,0%,96%)]">
                {serverName}
              </span>
              <ChevronDown className="h-4 w-4 flex-shrink-0 text-[hsl(0,0%,72%)]" />
            </button>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent className="w-56" align="start" side="bottom">
          <DropdownMenuItem onClick={onCreateChannel}>
            <Plus className="mr-2 h-4 w-4" /> Tạo Kênh
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onInviteMember}>
            <UserPlus className="mr-2 h-4 w-4" /> Lời mời
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenServerSettings}>
            <Settings className="mr-2 h-4 w-4" /> Server Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenServerMembers}>
            <Users className="mr-2 h-4 w-4" /> Members
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Bell className="mr-2 h-4 w-4" /> Notifications
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400">
            <LogOut className="mr-2 h-4 w-4" /> Leave Server
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {fromCategories && (
          <div className="space-y-0.5">
            {categories!.map((cat, index) => {
              const isExpanded = expandedCategories[cat.id] ?? true

              return (
                <div key={cat.id}>
                  <SectionHeader
                    name={cat.name}
                    expanded={isExpanded}
                    onToggle={() => toggleCategory(cat.id)}
                    onCreateChannel={onCreateChannel}
                    className={index === 0 ? 'mt-0' : 'mt-4'}
                  />

                  {isExpanded && (
                    <div className="space-y-0.5">
                      {cat.channels.map((ch) => (
                        <React.Fragment key={ch.id}>
                          <ChannelRow
                            channel={ch}
                            active={ch.id === activeChannelId}
                            onSelect={() => onSelectChannel(ch.id, ch.type)}
                            onInviteMember={onInviteMember}
                          />
                          {ch.type === 'voice' && <VoiceActivityRow channel={ch} />}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!fromCategories && textChannels.length > 0 && (
          <div>
            <SectionHeader
              name="Text Channels"
              expanded={expandedText}
              onToggle={() => setExpandedText(!expandedText)}
              onCreateChannel={onCreateChannel}
              className="mt-0"
            />

            {expandedText && (
              <div className="space-y-0.5">
                {textChannels.map((channel) => (
                  <ChannelRow
                    key={channel.id}
                    channel={{
                      id: channel.id,
                      name: channel.name,
                      type: 'text',
                      unread: (channel as any)?.unreadCount ?? (channel as any)?.unread_count,
                    }}
                    active={channel.id === activeChannelId}
                    onSelect={() => onSelectChannel(channel.id, 'text')}
                    onInviteMember={onInviteMember}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!fromCategories && voiceChannels.length > 0 && (
          <div>
            <SectionHeader
              name="Voice Channels"
              expanded={expandedVoice}
              onToggle={() => setExpandedVoice(!expandedVoice)}
              onCreateChannel={onCreateChannel}
            />

            {expandedVoice && (
              <div className="space-y-0.5">
                {voiceChannels.map((channel) => (
                  <React.Fragment key={channel.id}>
                    <ChannelRow
                      channel={{
                        id: channel.id,
                        name: channel.name,
                        type: 'voice',
                        unread: (channel as any)?.unreadCount ?? (channel as any)?.unread_count,
                        activeMembers: (channel as any)?.activeMembers,
                        liveLabel: (channel as any)?.liveLabel,
                        isLive: (channel as any)?.isLive,
                      }}
                      active={channel.id === activeChannelId}
                      onSelect={() => onSelectChannel(channel.id, 'voice')}
                      onInviteMember={onInviteMember}
                    />
                    <VoiceActivityRow
                      channel={{
                        id: channel.id,
                        name: channel.name,
                        type: 'voice',
                        unread: (channel as any)?.unreadCount ?? (channel as any)?.unread_count,
                        activeMembers: (channel as any)?.activeMembers,
                        liveLabel: (channel as any)?.liveLabel,
                        isLive: (channel as any)?.isLive,
                      }}
                    />
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
            <div className="mt-4 mb-0.5 flex items-center gap-2 px-2 group">
              <button
                type="button"
                onClick={() => setExpandedTournaments((prev) => !prev)}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                <ChevronDown
                  className={`h-3 w-3 flex-shrink-0 text-muted-foreground/70 transition-transform ${
                    !expandedTournaments ? '-rotate-90' : ''
                  }`}
                />
                <span className={sectionLabelClassName}>GIẢI ĐẤU</span>
              </button>
              <div className="h-px flex-1 bg-muted-foreground/20" />
              {canCreateTournament && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onCreateTournament}
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      type="button"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Tạo giải đấu</TooltipContent>
                </Tooltip>
              )}
            </div>

            {expandedTournaments && (
              <div className="space-y-1">
                {tournaments.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground/70">
                    Chưa có giải đấu
                  </p>
                ) : (
                  tournaments.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTournament(item.id)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-[hsl(0,0%,75%)] hover:bg-[hsl(240,5%,17%)] hover:text-[hsl(0,0%,92%)]"
                    >
                      <span className="truncate">{item.name}</span>
                      <span
                        className={`ml-2 rounded border px-1.5 py-0.5 text-[10px] ${tournamentStatusBadgeClass(item.status)}`}
                      >
                        {tournamentStatusLabel(item.status)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
      </div>

      <UserPanel
        voiceState={voiceState}
        onLeaveVoiceChannel={onLeaveVoiceChannel}
        onOpenUserSettings={onOpenUserSettings}
        onLogout={onLogout}
      />
    </aside>
  )
}
