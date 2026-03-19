import React, { useMemo } from 'react'
import type { MockMember } from '../lib/mock-data'
import { MoreHorizontal } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui'

type MemberListPanelProps = {
  members: MockMember[]
}

const statusDotClass: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-400',
  dnd: 'bg-red-500',
  offline: 'bg-zinc-500',
}

export const MemberListPanel: React.FC<MemberListPanelProps> = ({ members }) => {
  const groups = useMemo(() => {
    const online = members.filter((u) => u.status !== 'offline')
    const offline = members.filter((u) => u.status === 'offline')
    return [
      { label: `ONLINE — ${online.length}`, users: online },
      { label: `OFFLINE — ${offline.length}`, users: offline },
    ].filter((g) => g.users.length > 0)
  }, [members])

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground px-3 mt-4 mb-1">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2 px-3 py-[6px] rounded-md hover:bg-accent cursor-pointer group"
                >
                  <div className={`w-8 h-8 rounded-full ${u.color} flex items-center justify-center text-xs font-semibold relative flex-shrink-0 text-white`}>
                    {u.initials}
                    <span
                      className={[
                        'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2',
                        'border-[hsl(240,6%,10%)]',
                        statusDotClass[u.status] ?? statusDotClass.offline,
                      ].join(' ')}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-muted-foreground group-hover:text-foreground truncate">
                      {u.name}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {u.status}
                    </div>
                  </div>

                  <div className="ml-auto hidden group-hover:block">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>More</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

