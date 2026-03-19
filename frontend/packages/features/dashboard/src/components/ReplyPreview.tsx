import React from 'react'
import { cn } from '@goportal/ui'
import { Image } from 'lucide-react'
import type { MessageReply } from '@goportal/app-core'

export const ReplyPreview: React.FC<{ replyTo: MessageReply }> = ({ replyTo }) => {
  return (
    <div className="mb-1 ml-[52px] flex min-w-0 items-center gap-2">
      <div className="-mr-1 h-3 w-5 flex-shrink-0 rounded-tl-md border-l-2 border-t-2 border-muted-foreground/30" />

      <div
        className={cn(
          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white',
          replyTo.authorColor ?? 'bg-muted'
        )}
      >
        {replyTo.authorName[0]?.toUpperCase()}
      </div>

      <span className="cursor-pointer flex-shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground">
        {replyTo.authorName}
      </span>

      {replyTo.hasAttachment && !replyTo.content ? (
        <span className="flex items-center gap-1 text-xs italic text-muted-foreground/70">
          <Image className="h-3 w-3" /> Attachment
        </span>
      ) : (
        <span className="min-w-0 truncate text-xs text-muted-foreground/70">{replyTo.content}</span>
      )}
    </div>
  )
}
