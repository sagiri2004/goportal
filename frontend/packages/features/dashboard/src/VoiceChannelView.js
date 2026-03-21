import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Tooltip, TooltipContent, TooltipTrigger, cn, } from '@goportal/ui';
import { useOutletContext } from 'react-router-dom';
import { VideoTrack, useLocalParticipant, useParticipants, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Camera, MessageSquare, Mic, MicOff, Monitor, PhoneOff, Settings, Users, Volume2, X, } from 'lucide-react';
import { ThreadPanelChat } from './components/ThreadPanelChat';
const getGridLayout = (count) => {
    if (count <= 1)
        return { columns: 1, rows: 1 };
    if (count === 2)
        return { columns: 2, rows: 1 };
    if (count <= 4)
        return { columns: 2, rows: 2 };
    const columns = 3;
    return { columns, rows: Math.ceil(count / columns) };
};
const colorFromId = (id) => {
    const palette = ['bg-indigo-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-cyan-500', 'bg-rose-500'];
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
        hash = (hash + id.charCodeAt(index)) % 1031;
    }
    return palette[hash % palette.length];
};
const initialsFromName = (name) => name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
const parseAvatarURL = (metadata) => {
    if (!metadata) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(metadata);
        return parsed.avatar_url ?? parsed.avatarUrl;
    }
    catch {
        return undefined;
    }
};
const ConnectedVoiceGrid = ({ room }) => {
    const participants = useParticipants({ room });
    const { localParticipant } = useLocalParticipant({ room });
    const videoTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { room, onlySubscribed: false });
    const participantTiles = useMemo(() => {
        return participants.map((participant) => {
            const screenShareTrackRef = videoTracks.find((candidate) => candidate?.participant?.identity === participant.identity &&
                candidate?.source === Track.Source.ScreenShare);
            const cameraTrackRef = videoTracks.find((candidate) => candidate?.participant?.identity === participant.identity &&
                candidate?.source === Track.Source.Camera);
            const trackRef = screenShareTrackRef ?? cameraTrackRef;
            const trackSource = trackRef?.source;
            const isMediaActive = Boolean(trackRef);
            const isScreenSharing = trackSource === Track.Source.ScreenShare;
            const name = participant.identity === localParticipant.identity
                ? (participant.name || localParticipant.name || 'You')
                : (participant.name || participant.identity || 'Unknown');
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
            };
        });
    }, [localParticipant.identity, localParticipant.name, participants, videoTracks]);
    const { columns, rows } = getGridLayout(Math.max(1, participantTiles.length));
    return (_jsx("div", { className: cn('mx-auto grid h-full w-full gap-3', participantTiles.length <= 1 ? 'max-w-[960px]' : 'max-w-[1600px]'), style: {
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }, children: participantTiles.map((participant) => (_jsxs("div", { className: cn('relative h-full min-h-[180px] overflow-hidden rounded-lg border border-white/10 bg-[hsl(240,8%,14%)]', participantTiles.length === 1 ? 'aspect-video max-h-[620px] self-center' : ''), children: [_jsx("div", { className: cn('pointer-events-none absolute inset-0 rounded-lg ring-2 transition-all duration-150', participant.isSpeaking ? 'ring-green-500' : 'ring-transparent') }), participant.isMediaActive ? (_jsxs(_Fragment, { children: [_jsx(VideoTrack, { trackRef: participant.trackRef, className: "h-full w-full bg-black object-contain" }), participant.isScreenSharing && (_jsxs("div", { className: "absolute left-2 top-2 flex items-center gap-1 rounded bg-black/50 px-2 py-0.5 text-[11px] text-white", children: [_jsx(Monitor, { className: "h-3 w-3" }), _jsx("span", { children: "Screen Share" })] }))] })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center", children: participant.avatarUrl ? (_jsx("img", { src: participant.avatarUrl, alt: participant.name, className: "h-20 w-20 rounded-full object-cover" })) : (_jsx("div", { className: cn('flex h-20 w-20 items-center justify-center rounded-full text-xl font-semibold text-white', participant.avatarColor), children: initialsFromName(participant.name) })) })), _jsxs("div", { className: "absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-sm font-medium text-white", children: [participant.name, ' ', !participant.isMicrophoneEnabled && _jsx("span", { className: "text-muted-foreground", children: "\u2022 muted" })] }), !participant.isMediaActive && !participant.isMicrophoneEnabled && (_jsx("div", { className: "absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500", children: _jsx(MicOff, { className: "h-3 w-3 text-white" }) }))] }, participant.id))) }));
};
export const VoiceChannelView = () => {
    const { activeChannelId, voiceState, canManageVoiceTools, leaveVoiceChannel, toggleMicrophone, toggleCamera, toggleScreenShare, pushToast, } = useOutletContext();
    const [showThread, setShowThread] = useState(false);
    const channelName = voiceState?.channelName ?? (activeChannelId || 'voice');
    const voiceName = useMemo(() => `# ${channelName}`, [channelName]);
    const disabledRecordingMessage = 'Ghi âm và stream tạm thời bị tắt để ổn định voice channel.';
    return (_jsxs("div", { className: "flex h-full min-h-0 min-w-0 w-full bg-[hsl(240,10%,6%)]", children: [_jsxs("section", { className: "flex min-h-0 min-w-0 flex-1 flex-col", children: [_jsxs("header", { className: "flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsx(Volume2, { className: "h-4 w-4 text-muted-foreground" }), _jsx("p", { className: "truncate text-sm font-semibold text-foreground", children: voiceName })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => setShowThread((v) => !v), className: "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", children: _jsx(MessageSquare, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: showThread ? 'Ẩn trò chuyện' : 'Hiện trò chuyện' })] }), canManageVoiceTools ? (_jsxs(DropdownMenu, { children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(DropdownMenuTrigger, { asChild: true, children: _jsx("button", { type: "button", className: "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", children: _jsx(Settings, { className: "h-4 w-4" }) }) }) }), _jsx(TooltipContent, { children: "C\u00E0i \u0111\u1EB7t voice" })] }), _jsx(DropdownMenuContent, { align: "end", className: "w-56", children: _jsx(DropdownMenuItem, { onClick: () => pushToast(disabledRecordingMessage), children: "Ghi \u00E2m/Stream t\u1EA1m t\u1EAFt" }) })] })) : null, _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => void leaveVoiceChannel(), className: "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", children: _jsx(X, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: "R\u1EDDi k\u00EAnh tho\u1EA1i" })] })] })] }), _jsx("div", { className: "min-h-0 flex-1 overflow-hidden p-4", children: voiceState?.room ? (_jsx(ConnectedVoiceGrid, { room: voiceState.room })) : (_jsx("div", { className: "flex h-full items-center justify-center rounded-lg border border-border/40 bg-[hsl(240,8%,14%)] text-sm text-muted-foreground", children: "Ch\u01B0a k\u1EBFt n\u1ED1i voice. Vui l\u00F2ng tham gia l\u1EA1i k\u00EAnh tho\u1EA1i." })) }), _jsx("footer", { className: "flex h-16 shrink-0 items-center justify-center border-t border-white/10 px-4", children: _jsxs("div", { className: "flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur-sm", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => void toggleMicrophone(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors', voiceState?.isMicrophoneEnabled
                                                    ? 'text-foreground hover:bg-white/10'
                                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'), children: voiceState?.isMicrophoneEnabled ? _jsx(Mic, { className: "h-4 w-4" }) : _jsx(MicOff, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: voiceState?.isMicrophoneEnabled ? 'Tắt tiếng' : 'Bật tiếng' })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => void toggleCamera(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10', voiceState?.isCameraEnabled ? 'text-green-400' : 'text-foreground'), children: _jsx(Camera, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: "Camera" })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => void toggleScreenShare(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10', voiceState?.isScreenShareEnabled ? 'text-green-400' : 'text-foreground'), children: _jsx(Monitor, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: "Chia s\u1EBB m\u00E0n h\u00ECnh" })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => setShowThread((v) => !v), className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(Users, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: "Th\u00E0nh vi\u00EAn v\u00E0 chat" })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => void leaveVoiceChannel(), className: "flex h-10 w-10 items-center justify-center rounded-md bg-red-500 text-white transition-colors hover:bg-red-600", children: _jsx(PhoneOff, { className: "h-5 w-5" }) }) }), _jsx(TooltipContent, { children: "Ng\u1EAFt k\u1EBFt n\u1ED1i" })] })] }) })] }), showThread ? (_jsxs("aside", { className: "hidden h-full w-[360px] shrink-0 border-l border-white/10 bg-[hsl(240,6%,10%)] lg:flex lg:min-h-0 lg:flex-col", children: [_jsxs("div", { className: "flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3", children: [_jsxs("p", { className: "truncate text-sm font-semibold text-foreground", children: ["# ", channelName] }), _jsx("button", { type: "button", onClick: () => setShowThread(false), className: "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "min-h-0 flex-1 overflow-hidden", children: _jsx(ThreadPanelChat, { channelName: channelName, channelId: activeChannelId }) })] })) : null] }));
};
//# sourceMappingURL=VoiceChannelView.js.map