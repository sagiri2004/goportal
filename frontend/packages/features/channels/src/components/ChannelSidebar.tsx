import React from 'react'
import { useChannels } from '../hooks/useChannels'
import { Button } from '@goportal/ui'
import { Plus } from 'lucide-react'

type ChannelSidebarProps = {
  serverId: string
  serverName: string
  activeChannelId?: string
  onSelectChannel: (channelId: string) => void
  onCreateChannel: () => void
}

/**
 * ChannelSidebar - Left sidebar showing channels for a server
 */
export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  serverId,
  serverName,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
}) => {
  const { data: channels, isLoading } = useChannels(serverId)

  if (isLoading) {
    return (
      <aside className="w-64 bg-card flex flex-col border-r border-border">
        <div className="text-xs text-muted-foreground p-4">Loading...</div>
      </aside>
    )
  }

  const textChannels = channels?.filter(c => c.type === 'TEXT') ?? []
  const voiceChannels = channels?.filter(c => c.type === 'VOICE') ?? []

  return (
    <aside className="w-64 bg-card flex flex-col border-r border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground truncate">
          {serverName}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCreateChannel}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          title="Create Channel"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-xs">
        {/* Text Channels */}
        {textChannels.length > 0 && (
          <div>
            <p className="uppercase tracking-wide px-2 text-[10px] text-muted-foreground font-semibold mb-2">
              Text Channels
            </p>
            <div className="space-y-1">
              {textChannels.map((channel) => {
                const isActive = channel.id === activeChannelId
                return (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel(channel.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    }`}
                  >
                    <span className="text-muted-foreground">#</span>
                    <span className="truncate">{channel.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Voice Channels */}
        {voiceChannels.length > 0 && (
          <div>
            <p className="uppercase tracking-wide px-2 text-[10px] text-muted-foreground font-semibold mb-2">
              Voice Channels
            </p>
            <div className="space-y-1">
              {voiceChannels.map((channel) => {
                const isActive = channel.id === activeChannelId
                return (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel(channel.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    }`}
                  >
                    <span className="text-muted-foreground">🔊</span>
                    <span className="truncate">{channel.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
