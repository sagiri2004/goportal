import React, { useMemo, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@goportal/ui'
import { useOutletContext } from 'react-router-dom'
import { VideoTrack, useLocalParticipant, useParticipants, useTracks } from '@livekit/components-react'
import { type Room, Track } from 'livekit-client'
import {
  Camera,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Settings,
  Users,
  Volume2,
  X,
} from 'lucide-react'
import { ThreadPanelChat } from './components/ThreadPanelChat'

type VoiceState = {
  channelId: string
  channelName: string
  serverId: string
  serverName: string
  room: Room
  isMicrophoneEnabled: boolean
  isCameraEnabled: boolean
  isScreenShareEnabled: boolean
}

type ShellContext = {
  activeChannelId: string
  voiceState: VoiceState | null
  canManageVoiceTools: boolean
  leaveVoiceChannel: () => Promise<void>
  toggleMicrophone: () => Promise<void>
  toggleCamera: () => Promise<void>
  toggleScreenShare: () => Promise<void>
  pushToast: (message: string) => void
}

const getGridLayout = (count: number) => {
  if (count <= 1) return { columns: 1, rows: 1 }
  if (count === 2) return { columns: 2, rows: 1 }
  if (count <= 4) return { columns: 2, rows: 2 }
  const columns = 3
  return { columns, rows: Math.ceil(count / columns) }
}

const colorFromId = (id: string): string => {
  const palette = ['bg-indigo-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-cyan-500', 'bg-rose-500']
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index)) % 1031
  }
  return palette[hash % palette.length]
}

const initialsFromName = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)

const parseAvatarURL = (metadata?: string): string | undefined => {
  if (!metadata) {
    return undefined
  }

  try {
    const parsed = JSON.parse(metadata) as { avatar_url?: string; avatarUrl?: string }
    return parsed.avatar_url ?? parsed.avatarUrl
  } catch {
    return undefined
  }
}

const ConnectedVoiceGrid: React.FC<{ room: Room }> = ({ room }) => {
  const participants = useParticipants({ room })
  const { localParticipant } = useLocalParticipant({ room })
  const videoTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { room, onlySubscribed: false }) as any[]

  const participantTiles = useMemo(() => {
    return participants.map((participant) => {
      const screenShareTrackRef = videoTracks.find(
        (candidate) =>
          candidate?.participant?.identity === participant.identity &&
          candidate?.source === Track.Source.ScreenShare
      )
      const cameraTrackRef = videoTracks.find(
        (candidate) =>
          candidate?.participant?.identity === participant.identity &&
          candidate?.source === Track.Source.Camera
      )
      const trackRef = screenShareTrackRef ?? cameraTrackRef
      const trackSource = trackRef?.source as Track.Source | undefined
      const isMediaActive = Boolean(trackRef)
      const isScreenSharing = trackSource === Track.Source.ScreenShare
      const name =
        participant.identity === localParticipant.identity
          ? (participant.name || localParticipant.name || 'You')
          : (participant.name || participant.identity || 'Unknown')

      return {
        id: participant.identity,
        name,
        avatarUrl: parseAvatarURL(participant.metadata),
        avatarColor: colorFromId(participant.identity || name),
        isSpeaking: participant.isSpeaking,
        isMicrophoneEnabled: participant.isMicrophoneEnabled,
        isScreenSharing,
        isMediaActive,
        trackRef,
      }
    })
  }, [localParticipant.identity, localParticipant.name, participants, videoTracks])

  const { columns, rows } = getGridLayout(Math.max(1, participantTiles.length))

  return (
    <div
      className={cn(
        'mx-auto grid h-full w-full gap-3',
        participantTiles.length <= 1 ? 'max-w-[960px]' : 'max-w-[1600px]'
      )}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {participantTiles.map((participant) => (
        <div
          key={participant.id}
          className={cn(
            'relative h-full min-h-[180px] overflow-hidden rounded-lg border border-white/10 bg-[hsl(240,8%,14%)]',
            participantTiles.length === 1 ? 'aspect-video max-h-[620px] self-center' : ''
          )}
        >
          <div
            className={cn(
              'pointer-events-none absolute inset-0 rounded-lg ring-2 transition-all duration-150',
              participant.isSpeaking ? 'ring-green-500' : 'ring-transparent'
            )}
          />

          {participant.isMediaActive ? (
            <>
              <VideoTrack trackRef={participant.trackRef} className="h-full w-full bg-black object-contain" />
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
                <div
                  className={cn(
                    'flex h-20 w-20 items-center justify-center rounded-full text-xl font-semibold text-white',
                    participant.avatarColor
                  )}
                >
                  {initialsFromName(participant.name)}
                </div>
              )}
            </div>
          )}

          <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-sm font-medium text-white">
            {participant.name}{' '}
            {!participant.isMicrophoneEnabled && <span className="text-muted-foreground">• muted</span>}
          </div>

          {!participant.isMediaActive && !participant.isMicrophoneEnabled && (
            <div className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export const VoiceChannelView: React.FC = () => {
  const {
    activeChannelId,
    voiceState,
    canManageVoiceTools,
    leaveVoiceChannel,
    toggleMicrophone,
    toggleCamera,
    toggleScreenShare,
    pushToast,
  } = useOutletContext<ShellContext>()

  const [showThread, setShowThread] = useState(false)

  const channelName = voiceState?.channelName ?? (activeChannelId || 'voice')
  const voiceName = useMemo(() => `# ${channelName}`, [channelName])
  const disabledRecordingMessage = 'Ghi âm và stream tạm thời bị tắt để ổn định voice channel.'

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full bg-[hsl(240,10%,6%)]">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-sm font-semibold text-foreground">{voiceName}</p>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowThread((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{showThread ? 'Ẩn trò chuyện' : 'Hiện trò chuyện'}</TooltipContent>
            </Tooltip>

            {canManageVoiceTools ? (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Cài đặt voice</TooltipContent>
                </Tooltip>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => pushToast(disabledRecordingMessage)}
                  >
                    Ghi âm/Stream tạm tắt
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void leaveVoiceChannel()}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Rời kênh thoại</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-4">
          {voiceState?.room ? (
            <ConnectedVoiceGrid room={voiceState.room} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-border/40 bg-[hsl(240,8%,14%)] text-sm text-muted-foreground">
              Chưa kết nối voice. Vui lòng tham gia lại kênh thoại.
            </div>
          )}
        </div>

        <footer className="flex h-16 shrink-0 items-center justify-center border-t border-white/10 px-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void toggleMicrophone()}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                    voiceState?.isMicrophoneEnabled
                      ? 'text-foreground hover:bg-white/10'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  )}
                >
                  {voiceState?.isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{voiceState?.isMicrophoneEnabled ? 'Tắt tiếng' : 'Bật tiếng'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void toggleCamera()}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10',
                    voiceState?.isCameraEnabled ? 'text-green-400' : 'text-foreground'
                  )}
                >
                  <Camera className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Camera</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void toggleScreenShare()}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10',
                    voiceState?.isScreenShareEnabled ? 'text-green-400' : 'text-foreground'
                  )}
                >
                  <Monitor className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Chia sẻ màn hình</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowThread((v) => !v)}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10"
                >
                  <Users className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Thành viên và chat</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void leaveVoiceChannel()}
                  className="flex h-10 w-10 items-center justify-center rounded-md bg-red-500 text-white transition-colors hover:bg-red-600"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Ngắt kết nối</TooltipContent>
            </Tooltip>
          </div>
        </footer>
      </section>

      {showThread ? (
        <aside className="hidden h-full w-[360px] shrink-0 border-l border-white/10 bg-[hsl(240,6%,10%)] lg:flex lg:min-h-0 lg:flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3">
            <p className="truncate text-sm font-semibold text-foreground"># {channelName}</p>
            <button
              type="button"
              onClick={() => setShowThread(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ThreadPanelChat channelName={channelName} channelId={activeChannelId} />
          </div>
        </aside>
      ) : null}

    </div>
  )
}
