import React from 'react'
import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui'
import type { Reaction } from '@goportal/app-core'

type ReactionBarProps = {
  reactions: Reaction[]
  onToggleReaction: (emoji: string) => void
}

export const ReactionBar: React.FC<ReactionBarProps> = ({
  reactions,
  onToggleReaction,
}) => {
  if (reactions.length === 0) {
    return null
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {reactions.map((reaction) => (
        <Tooltip key={reaction.emoji}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onToggleReaction(reaction.emoji)}
              className={cn(
                'flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 text-xs transition-colors duration-100',
                reaction.hasReacted
                  ? 'border-indigo-500/50 bg-indigo-500/15 hover:bg-indigo-500/25'
                  : 'border-[hsl(240,4%,22%)] bg-[hsl(240,4%,16%)] hover:border-[hsl(240,4%,28%)] hover:bg-[hsl(240,4%,22%)]'
              )}
            >
              <span className="text-[14px] leading-none">{reaction.emoji}</span>
              <span
                className={cn(
                  'text-[12px] font-semibold leading-none',
                  reaction.hasReacted ? 'text-indigo-300' : 'text-muted-foreground'
                )}
              >
                {reaction.count}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {reaction.userIds.slice(0, 3).join(', ')}
              {reaction.userIds.length > 3 ? ` +${reaction.userIds.length - 3}` : ''} reacted
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
