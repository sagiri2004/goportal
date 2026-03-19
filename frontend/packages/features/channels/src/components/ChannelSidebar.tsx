import React, { useState } from 'react'
import { useChannels } from '../hooks/useChannels'
import {
  Badge,
  Button,
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
} from 'lucide-react'

type ChannelSidebarProps = {
  serverId?: string
  serverName?: string
  serverInitials?: string
  serverColor?: string
  categories?: Array<{
    id: string
    name: string
    channels: Array<{
      id: string
      name: string
      type: 'text' | 'voice'
      unread: number
    }>
  }>
  activeChannelId?: string
  onSelectChannel?: (channelId: string) => void
  onCreateChannel?: () => void
}

/**
 * ChannelSidebar - 240px wide sidebar showing channels for a server
 *
 * Layout:
 * - Header (48px): server name + ChevronDown, border-b shadow-sm
 * - Channel list (scrollable): text channels with Hash icon, voice channels with Volume2 icon
 *   - Section label: uppercase text-xs tracking-wide + ChevronDown + Plus (on hover)
 *   - Channel row: flex items-center gap-1.5 px-2 py-[6px] rounded-md, hover shows icons
 * - Bottom user panel (52px): avatar + username + status, icons (Mic, Headphones, Settings)
 */
export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  serverId = 'default',
  serverName = 'Server',
  serverInitials,
  serverColor = 'bg-indigo-500',
  categories,
  activeChannelId,
  onSelectChannel = () => {},
  onCreateChannel = () => {},
}) => {
  const { data: channels = [] } = useChannels(serverId)
  const [expandedText, setExpandedText] = useState(true)
  const [expandedVoice, setExpandedVoice] = useState(true)
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

  return (
    <aside className="h-full w-full bg-background flex flex-col border-r border-border overflow-hidden">
      {/* Header Bar (48px) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="cursor-pointer h-12 w-full px-3 flex items-center gap-2 hover:bg-accent transition-colors border-b border-border"
          >
            <div
              className={`w-8 h-8 rounded-lg ${serverColor} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
            >
              {(serverInitials ?? serverName)
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join('')
                .slice(0, 2)}
            </div>
            <span className="flex-1 text-left font-semibold text-sm text-foreground truncate">
              {serverName}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start" side="bottom">
          <DropdownMenuItem>
            <UserPlus className="w-4 h-4 mr-2" /> Invite People
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="w-4 h-4 mr-2" /> Server Settings
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Users className="w-4 h-4 mr-2" /> Members
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Bell className="w-4 h-4 mr-2" /> Notifications
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-400 focus:text-red-400">
            <LogOut className="w-4 h-4 mr-2" /> Leave Server
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Channel List (scrollable) */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {fromCategories && (
          <div className="space-y-4">
            {categories!.map((cat) => {
              const isExpanded = expandedCategories[cat.id] ?? true
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between px-2 py-1 group">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className="cursor-pointer flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground min-w-0"
                    >
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${
                          !isExpanded ? '-rotate-90' : ''
                        }`}
                      />
                      <span>{cat.name}</span>
                    </button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={onCreateChannel}
                          className="cursor-pointer p-1.5 h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 opacity-0 group-hover:opacity-100"
                          type="button"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Add Channel</TooltipContent>
                    </Tooltip>
                  </div>

                  {isExpanded && (
                    <div className="space-y-0.5">
                      {cat.channels.map((ch) => {
                        const isActive = ch.id === activeChannelId
                        const unreadCount = ch.unread
                        const isVoice = ch.type === 'voice'
                        return (
                          <button
                            key={ch.id}
                            onClick={() => onSelectChannel(ch.id)}
                            className={`group relative w-full flex items-center gap-1.5 px-2 py-[6px] rounded-md text-sm transition-colors min-w-0 ${
                              isActive
                                ? 'bg-accent text-foreground font-medium'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            }`}
                            type="button"
                          >
                            {unreadCount > 0 && (
                              <span className="absolute left-0 w-1 h-2 bg-white rounded-r-full" />
                            )}
                            {isVoice ? (
                              <Volume2 className="w-4 h-4 flex-shrink-0" />
                            ) : (
                              <Hash className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span className="truncate text-sm flex-1 min-w-0">{ch.name}</span>

                            {unreadCount > 0 && (
                              <Badge className="ml-auto text-[10px] h-4 min-w-4 bg-red-500 text-white px-1.5 rounded-full">
                                {unreadCount}
                              </Badge>
                            )}

                            <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150">
                                    <UserPlus className="w-3.5 h-3.5" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Invite</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150">
                                    <Settings className="w-3.5 h-3.5" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Settings</TooltipContent>
                              </Tooltip>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Text Channels Section */}
        {!fromCategories && textChannels.length > 0 && (
          <div>
            {/* Section Header */}
            <div className="flex items-center justify-between px-2 py-1 group">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpandedText(!expandedText)}
                  className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      !expandedText ? '-rotate-90' : ''
                    }`}
                  />
                </button>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Text Channels
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onCreateChannel}
                    className="cursor-pointer p-1.5 h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 opacity-0 group-hover:opacity-100"
                    type="button"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Add Channel</TooltipContent>
              </Tooltip>
            </div>

            {/* Channel Items */}
            {expandedText && (
              <div className="space-y-0.5">
                {textChannels.map((channel) => {
                  const isActive = channel.id === activeChannelId
                  const unreadCount =
                    (channel as any)?.unreadCount ?? (channel as any)?.unread_count

                  return (
                    <button
                      key={channel.id}
                      onClick={() => onSelectChannel(channel.id)}
                      className={`group relative w-full flex items-center gap-1.5 px-2 py-[6px] rounded-md text-sm transition-colors min-w-0 ${
                        isActive
                          ? 'bg-accent text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                      type="button"
                    >
                      {typeof unreadCount === 'number' && unreadCount > 0 && (
                        <span className="absolute left-0 w-1 h-2 bg-white rounded-r-full" />
                      )}
                      <Hash className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate text-sm flex-1 min-w-0">{channel.name}</span>

                      {typeof unreadCount === 'number' && unreadCount > 0 && (
                        <Badge className="ml-auto text-[10px] h-4 min-w-4 bg-red-500 text-white px-1.5 rounded-full">
                          {unreadCount}
                        </Badge>
                      )}

                      {/* Hover Icons */}
                      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150">
                              <UserPlus className="w-3.5 h-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Invite</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150">
                              <Settings className="w-3.5 h-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Settings</TooltipContent>
                        </Tooltip>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Voice Channels Section */}
        {!fromCategories && voiceChannels.length > 0 && (
          <div>
            {/* Section Header */}
            <div className="flex items-center justify-between px-2 py-1 group">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpandedVoice(!expandedVoice)}
                  className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      !expandedVoice ? '-rotate-90' : ''
                    }`}
                  />
                </button>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Voice Channels
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onCreateChannel}
                    className="cursor-pointer p-1.5 h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 opacity-0 group-hover:opacity-100"
                    type="button"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Add Channel</TooltipContent>
              </Tooltip>
            </div>

            {/* Channel Items */}
            {expandedVoice && (
              <div className="space-y-0.5">
                {voiceChannels.map((channel) => {
                  const isActive = channel.id === activeChannelId
                  const unreadCount =
                    (channel as any)?.unreadCount ?? (channel as any)?.unread_count

                  return (
                    <button
                      key={channel.id}
                      onClick={() => onSelectChannel(channel.id)}
                      className={`group relative w-full flex items-center gap-1.5 px-2 py-[6px] rounded-md text-sm transition-colors min-w-0 ${
                        isActive
                          ? 'bg-accent text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                      type="button"
                    >
                      {typeof unreadCount === 'number' && unreadCount > 0 && (
                        <span className="absolute left-0 w-1 h-2 bg-white rounded-r-full" />
                      )}
                      <Volume2 className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate text-sm flex-1 min-w-0">{channel.name}</span>

                      {typeof unreadCount === 'number' && unreadCount > 0 && (
                        <Badge className="ml-auto text-[10px] h-4 min-w-4 bg-red-500 text-white px-1.5 rounded-full">
                          {unreadCount}
                        </Badge>
                      )}

                      {/* Hover Icons */}
                      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150">
                              <UserPlus className="w-3.5 h-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Invite</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150">
                              <Settings className="w-3.5 h-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Settings</TooltipContent>
                        </Tooltip>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom User Panel (52px) */}
      <div className="h-[52px] px-2 border-t border-border bg-[hsl(240,6%,10%)] flex items-center justify-between">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="cursor-pointer flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-accent-foreground">Y</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">You</p>
                <p className="text-xs text-muted-foreground truncate">Online</p>
              </div>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-40">
            <ContextMenuItem>Log out</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Icons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer h-7 w-7 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mic</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer h-7 w-7 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
              >
                <Headphones className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Headphones</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer h-7 w-7 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  )
}
