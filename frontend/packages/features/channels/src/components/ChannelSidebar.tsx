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
      <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-800">
        <div className="text-xs text-slate-600 p-4">Loading...</div>
      </aside>
    )
  }

  const textChannels = channels?.filter(c => c.type === 'TEXT') ?? []
  const voiceChannels = channels?.filter(c => c.type === 'VOICE') ?? []

  return (
    <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200 truncate">
          {serverName}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCreateChannel}
          className="h-6 w-6 text-slate-400 hover:text-slate-200"
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
            <p className="uppercase tracking-wide px-2 text-[10px] text-slate-500 font-semibold mb-2">
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
                        ? 'bg-slate-700 text-slate-50'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <span className="text-slate-500">#</span>
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
            <p className="uppercase tracking-wide px-2 text-[10px] text-slate-500 font-semibold mb-2">
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
                        ? 'bg-slate-700 text-slate-50'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <span className="text-slate-500">🔊</span>
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
