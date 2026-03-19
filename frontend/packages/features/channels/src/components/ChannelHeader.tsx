import React from 'react'
import type { ChannelDTO } from '@goportal/types'
import { Hash, Volume2 } from 'lucide-react'

type ChannelHeaderProps = {
  channel?: ChannelDTO
}

/**
 * ChannelHeader - Header for the chat area showing channel name and info
 */
export const ChannelHeader: React.FC<ChannelHeaderProps> = ({ channel }) => {
  if (!channel) {
    return (
      <header className="h-12 border-b border-border px-4 flex items-center justify-between text-sm bg-background">
        <span className="text-muted-foreground">No channel selected</span>
      </header>
    )
  }

  return (
    <header className="h-12 border-b border-border px-4 flex items-center justify-between text-sm bg-background">
      <div className="flex items-center gap-2">
        {channel.type === 'TEXT' ? (
          <Hash className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Volume2 className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="font-semibold text-foreground">
          {channel.name}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {channel.type === 'TEXT' ? 'Text Channel' : 'Voice Channel'}
      </div>
    </header>
  )
}
