import React from 'react'
import { useOutletContext } from 'react-router-dom'
import { mockUsers } from '@goportal/app-core'
import { Users } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui'

type ShellContext = {
  showMembers: boolean
  setShowMembers: React.Dispatch<React.SetStateAction<boolean>>
}

export const DMView: React.FC = () => {
  const { showMembers, setShowMembers } = useOutletContext<ShellContext>()
  const partner = mockUsers.find((u) => u.id !== 'u1') ?? mockUsers[0]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="h-12 border-b border-border px-4 flex items-center justify-between bg-background">
        <div className="flex items-center min-w-0">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
            {partner?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="ml-2 font-semibold text-base text-foreground truncate">
            {partner?.username ?? 'Direct Message'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowMembers((v) => !v)}
          aria-pressed={showMembers}
          className={[
            'cursor-pointer p-1.5 rounded-md hover:bg-accent transition-colors duration-150',
            showMembers ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Users className="w-5 h-5" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Member List</TooltipContent>
          </Tooltip>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="text-sm text-muted-foreground">
          DM mode placeholder (messages will be wired later).
        </div>
      </div>

      <footer className="flex-none mx-4 mb-4">
        <div className="rounded-lg bg-[hsl(240,3.7%,18%)] flex items-center px-3 gap-2">
          <input
            className="flex-1 bg-transparent text-[15px] py-[11px] outline-none placeholder:text-muted-foreground"
            placeholder={`Message @${partner?.username ?? 'user'}`}
          />
        </div>
      </footer>
    </div>
  )
}
