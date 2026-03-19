import React, { useMemo } from 'react'
import { Separator } from '@goportal/ui'
import { ChannelHeader } from '@goportal/feature-channels'
import {
  Edit,
  Gift,
  Hash,
  Image,
  MoreHorizontal,
  Plus,
  Reply,
  Smile,
  Trash2,
} from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui'
import { mockMessages } from '@goportal/app-core'
import type { ChannelDTO } from '@goportal/types'

type DashboardViewProps = {
  onLogout?: () => void
}

type ShellContext = {
  showMembers: boolean
  setShowMembers: React.Dispatch<React.SetStateAction<boolean>>
  activeChannelId: string
  setActiveChannelId: React.Dispatch<React.SetStateAction<string>>
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onLogout }) => {
  const { showMembers, setShowMembers, activeChannelId } = useOutletContext<ShellContext>()

  const activeChannel = useMemo(
    () =>
      ({
        id: activeChannelId,
        name: activeChannelId,
        type: 'TEXT',
      }) as unknown as ChannelDTO,
    [activeChannelId]
  )

  const activeMessages = useMemo(() => mockMessages[activeChannelId] ?? mockMessages.general ?? [], [activeChannelId])

  const grouped = useMemo(() => {
    const toMinutes = (t: string) => {
      const [hh, mm] = t.split(':').map((n) => Number(n))
      return (hh || 0) * 60 + (mm || 0)
    }

    return activeMessages.map((m, idx) => {
      const prev = activeMessages[idx - 1]
      const sameAuthor = prev && prev.authorId === m.authorId
      const within5 =
        prev && Math.abs(toMinutes(m.timestamp) - toMinutes(prev.timestamp)) <= 5
      const startsGroup = !(sameAuthor && within5)
      return { ...m, startsGroup }
    })
  }, [activeMessages])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none">
        <ChannelHeader
          channel={activeChannel}
          topic="Welcome to the channel"
          showMembers={showMembers}
          onToggleMembers={() => setShowMembers((v) => !v)}
        />
      </div>

      <section className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="py-4">
          <Hash className="w-16 h-16 p-3 rounded-full bg-muted text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground">
            Welcome to #{activeChannel?.name ?? 'general'}
          </h2>
          <p className="text-muted-foreground text-sm">
            This is the start of #{activeChannel?.name ?? 'general'} channel.
          </p>
        </div>

        <div className="flex items-center gap-3 my-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Today
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-1">
          {grouped.map((msg) => {
            const username = msg.author ?? 'unknown'
            const avatarLetter = username[0]?.toUpperCase() ?? '?'

            if (msg.startsGroup) {
              return (
                <div key={msg.id} className="relative group">
                  <div className="flex gap-3 px-2 py-1 rounded-md hover:bg-white/5">
                    <div className={`w-10 h-10 rounded-full ${msg.avatar ?? 'bg-muted'} flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5 text-white`}>
                      {avatarLetter}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline">
                        <span className="text-sm font-semibold text-foreground">
                          {username}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>

                  <div className="hidden group-hover:flex absolute right-2 top-1 bg-card border border-border rounded-md shadow-sm px-1 gap-0.5">
                    {[
                      { icon: Smile, label: 'Add Reaction' },
                      { icon: Reply, label: 'Reply' },
                      { icon: Edit, label: 'Edit' },
                      { icon: Trash2, label: 'Delete' },
                      { icon: MoreHorizontal, label: 'More' },
                    ].map(({ icon: Icon, label }) => (
                      <Tooltip key={label}>
                        <TooltipTrigger asChild>
                          <button
                            className="cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                            type="button"
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} className="relative group pl-[52px] py-0.5 rounded-md hover:bg-white/5">
                <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                  {msg.content}
                </p>
                <div className="hidden group-hover:flex absolute right-2 top-0 bg-card border border-border rounded-md shadow-sm px-1 gap-0.5">
                  {[
                    { icon: Smile, label: 'Add Reaction' },
                    { icon: Reply, label: 'Reply' },
                    { icon: Edit, label: 'Edit' },
                    { icon: Trash2, label: 'Delete' },
                    { icon: MoreHorizontal, label: 'More' },
                  ].map(({ icon: Icon, label }) => (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <button
                          className="cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                          type="button"
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <footer className="flex-none mx-4 mb-4">
        <div className="rounded-lg bg-[hsl(240,3.7%,18%)] flex items-center px-3 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground"
                type="button"
              >
                <Plus className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Add Attachment</TooltipContent>
          </Tooltip>
          <input
            className="flex-1 bg-transparent text-[15px] py-[11px] outline-none placeholder:text-muted-foreground"
            placeholder="Message"
          />
          <div className="flex gap-1 items-center">
            {[
              { icon: Gift, label: 'Gift' },
              { icon: Image, label: 'GIF' },
              { icon: Smile, label: 'Emoji' },
            ].map(({ icon: Icon, label }) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <button
                    className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground"
                    type="button"
                  >
                    <Icon className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
