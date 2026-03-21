import React, { useState } from 'react'
import {
  Button,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@goportal/ui'
import { getServerInitials } from '../mockData'
import { Plus, Compass, Download } from 'lucide-react'

type ServerRailProps = {
  activeServerId?: string
  onSelectServer?: (serverId: string) => void
  onCreateServer?: () => void
  servers?: Array<{ id: string; name: string; initials?: string; color?: string; iconUrl?: string }>
}

/**
 * ServerRail - Left sidebar with server list (72px wide)
 * 
 * Layout:
 * - Top: Create server button + divider
 * - Middle: Server icons (w-12 h-12, rounded-[24px], active has left accent bar + rounded-[16px])
 * - Bottom: Utility actions (no user card; handled by ChannelSidebar UserPanel)
 */
export const ServerRail: React.FC<ServerRailProps> = ({
  activeServerId,
  onSelectServer = () => {},
  onCreateServer = () => {},
  servers: serversProp,
}) => {
  const servers = serversProp ?? []
  const [hoveredServerId, setHoveredServerId] = useState<string | null>(null)

  return (
    <aside className="h-full w-[72px] bg-[hsl(240,10%,6%)] border-r border-border flex flex-col overflow-hidden">
      <div className="flex flex-col items-center gap-3 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCreateServer}
              className="cursor-pointer w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-secondary hover:bg-indigo-500 hover:text-white text-foreground transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Server</TooltipContent>
        </Tooltip>

        <div className="w-8 mx-auto">
          <Separator className="w-8" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="flex flex-col items-center gap-2">
          {servers.map((server) => {
            const isActive = server.id === activeServerId
            const isHovered = server.id === hoveredServerId

            return (
              <div
                key={server.id}
                className="relative w-12 group"
                onMouseEnter={() => setHoveredServerId(server.id)}
                onMouseLeave={() => setHoveredServerId(null)}
              >
                <div
                  className={[
                    'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-white transition-all duration-200',
                    isActive ? 'h-8' : 'h-2 group-hover:h-5',
                  ].join(' ')}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelectServer(server.id)}
                      className={`cursor-pointer w-12 h-12 flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                        isActive || isHovered
                          ? 'rounded-[16px] bg-indigo-500 text-white'
                          : 'rounded-[24px] bg-secondary text-foreground hover:bg-indigo-500 hover:text-white hover:rounded-[16px]'
                      }`}
                      type="button"
                    >
                      {server.iconUrl ? (
                        <img
                          src={server.iconUrl}
                          alt={server.name}
                          className="h-full w-full rounded-[inherit] object-cover"
                        />
                      ) : (
                        ('initials' in server ? server.initials : undefined) ?? getServerInitials(server.name)
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{server.name}</TooltipContent>
                </Tooltip>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 py-3">
        <Separator className="w-8 mx-auto my-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer w-12 h-12 rounded-[24px] hover:rounded-[16px] hover:bg-indigo-500 hover:text-white text-foreground transition-all duration-200"
            >
              <Compass className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Explore</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer w-12 h-12 rounded-[24px] hover:rounded-[16px] hover:bg-indigo-500 hover:text-white text-foreground transition-all duration-200"
            >
              <Download className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}
