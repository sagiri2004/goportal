import React from 'react'
import type { ChannelDTO } from '@goportal/types'
import {
  Bell,
  Hash,
  HelpCircle,
  Pin,
  Search,
  UserPlus,
  Users,
  Volume2,
} from 'lucide-react'
import { Separator, Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui'

type ChannelHeaderProps = {
  channel?: ChannelDTO
  topic?: string
  showMembers?: boolean
  onToggleMembers?: () => void
}

export const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channel,
  topic = 'Channel topic',
  showMembers = false,
  onToggleMembers,
}) => {
  if (!channel) {
    return (
      <header className="h-12 border-b border-border px-4 flex items-center justify-between text-sm bg-background">
        <span className="text-muted-foreground">No channel selected</span>
      </header>
    )
  }

  return (
    <header className="h-12 border-b border-border px-4 flex items-center justify-between bg-background">
      <div className="flex items-center min-w-0">
        {channel.type === 'TEXT' ? (
          <Hash className="w-5 h-5 text-muted-foreground mr-2" />
        ) : (
          <Volume2 className="w-5 h-5 text-muted-foreground mr-2" />
        )}
        <span className="font-semibold text-base text-foreground truncate">
          {channel.name}
        </span>
        <Separator orientation="vertical" className="mx-2 h-5" />
        <span className="text-sm text-muted-foreground truncate max-w-xs">
          {topic}
        </span>
      </div>

      <div className="flex items-center gap-1 text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150"
              type="button"
            >
              <Bell className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150"
              type="button"
            >
              <Pin className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Pins</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150"
              type="button"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Invite</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`cursor-pointer p-1.5 rounded-md hover:bg-accent transition-colors duration-150 ${
                showMembers
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              type="button"
              onClick={onToggleMembers}
              aria-pressed={showMembers}
            >
              <Users className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Member List</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150"
              type="button"
            >
              <Search className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Search</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150"
              type="button"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Help</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
