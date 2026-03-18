import React, { useMemo, useState } from 'react'
import { Button } from '@goportal/ui'
import { ServerRail, CreateServerModal } from '@goportal/feature-servers'
import { ChannelSidebar, ChannelHeader, CreateChannelModal } from '@goportal/feature-channels'
import { useChannel } from '@goportal/feature-channels'
import { mockCurrentUser, mockMessages, mockUsers } from './mockData'

type DashboardViewProps = {
  onLogout?: () => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onLogout }) => {
  const [activeServerId, setActiveServerId] = useState<string>('s1')
  const [activeChannelId, setActiveChannelId] = useState<string>('c1')
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false)
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false)

  const { data: activeChannel } = useChannel(activeChannelId)

  const activeMessages = useMemo(
    () => mockMessages.filter((m) => m.channelId === activeChannelId),
    [activeChannelId]
  )

  const activeServerName = useMemo(() => {
    const serverMap: Record<string, string> = {
      s1: 'Discord Clone Devs',
      s2: 'LiveKit Lab',
      s3: 'Friends',
    }
    return serverMap[activeServerId] || 'Server'
  }, [activeServerId])

  return (
    <div className="h-screen flex">
      <ServerRail
        activeServerId={activeServerId}
        onSelectServer={setActiveServerId}
        onCreateServer={() => setIsCreateServerOpen(true)}
      />

      <ChannelSidebar
        serverId={activeServerId}
        serverName={activeServerName}
        activeChannelId={activeChannelId}
        onSelectChannel={setActiveChannelId}
        onCreateChannel={() => setIsCreateChannelOpen(true)}
      />

      <main className="flex-1 bg-slate-800 flex flex-col">
        <ChannelHeader channel={activeChannel} />

        <section className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
          {activeMessages.map((msg) => {
            const author = mockUsers.find((u) => u.id === msg.authorId)
            return (
              <div key={msg.id} className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5"
                  style={{ backgroundColor: author?.avatarColor ?? '#64748b' }}
                >
                  {author?.username[0]?.toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-slate-100 text-sm">
                      {author?.username ?? 'unknown'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-100">{msg.content}</p>
                </div>
              </div>
            )
          })}
        </section>

        <footer className="h-16 px-4 pb-4 flex items-end">
          <div className="w-full bg-slate-900/80 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-100 flex items-center">
            <span className="text-slate-500 mr-2">Message</span>
            <span className="text-slate-600 text-xs">(input disabled in mock)</span>
          </div>
        </footer>
      </main>

      <aside className="w-60 bg-slate-900 border-l border-slate-800 flex flex-col">
        <div className="h-12 border-b border-slate-800 px-3 flex items-center text-xs font-semibold text-slate-400">
          MEMBERS — {mockUsers.length}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 text-xs">
          {mockUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{ backgroundColor: u.avatarColor }}
              >
                {u.username[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-slate-100 text-xs">{u.username}</span>
                <span className="text-slate-500 text-[10px] capitalize">
                  {u.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <CreateServerModal
        isOpen={isCreateServerOpen}
        onOpenChange={setIsCreateServerOpen}
      />
      <CreateChannelModal
        serverId={activeServerId}
        isOpen={isCreateChannelOpen}
        onOpenChange={setIsCreateChannelOpen}
      />

      <div className="absolute bottom-0 right-0 w-60 h-16 bg-slate-900 border-t border-slate-800 border-l px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ backgroundColor: mockCurrentUser.avatarColor }}
          >
            {mockCurrentUser.username[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="text-slate-100 text-xs truncate">
              {mockCurrentUser.username}
            </div>
            <div className="text-slate-500 text-[10px]">Online</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={onLogout}
        >
          Log out
        </Button>
      </div>
    </div>
  )
}
