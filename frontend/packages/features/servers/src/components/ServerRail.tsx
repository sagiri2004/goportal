import React from 'react'
import { useServers } from '../hooks/useServers'
import { Button } from '@goportal/ui'
import { getServerInitials } from '../mockData'
import { Plus } from 'lucide-react'

type ServerRailProps = {
  activeServerId?: string
  onSelectServer: (serverId: string) => void
  onCreateServer: () => void
}

/**
 * ServerRail - Left sidebar with server list
 * Shows list of servers as circular buttons
 */
export const ServerRail: React.FC<ServerRailProps> = ({
  activeServerId,
  onSelectServer,
  onCreateServer,
}) => {
  const { data: servers, isLoading } = useServers()

  if (isLoading) {
    return (
      <aside className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-3 space-y-3">
        <div className="text-xs text-slate-600">Loading...</div>
      </aside>
    )
  }

  return (
    <aside className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-3 space-y-3">
      {/* Create server button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onCreateServer}
        className="w-12 h-12 rounded-3xl bg-slate-800 hover:bg-slate-700 text-slate-300"
        title="Create Server"
      >
        <Plus className="h-5 w-5" />
      </Button>

      {/* Divider */}
      <div className="w-8 h-0.5 bg-slate-700" />

      {/* Server list */}
      {servers?.map((server) => {
        const isActive = server.id === activeServerId
        return (
          <button
            key={server.id}
            onClick={() => onSelectServer(server.id)}
            className={`w-12 h-12 rounded-3xl flex items-center justify-center text-sm font-semibold transition-all ${
              isActive
                ? 'bg-primary text-white rounded-2xl'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:rounded-2xl'
            }`}
            title={server.name}
          >
            {getServerInitials(server.name)}
          </button>
        )
      })}
    </aside>
  )
}
