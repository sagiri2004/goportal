import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Room, Track } from 'livekit-client'
import {
  Camera,
  Gamepad2,
  LayoutGrid,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  MoreHorizontal,
  PhoneOff,
  Settings,
  Sparkles,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
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
  openInviteMemberDialog?: () => void
}

type ParticipantTileModel = {
  id: string
  name: string
  avatarUrl?: string
  avatarColor: string
  isSpeaking: boolean
  isMuted: boolean
  isScreenSharing: boolean
  trackRef?: any
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

const ParticipantTile: React.FC<{
  participant: ParticipantTileModel
  focused?: boolean
  thumbnail?: boolean
  onClick?: () => void
}> = ({ participant, focused = false, thumbnail = false, onClick }) => (
  <div
    className={cn(
      'relative cursor-pointer overflow-hidden rounded-lg bg-[hsl(240,8%,14%)]',
      thumbnail ? 'h-full w-full' : 'h-full w-full min-h-[180px] aspect-video',
      focused ? 'ring-2 ring-white' : 'ring-1 ring-white/10'
    )}
    onClick={onClick}
  >
    {participant.trackRef ? (
      <VideoTrack
        trackRef={participant.trackRef}
        className={cn(
          'h-full w-full',
          participant.isScreenSharing ? 'object-contain bg-black' : 'object-cover'
        )}
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-[hsl(240,8%,16%)]">
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

    {participant.isSpeaking && (
      <div className="pointer-events-none absolute inset-0 z-10 animate-pulse rounded-lg ring-2 ring-green-500" />
    )}

    {participant.isScreenSharing && (
      <div className="absolute left-2 top-2 z-20 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5">
        <Monitor className="h-3 w-3 text-white" />
        <span className="text-[10px] text-white">TRUC TIEP</span>
      </div>
    )}

    <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
      {participant.isMuted ? (
        <MicOff className="h-3 w-3 text-red-400" />
      ) : (
        <Mic className="h-3 w-3 text-white/70" />
      )}
      <span className={cn('font-medium text-white', thumbnail ? 'text-[11px]' : 'text-xs')}>{participant.name}</span>
    </div>
  </div>
)

const InviteActions: React.FC<{
  onInvite: () => void
  onActivity: () => void
}> = ({ onInvite, onActivity }) => (
  <div className="mt-4 flex justify-center gap-3">
    <button
      type="button"
      onClick={onInvite}
      className="flex cursor-pointer items-center gap-2 rounded-md bg-[hsl(240,5%,20%)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(240,5%,25%)]"
    >
      <UserPlus className="h-4 w-4" />
      <span>Moi vao Kenh thoai</span>
    </button>
    <button
      type="button"
      onClick={onActivity}
      className="flex cursor-pointer items-center gap-2 rounded-md bg-[hsl(240,5%,20%)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(240,5%,25%)]"
    >
      <Gamepad2 className="h-4 w-4" />
      <span>Chon Hoat Dong</span>
    </button>
  </div>
)

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
    openInviteMemberDialog,
  } = useOutletContext<ShellContext>()

  const [showThread, setShowThread] = useState(true)
  const [focusedParticipantId, setFocusedParticipantId] = useState<string | null>(null)
  const [forceGridMode, setForceGridMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
  const [showFooter, setShowFooter] = useState(true)
  const [isFooterHovered, setIsFooterHovered] = useState(false)
  const [footerInteractionTick, setFooterInteractionTick] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const fallbackRoomRef = useRef<Room | null>(null)
  if (!fallbackRoomRef.current) {
    fallbackRoomRef.current = new Room()
  }

  const channelName = voiceState?.channelName ?? (activeChannelId || 'voice')
  const chatChannelId = voiceState?.channelId ?? activeChannelId
  const livekitRoom = voiceState?.room ?? fallbackRoomRef.current

  const { localParticipant } = useLocalParticipant({ room: livekitRoom })
  const remoteParticipants = useParticipants({ room: livekitRoom })
  const videoTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    room: livekitRoom,
    onlySubscribed: false,
  }) as any[]

  const participantTiles = useMemo<ParticipantTileModel[]>(() => {
    if (!voiceState?.room || !localParticipant?.identity) {
      return []
    }

    const participants = [...remoteParticipants]
    const hasLocal = participants.some((participant) => participant.identity === localParticipant.identity)
    if (!hasLocal) {
      participants.push(localParticipant as any)
    }

    return participants.map((participant) => {
      const screenTrackRef = videoTracks.find(
        (candidate) =>
          candidate?.participant?.identity === participant.identity &&
          candidate?.source === Track.Source.ScreenShare
      )
      const cameraTrackRef = videoTracks.find(
        (candidate) =>
          candidate?.participant?.identity === participant.identity &&
          candidate?.source === Track.Source.Camera
      )
      const selectedTrackRef = screenTrackRef ?? cameraTrackRef

      const fallbackName =
        participant.identity === localParticipant.identity
          ? localParticipant.name || 'You'
          : participant.name || participant.identity || 'Unknown'

      return {
        id: participant.identity,
        name: fallbackName,
        avatarUrl: parseAvatarURL(participant.metadata),
        avatarColor: colorFromId(participant.identity || fallbackName),
        isSpeaking: Boolean(participant.isSpeaking),
        isMuted: !Boolean(participant.isMicrophoneEnabled),
        isScreenSharing: Boolean(screenTrackRef),
        trackRef: selectedTrackRef,
      }
    })
  }, [localParticipant, remoteParticipants, videoTracks, voiceState?.room])

  const screenShareParticipant = useMemo(
    () => participantTiles.find((participant) => participant.isScreenSharing),
    [participantTiles]
  )
  const hasScreenShare = Boolean(screenShareParticipant)

  useEffect(() => {
    if (!focusedParticipantId) {
      return
    }
    if (!participantTiles.some((participant) => participant.id === focusedParticipantId)) {
      setFocusedParticipantId(null)
    }
  }, [focusedParticipantId, participantTiles])

  const effectiveFocusedParticipantId = useMemo(() => {
    if (focusedParticipantId && participantTiles.some((participant) => participant.id === focusedParticipantId)) {
      return focusedParticipantId
    }
    if (hasScreenShare && screenShareParticipant) {
      return screenShareParticipant.id
    }
    return null
  }, [focusedParticipantId, hasScreenShare, participantTiles, screenShareParticipant])

  const isFocusLayout = useMemo(
    () => (Boolean(effectiveFocusedParticipantId) || hasScreenShare) && !forceGridMode,
    [effectiveFocusedParticipantId, forceGridMode, hasScreenShare]
  )

  const focusedParticipant = useMemo(
    () => participantTiles.find((participant) => participant.id === effectiveFocusedParticipantId) ?? null,
    [effectiveFocusedParticipantId, participantTiles]
  )

  const thumbnailParticipants = useMemo(
    () => participantTiles.filter((participant) => participant.id !== effectiveFocusedParticipantId),
    [effectiveFocusedParticipantId, participantTiles]
  )

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      pushToast('Khong the chuyen doi che do fullscreen.')
    }
  }, [pushToast])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
      setShowFooter(true)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  useEffect(() => {
    if (!isFullscreen || isFooterHovered) {
      setShowFooter(true)
      return
    }
    const timeoutId = window.setTimeout(() => {
      setShowFooter(false)
    }, 3000)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isFooterHovered, isFullscreen, footerInteractionTick])

  const handleRootMouseMove = useCallback(() => {
    if (!isFullscreen) {
      return
    }
    setShowFooter(true)
    setFooterInteractionTick((prev) => prev + 1)
  }, [isFullscreen])

  const handleInviteClick = useCallback(() => {
    if (openInviteMemberDialog) {
      openInviteMemberDialog()
      return
    }
    pushToast('Khong the mo hop thoai moi thanh vien.')
  }, [openInviteMemberDialog, pushToast])

  const handleActivityClick = useCallback(() => {
    pushToast('Tinh nang dang phat trien')
  }, [pushToast])

  const handleToggleFocus = useCallback(
    (participantId: string) => {
      setForceGridMode(false)
      setFocusedParticipantId((prev) => (prev === participantId ? null : participantId))
    },
    []
  )

  const handleGridToggle = useCallback(() => {
    setFocusedParticipantId(null)
    setForceGridMode((prev) => !prev)
  }, [])

  const renderGridLayout = useMemo(() => {
    const count = participantTiles.length
    if (count === 0) {
      return (
        <div className="flex h-full items-center justify-center rounded-lg border border-border/40 bg-[hsl(240,8%,14%)] text-sm text-muted-foreground">
          Chua ket noi voice. Vui long tham gia lai kenh thoai.
        </div>
      )
    }

    if (count === 1) {
      const single = participantTiles[0]
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <div className="h-[60%] w-full max-w-[960px]">
            <ParticipantTile participant={single} onClick={() => handleToggleFocus(single.id)} />
          </div>
          <InviteActions onInvite={handleInviteClick} onActivity={handleActivityClick} />
        </div>
      )
    }

    if (count === 2) {
      const sharing = participantTiles.find((participant) => participant.isScreenSharing)
      if (sharing) {
        const other = participantTiles.find((participant) => participant.id !== sharing.id) ?? sharing
        return (
          <div className="grid h-full grid-cols-[7fr_3fr] gap-3">
            <ParticipantTile participant={sharing} onClick={() => handleToggleFocus(sharing.id)} />
            <ParticipantTile participant={other} onClick={() => handleToggleFocus(other.id)} />
          </div>
        )
      }
      return (
        <div className="grid h-full grid-cols-2 gap-3">
          {participantTiles.map((participant) => (
            <ParticipantTile
              key={participant.id}
              participant={participant}
              onClick={() => handleToggleFocus(participant.id)}
            />
          ))}
        </div>
      )
    }

    if (count <= 4) {
      return (
        <div className="grid h-full grid-cols-2 gap-3">
          {participantTiles.map((participant) => (
            <ParticipantTile
              key={participant.id}
              participant={participant}
              onClick={() => handleToggleFocus(participant.id)}
            />
          ))}
        </div>
      )
    }

    return (
      <div className="grid h-full auto-rows-fr grid-cols-3 gap-3">
        {participantTiles.map((participant) => (
          <ParticipantTile
            key={participant.id}
            participant={participant}
            onClick={() => handleToggleFocus(participant.id)}
          />
        ))}
      </div>
    )
  }, [handleActivityClick, handleInviteClick, handleToggleFocus, participantTiles])

  const shareOwnerName = screenShareParticipant?.name ?? focusedParticipant?.name ?? ''

  return (
    <div
      ref={rootRef}
      onMouseMove={handleRootMouseMove}
      className="flex h-full min-h-0 min-w-0 w-full bg-[hsl(240,10%,6%)]"
    >
      <section className="flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-200">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-sm font-semibold text-foreground"># {channelName}</p>
            {(hasScreenShare || focusedParticipant?.isScreenSharing) && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-5 w-5 overflow-hidden rounded-full bg-[hsl(240,5%,20%)]">
                    {screenShareParticipant?.avatarUrl ? (
                      <img
                        src={screenShareParticipant.avatarUrl}
                        alt={shareOwnerName}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <span className="truncate text-sm text-foreground">{shareOwnerName} dang chia se man hinh</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {(hasScreenShare || focusedParticipant?.isScreenSharing) && (
              <>
                <span className="rounded bg-[hsl(240,5%,20%)] px-2 py-0.5 font-mono text-xs text-foreground">
                  720p 30FPS
                </span>
                <span className="animate-pulse rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  TRUC TIEP
                </span>
              </>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowThread((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{showThread ? 'An chat voice' : 'Hien chat voice'}</TooltipContent>
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
                  <TooltipContent>Cai dat voice</TooltipContent>
                </Tooltip>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => pushToast('Tinh nang dang phat trien')}>
                    Cai dat nang cao voice
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
              <TooltipContent>Roi kenh thoai</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-3 md:p-4">
          {isFocusLayout && focusedParticipant ? (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="min-h-0 flex-1">
                <ParticipantTile
                  participant={focusedParticipant}
                  focused
                  onClick={() => handleToggleFocus(focusedParticipant.id)}
                />
              </div>
              {thumbnailParticipants.length > 0 && (
                <div className="h-[140px] overflow-x-auto">
                  <div className="flex h-full gap-2 px-1">
                    {thumbnailParticipants.map((participant) => (
                      <div key={participant.id} className="h-[130px] w-[220px] flex-shrink-0">
                        <ParticipantTile
                          participant={participant}
                          thumbnail
                          focused={participant.id === effectiveFocusedParticipantId}
                          onClick={() => handleToggleFocus(participant.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            renderGridLayout
          )}
        </div>

        <footer
          onMouseEnter={() => {
            setIsFooterHovered(true)
            setShowFooter(true)
          }}
          onMouseLeave={() => setIsFooterHovered(false)}
          className={cn(
            'shrink-0 border-t border-white/10 px-4 py-3 transition-opacity duration-300',
            !isFullscreen || showFooter ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          {isFocusLayout ? (
            <div className="flex items-center justify-center">
              <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={handleInviteClick}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
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
                <button
                  type="button"
                  onClick={() => void toggleCamera()}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10"
                >
                  <Camera className="h-4 w-4" />
                </button>
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
                <button
                  type="button"
                  onClick={handleActivityClick}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowThread((prev) => !prev)}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10"
                >
                  <Users className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => pushToast('Tinh nang dang phat trien')}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => pushToast('Tinh nang dang phat trien')}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10"
                >
                  <VolumeX className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleGridToggle}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void leaveVoiceChannel()}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur-sm">
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
                <button
                  type="button"
                  onClick={() => setShowThread((prev) => !prev)}
                  className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10"
                >
                  <Users className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void leaveVoiceChannel()}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </footer>
      </section>

      <aside
        className={cn(
          'h-full flex-none overflow-hidden bg-[hsl(240,6%,10%)] transition-all duration-200',
          showThread
            ? 'basis-[clamp(300px,30vw,420px)] border-l border-white/10 opacity-100'
            : 'w-0 basis-0 border-l-0 opacity-0 pointer-events-none'
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
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
            <ThreadPanelChat channelName={channelName} channelId={chatChannelId} />
          </div>
        </div>
      </aside>
    </div>
  )
}
