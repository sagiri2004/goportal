import React, { useMemo, useState } from 'react'
import { cn } from '@goportal/ui'
import { useOutletContext } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui'
import { Panel, Group as PanelGroup } from 'react-resizable-panels'
import { ResizeHandle } from '@goportal/app-core'
import {
  ArrowLeftRight,
  Camera,
  ChevronDown,
  LayoutGrid,
  Maximize2,
  Mic,
  MicOff,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  PhoneOff,
  Settings,
  Sparkles,
  Users,
  Volume2,
  X,
} from 'lucide-react'
import { ThreadPanelChat } from './components/ThreadPanelChat'

export type VoiceParticipant = {
  id: string
  name: string
  avatarUrl?: string
  avatarColor: string
  isSpeaking: boolean
  isMuted: boolean
  isDeafened: boolean
  isScreenSharing: boolean
  isCameraOn: boolean
  streamUrl?: string
}

export const mockVoiceParticipants: VoiceParticipant[] = [
  {
    id: '1',
    name: 'Elaina',
    avatarColor: 'bg-purple-500',
    isSpeaking: true,
    isMuted: false,
    isDeafened: false,
    isScreenSharing: true,
    isCameraOn: false,
    streamUrl: 'https://picsum.photos/seed/stream1/900/600',
  },
  {
    id: '2',
    name: 'professionalcheekslapper',
    avatarColor: 'bg-blue-500',
    isSpeaking: false,
    isMuted: true,
    isDeafened: false,
    isScreenSharing: false,
    isCameraOn: false,
  },
]

type ShellContext = {
  activeChannelId: string
  activeServerId: string
}

const tileGridClass = (count: number) => {
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  if (count <= 4) return 'grid-cols-2'
  return 'grid-cols-3'
}

export const VoiceChannelView: React.FC = () => {
  const { activeChannelId } = useOutletContext<ShellContext>()
  const [showThread, setShowThread] = useState(true)
  const [showMemberOverlay, setShowMemberOverlay] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(false)

  const participants = mockVoiceParticipants
  const gridClass = tileGridClass(participants.length)
  const channelName = activeChannelId || 'afk-base'
  const voiceName = useMemo(() => `# ${channelName}`, [channelName])
  const savedLayout = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    try {
      const raw = window.localStorage.getItem('voice-thread-panel')
      if (!raw) return undefined
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }, [])

  return (
    <div className="flex h-full min-h-0 w-full">
      <PanelGroup
        {...({ autoSaveId: 'voice-thread-panel' } as any)}
        orientation="horizontal"
        defaultLayout={savedLayout}
        onLayoutChanged={(layout) => {
          if (typeof window === 'undefined') return
          window.localStorage.setItem('voice-thread-panel', JSON.stringify(layout))
        }}
        className="min-w-0 flex-1 overflow-hidden"
      >
        <Panel id="voice-main" className="overflow-hidden">
          <div className="relative flex min-w-0 flex-1 flex-col bg-[hsl(240,10%,6%)]">
            <div className="flex h-12 items-center justify-between px-4">
              <div className="flex min-w-0 items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <p className="truncate text-base font-semibold text-foreground">{voiceName}</p>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setShowMemberOverlay((v) => !v)}
                      className="flex h-8 w-8 items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Danh sách thành viên</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setShowThread((v) => !v)}
                      className="flex h-8 w-8 items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Hiện trò chuyện</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Cài đặt</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Rời kênh thoại</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {showMemberOverlay && (
              <div className="absolute right-4 top-14 z-20 w-56 rounded-md border border-border bg-[hsl(240,6%,10%)] p-2 shadow-lg">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members</p>
                <div className="space-y-1">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-2 rounded px-1.5 py-1">
                      <div className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white', participant.avatarColor)}>
                        {participant.name[0]?.toUpperCase() ?? '?'}
                      </div>
                      <p className="truncate text-sm text-foreground">{participant.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              <div
                className={cn(
                  'mx-auto grid h-full w-full auto-rows-max gap-4 content-center',
                  gridClass,
                  participants.length === 1 ? 'max-w-[900px]' : 'max-w-[1600px]'
                )}
              >
                {participants.map((participant) => {
                  const isMediaActive = participant.isScreenSharing || participant.isCameraOn
                  return (
                    <div
                      key={participant.id}
                      className={cn(
                        'relative aspect-video overflow-hidden rounded-lg bg-[hsl(240,8%,14%)]',
                        participants.length === 1 ? 'max-h-[600px]' : ''
                      )}
                    >
                      <div
                        className={cn(
                          'absolute inset-0 rounded-lg ring-2 transition-all duration-150 pointer-events-none',
                          participant.isSpeaking ? 'ring-green-500' : 'ring-transparent'
                        )}
                      />

                      {isMediaActive ? (
                        <>
                          <img
                            src={participant.streamUrl ?? `https://picsum.photos/seed/${participant.id}/900/600`}
                            alt={participant.name}
                            className="h-full w-full object-contain bg-black"
                          />
                          {participant.isScreenSharing && (
                            <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/50 px-2 py-0.5 text-[11px] text-white">
                              <Monitor className="h-3 w-3" />
                              <span>Screen Share</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          {participant.avatarUrl ? (
                            <img src={participant.avatarUrl} alt={participant.name} className="h-20 w-20 rounded-full object-cover" />
                          ) : (
                            <div className={cn('flex h-20 w-20 items-center justify-center rounded-full text-xl font-semibold text-white', participant.avatarColor)}>
                              {participant.name[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-sm font-medium text-white">
                        {participant.name}{' '}
                        {participant.isMuted && <span className="text-muted-foreground">• muted</span>}
                      </div>

                      {!isMediaActive && participant.isMuted && (
                        <div className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                          <MicOff className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex h-[60px] items-center justify-center gap-2">
              <div className="flex items-center overflow-hidden rounded-md bg-[hsl(240,5%,18%)]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setIsMuted((v) => !v)}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-l-md',
                        isMuted ? 'bg-red-500/20 text-red-400' : 'text-foreground'
                      )}
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{isMuted ? 'Bật tiếng' : 'Tắt tiếng'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="flex h-10 w-10 items-center justify-center border-l border-[hsl(240,4%,22%)] text-muted-foreground">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Cài đặt âm đầu vào</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center overflow-hidden rounded-md bg-[hsl(240,5%,18%)]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setIsCameraOn((v) => !v)}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-l-md',
                        !isCameraOn ? 'text-foreground' : 'text-green-400'
                      )}
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Bật camera</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="flex h-10 w-10 items-center justify-center border-l border-[hsl(240,4%,22%)] text-muted-foreground">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Cài đặt camera</TooltipContent>
                </Tooltip>
              </div>

              {[
                { icon: ArrowLeftRight, label: 'Hoạt động' },
                { icon: Users, label: 'Danh sách thành viên' },
                { icon: Sparkles, label: 'Hiệu ứng' },
                { icon: MoreHorizontal, label: 'Thêm' },
              ].map(({ icon: Icon, label }) => (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-md bg-[hsl(240,5%,18%)] text-foreground transition-colors hover:bg-[hsl(240,4%,22%)]"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="flex h-10 w-10 items-center justify-center rounded-md bg-red-500 text-white transition-colors hover:bg-red-600">
                    <PhoneOff className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Ngắt kết nối</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Toàn màn hình</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Thay đổi bố cục</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </Panel>
        {showThread && (
          <>
            <ResizeHandle />
            <Panel
              id="voice-thread"
              defaultSize={25}
              minSize={18}
              maxSize={40}
              className="overflow-hidden"
            >
              <aside className="flex h-full w-full flex-none flex-col border-l border-border bg-[hsl(240,6%,10%)]">
                <div className="flex h-12 items-center justify-between border-b border-border px-3">
                  <p className="truncate text-base font-semibold text-foreground"># {channelName}</p>
                  <button
                    type="button"
                    onClick={() => setShowThread(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ThreadPanelChat channelName={channelName} />
              </aside>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  )
}
