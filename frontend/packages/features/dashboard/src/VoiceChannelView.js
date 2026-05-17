import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Tooltip, TooltipContent, TooltipTrigger, cn, } from '@goportal/ui';
import { useOutletContext } from 'react-router-dom';
import { VideoTrack, useLocalParticipant, useParticipants, useTracks } from '@livekit/components-react';
import { Room, Track } from 'livekit-client';
import { Camera, Gamepad2, LayoutGrid, Maximize2, MessageSquare, Mic, MicOff, Minimize2, Monitor, MoreHorizontal, PhoneOff, Settings, Sparkles, UserPlus, Users, Volume2, VolumeX, X, } from 'lucide-react';
import { ThreadPanelChat } from './components/ThreadPanelChat';
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
const normalizeTournamentVoiceRole = (name) => {
    const lower = name.toLowerCase();
    if (lower.startsWith('team-a-') || lower === 'team-a-comms')
        return 'team-a';
    if (lower.startsWith('team-b-') || lower === 'team-b-comms')
        return 'team-b';
    if (lower.startsWith('admin-') || lower === 'admin-observer')
        return 'admin';
    if (lower.startsWith('spectator-') || lower === 'spectator-live')
        return 'spectator';
    if (lower.startsWith('caster-') || lower === 'caster-booth')
        return 'caster';
    return null;
};
const extractMatchTag = (name) => {
    const lower = name.toLowerCase();
    const match = lower.match(/(r\d+-m\d+)$/);
    if (match?.[1])
        return match[1];
    if (lower === 'team-a-comms' ||
        lower === 'team-b-comms' ||
        lower === 'admin-observer' ||
        lower === 'spectator-live' ||
        lower === 'caster-booth') {
        return 'legacy';
    }
    return null;
};
const ParticipantTile = ({ participant, focused = false, thumbnail = false, onClick }) => (_jsxs("div", { className: cn('relative cursor-pointer overflow-hidden rounded-lg bg-[hsl(240,8%,14%)]', thumbnail ? 'h-full w-full' : 'h-full w-full min-h-[180px] aspect-video', focused ? 'ring-2 ring-white' : 'ring-1 ring-white/10'), onClick: onClick, children: [participant.trackRef ? (_jsx(VideoTrack, { trackRef: participant.trackRef, className: cn('h-full w-full', participant.isScreenSharing ? 'object-contain bg-black' : 'object-cover') })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center bg-[hsl(240,8%,16%)]", children: participant.avatarUrl ? (_jsx("img", { src: participant.avatarUrl, alt: participant.name, className: "h-20 w-20 rounded-full object-cover" })) : (_jsx("div", { className: cn('flex h-20 w-20 items-center justify-center rounded-full text-xl font-semibold text-white', participant.avatarColor), children: initialsFromName(participant.name) })) })), participant.isSpeaking && (_jsx("div", { className: "pointer-events-none absolute inset-0 z-10 animate-pulse rounded-lg ring-2 ring-green-500" })), participant.isScreenSharing && (_jsxs("div", { className: "absolute left-2 top-2 z-20 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5", children: [_jsx(Monitor, { className: "h-3 w-3 text-white" }), _jsx("span", { className: "text-[10px] text-white", children: "TRUC TIEP" })] })), _jsxs("div", { className: "absolute bottom-2 left-2 z-20 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm", children: [participant.isMuted ? (_jsx(MicOff, { className: "h-3 w-3 text-red-400" })) : (_jsx(Mic, { className: "h-3 w-3 text-white/70" })), _jsx("span", { className: cn('font-medium text-white', thumbnail ? 'text-[11px]' : 'text-xs'), children: participant.name })] })] }));
const ObserverRoomPanel = ({ room, channelName }) => {
    const remoteParticipants = useParticipants({ room });
    const videoTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
        room,
        onlySubscribed: false,
    });
    const participantTiles = useMemo(() => {
        return remoteParticipants.map((participant) => {
            const screenTrackRef = videoTracks.find((candidate) => candidate?.participant?.identity === participant.identity &&
                candidate?.source === Track.Source.ScreenShare);
            const cameraTrackRef = videoTracks.find((candidate) => candidate?.participant?.identity === participant.identity &&
                candidate?.source === Track.Source.Camera);
            const selectedTrackRef = screenTrackRef ?? cameraTrackRef;
            const fallbackName = participant.name || participant.identity || 'Unknown';
            return {
                id: `${channelName}:${participant.identity}`,
                name: fallbackName,
                avatarUrl: parseAvatarURL(participant.metadata),
                avatarColor: colorFromId(participant.identity || fallbackName),
                isSpeaking: Boolean(participant.isSpeaking),
                isMuted: !Boolean(participant.isMicrophoneEnabled),
                isScreenSharing: Boolean(screenTrackRef),
                trackRef: selectedTrackRef,
            };
        });
    }, [channelName, remoteParticipants, videoTracks]);
    return (_jsxs("div", { className: "rounded-lg border border-white/10 bg-black/25 p-2", children: [_jsx("p", { className: "mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300", children: channelName }), participantTiles.length === 0 ? (_jsx("div", { className: "rounded border border-dashed border-white/15 bg-black/30 px-3 py-4 text-xs text-zinc-400", children: "Waiting for player stream..." })) : (_jsx("div", { className: "grid grid-cols-2 gap-2", children: participantTiles.map((participant) => (_jsx("div", { className: "h-[160px]", children: _jsx(ParticipantTile, { participant: participant, thumbnail: true }) }, participant.id))) }))] }));
};
const InviteActions = ({ onInvite, onActivity }) => (_jsxs("div", { className: "mt-4 flex justify-center gap-3", children: [_jsxs("button", { type: "button", onClick: onInvite, className: "flex cursor-pointer items-center gap-2 rounded-md bg-[hsl(240,5%,20%)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(240,5%,25%)]", children: [_jsx(UserPlus, { className: "h-4 w-4" }), _jsx("span", { children: "Moi vao Kenh thoai" })] }), _jsxs("button", { type: "button", onClick: onActivity, className: "flex cursor-pointer items-center gap-2 rounded-md bg-[hsl(240,5%,20%)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(240,5%,25%)]", children: [_jsx(Gamepad2, { className: "h-4 w-4" }), _jsx("span", { children: "Chon Hoat Dong" })] })] }));
export const VoiceChannelView = () => {
    const { activeChannelId, activeCategories = [], voiceState, canManageVoiceTools, joinVoiceChannel, requestTournamentObserverTokens, leaveVoiceChannel, toggleMicrophone, toggleCamera, toggleScreenShare, pushToast, openInviteMemberDialog, } = useOutletContext();
    const [showThread, setShowThread] = useState(true);
    const [focusedParticipantId, setFocusedParticipantId] = useState(null);
    const [forceGridMode, setForceGridMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
    const [showFooter, setShowFooter] = useState(true);
    const [isFooterHovered, setIsFooterHovered] = useState(false);
    const [footerInteractionTick, setFooterInteractionTick] = useState(0);
    const [observerRooms, setObserverRooms] = useState([]);
    const rootRef = useRef(null);
    const fallbackRoomRef = useRef(null);
    if (!fallbackRoomRef.current) {
        fallbackRoomRef.current = new Room();
    }
    const channelName = voiceState?.channelName ?? (activeChannelId || 'voice');
    const chatChannelId = voiceState?.channelId ?? activeChannelId;
    const livekitRoom = voiceState?.room ?? fallbackRoomRef.current;
    const activeMatchTag = useMemo(() => extractMatchTag(channelName), [channelName]);
    const isTournamentVoice = useMemo(() => normalizeTournamentVoiceRole(channelName) !== null, [channelName]);
    const tournamentMonitorTargets = useMemo(() => {
        if (!activeMatchTag)
            return [];
        return activeCategories
            .flatMap((group) => group.channels)
            .filter((channel) => channel.type === 'voice')
            .filter((channel) => extractMatchTag(channel.name) === activeMatchTag)
            .map((channel) => ({
            id: channel.id,
            name: channel.name,
            role: normalizeTournamentVoiceRole(channel.name),
            activeCount: channel.activeMembers?.length ?? 0,
            isLive: Boolean(channel.isLive),
        }))
            .filter((channel) => channel.role !== null)
            .sort((left, right) => {
            const order = { 'team-a': 1, 'team-b': 2, admin: 3, caster: 4, spectator: 5 };
            return (order[left.role ?? ''] ?? 99) - (order[right.role ?? ''] ?? 99);
        });
    }, [activeCategories, activeMatchTag]);
    const currentChannelRole = useMemo(() => normalizeTournamentVoiceRole(channelName), [channelName]);
    const observerTargetChannels = useMemo(() => {
        if (currentChannelRole !== 'admin')
            return [];
        return tournamentMonitorTargets
            .filter((target) => target.role === 'team-a' || target.role === 'team-b')
            .map((target) => ({ id: target.id, name: target.name }));
    }, [currentChannelRole, tournamentMonitorTargets]);
    const { localParticipant } = useLocalParticipant({ room: livekitRoom });
    const remoteParticipants = useParticipants({ room: livekitRoom });
    const videoTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
        room: livekitRoom,
        onlySubscribed: false,
    });
    const participantTiles = useMemo(() => {
        if (!voiceState?.room || !localParticipant?.identity) {
            return [];
        }
        const participants = [...remoteParticipants];
        const hasLocal = participants.some((participant) => participant.identity === localParticipant.identity);
        if (!hasLocal) {
            participants.push(localParticipant);
        }
        return participants.map((participant) => {
            const screenTrackRef = videoTracks.find((candidate) => candidate?.participant?.identity === participant.identity &&
                candidate?.source === Track.Source.ScreenShare);
            const cameraTrackRef = videoTracks.find((candidate) => candidate?.participant?.identity === participant.identity &&
                candidate?.source === Track.Source.Camera);
            const selectedTrackRef = screenTrackRef ?? cameraTrackRef;
            const fallbackName = participant.identity === localParticipant.identity
                ? localParticipant.name || 'You'
                : participant.name || participant.identity || 'Unknown';
            return {
                id: participant.identity,
                name: fallbackName,
                avatarUrl: parseAvatarURL(participant.metadata),
                avatarColor: colorFromId(participant.identity || fallbackName),
                isSpeaking: Boolean(participant.isSpeaking),
                isMuted: !Boolean(participant.isMicrophoneEnabled),
                isScreenSharing: Boolean(screenTrackRef),
                trackRef: selectedTrackRef,
            };
        });
    }, [localParticipant, remoteParticipants, videoTracks, voiceState?.room]);
    const screenShareParticipant = useMemo(() => participantTiles.find((participant) => participant.isScreenSharing), [participantTiles]);
    const hasScreenShare = Boolean(screenShareParticipant);
    useEffect(() => {
        if (!focusedParticipantId) {
            return;
        }
        if (!participantTiles.some((participant) => participant.id === focusedParticipantId)) {
            setFocusedParticipantId(null);
        }
    }, [focusedParticipantId, participantTiles]);
    const effectiveFocusedParticipantId = useMemo(() => {
        if (focusedParticipantId && participantTiles.some((participant) => participant.id === focusedParticipantId)) {
            return focusedParticipantId;
        }
        if (hasScreenShare && screenShareParticipant) {
            return screenShareParticipant.id;
        }
        return null;
    }, [focusedParticipantId, hasScreenShare, participantTiles, screenShareParticipant]);
    const isFocusLayout = useMemo(() => (Boolean(effectiveFocusedParticipantId) || hasScreenShare) && !forceGridMode, [effectiveFocusedParticipantId, forceGridMode, hasScreenShare]);
    const focusedParticipant = useMemo(() => participantTiles.find((participant) => participant.id === effectiveFocusedParticipantId) ?? null, [effectiveFocusedParticipantId, participantTiles]);
    const thumbnailParticipants = useMemo(() => participantTiles.filter((participant) => participant.id !== effectiveFocusedParticipantId), [effectiveFocusedParticipantId, participantTiles]);
    const primaryVideoTrackRef = useMemo(() => focusedParticipant?.trackRef ?? screenShareParticipant?.trackRef ?? null, [focusedParticipant?.trackRef, screenShareParticipant?.trackRef]);
    const [qualityBadge, setQualityBadge] = useState('N/A');
    useEffect(() => {
        if (!primaryVideoTrackRef) {
            setQualityBadge('N/A');
            return;
        }
        let cancelled = false;
        const readTrackQuality = () => {
            const lkTrack = primaryVideoTrackRef?.publication?.track ?? primaryVideoTrackRef?.track ?? null;
            const mediaTrack = lkTrack?.mediaStreamTrack;
            const settings = typeof mediaTrack?.getSettings === 'function' ? mediaTrack.getSettings() : undefined;
            const trackDimensions = lkTrack?.dimensions;
            const height = typeof settings?.height === 'number' ? settings.height : trackDimensions?.height;
            const fpsValue = typeof settings?.frameRate === 'number' ? settings.frameRate : undefined;
            const resolutionLabel = typeof height === 'number' && height > 0 ? `${Math.round(height)}p` : 'N/A';
            const fpsLabel = typeof fpsValue === 'number' && fpsValue > 0 ? `${Math.round(fpsValue)}FPS` : 'N/A';
            if (!cancelled) {
                setQualityBadge(`${resolutionLabel} ${fpsLabel}`);
            }
        };
        readTrackQuality();
        const timer = window.setInterval(readTrackQuality, 1500);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [primaryVideoTrackRef]);
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            }
            else {
                await document.exitFullscreen();
            }
        }
        catch {
            pushToast('Khong the chuyen doi che do fullscreen.');
        }
    }, [pushToast]);
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
            setShowFooter(true);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, []);
    useEffect(() => {
        if (!isFullscreen || isFooterHovered) {
            setShowFooter(true);
            return;
        }
        const timeoutId = window.setTimeout(() => {
            setShowFooter(false);
        }, 3000);
        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [isFooterHovered, isFullscreen, footerInteractionTick]);
    const handleRootMouseMove = useCallback(() => {
        if (!isFullscreen) {
            return;
        }
        setShowFooter(true);
        setFooterInteractionTick((prev) => prev + 1);
    }, [isFullscreen]);
    const handleInviteClick = useCallback(() => {
        if (openInviteMemberDialog) {
            openInviteMemberDialog();
            return;
        }
        pushToast('Khong the mo hop thoai moi thanh vien.');
    }, [openInviteMemberDialog, pushToast]);
    const handleActivityClick = useCallback(() => {
        pushToast('Tinh nang dang phat trien');
    }, [pushToast]);
    const handleToggleFocus = useCallback((participantId) => {
        setForceGridMode(false);
        setFocusedParticipantId((prev) => (prev === participantId ? null : participantId));
    }, []);
    const handleGridToggle = useCallback(() => {
        setFocusedParticipantId(null);
        setForceGridMode((prev) => !prev);
    }, []);
    const renderGridLayout = useMemo(() => {
        const count = participantTiles.length;
        if (count === 0) {
            return (_jsx("div", { className: "flex h-full items-center justify-center rounded-lg border border-border/40 bg-[hsl(240,8%,14%)] text-sm text-muted-foreground", children: "Chua ket noi voice. Vui long tham gia lai kenh thoai." }));
        }
        if (count === 1) {
            const single = participantTiles[0];
            return (_jsxs("div", { className: "flex h-full flex-col items-center justify-center", children: [_jsx("div", { className: "h-[60%] w-full max-w-[960px]", children: _jsx(ParticipantTile, { participant: single, onClick: () => handleToggleFocus(single.id) }) }), _jsx(InviteActions, { onInvite: handleInviteClick, onActivity: handleActivityClick })] }));
        }
        if (count === 2) {
            const sharing = participantTiles.find((participant) => participant.isScreenSharing);
            if (sharing) {
                const other = participantTiles.find((participant) => participant.id !== sharing.id) ?? sharing;
                return (_jsxs("div", { className: "grid h-full grid-cols-[7fr_3fr] gap-3", children: [_jsx(ParticipantTile, { participant: sharing, onClick: () => handleToggleFocus(sharing.id) }), _jsx(ParticipantTile, { participant: other, onClick: () => handleToggleFocus(other.id) })] }));
            }
            return (_jsx("div", { className: "grid h-full grid-cols-2 gap-3", children: participantTiles.map((participant) => (_jsx(ParticipantTile, { participant: participant, onClick: () => handleToggleFocus(participant.id) }, participant.id))) }));
        }
        if (count <= 4) {
            return (_jsx("div", { className: "grid h-full grid-cols-2 gap-3", children: participantTiles.map((participant) => (_jsx(ParticipantTile, { participant: participant, onClick: () => handleToggleFocus(participant.id) }, participant.id))) }));
        }
        return (_jsx("div", { className: "grid h-full auto-rows-fr grid-cols-3 gap-3", children: participantTiles.map((participant) => (_jsx(ParticipantTile, { participant: participant, onClick: () => handleToggleFocus(participant.id) }, participant.id))) }));
    }, [handleActivityClick, handleInviteClick, handleToggleFocus, participantTiles]);
    useEffect(() => {
        let cancelled = false;
        const createdRooms = [];
        const connectObserverRooms = async () => {
            if (!requestTournamentObserverTokens || observerTargetChannels.length === 0) {
                setObserverRooms((prev) => {
                    prev.forEach((item) => {
                        void item.room.disconnect();
                    });
                    return [];
                });
                return;
            }
            const connected = [];
            try {
                const observerTokens = await requestTournamentObserverTokens(activeChannelId);
                const tokenByChannel = new Map(observerTokens.map((item) => [item.channelId, item]));
                for (const target of observerTargetChannels) {
                    const resolved = tokenByChannel.get(target.id);
                    if (!resolved) {
                        continue;
                    }
                    const room = new Room();
                    createdRooms.push(room);
                    if (cancelled) {
                        await room.disconnect();
                        continue;
                    }
                    await room.connect(resolved.url, resolved.token);
                    connected.push({
                        channelId: target.id,
                        channelName: target.name,
                        room,
                    });
                }
            }
            catch {
                // ignore observer flow error and keep normal voice flow running
            }
            if (cancelled) {
                connected.forEach((item) => {
                    void item.room.disconnect();
                });
                return;
            }
            setObserverRooms((prev) => {
                prev.forEach((item) => {
                    void item.room.disconnect();
                });
                return connected;
            });
        };
        void connectObserverRooms();
        return () => {
            cancelled = true;
            createdRooms.forEach((room) => {
                void room.disconnect();
            });
        };
    }, [activeChannelId, observerTargetChannels, requestTournamentObserverTokens]);
    const shareOwnerName = screenShareParticipant?.name ?? focusedParticipant?.name ?? '';
    const hasQualityInfo = qualityBadge !== 'N/A';
    return (_jsxs("div", { ref: rootRef, onMouseMove: handleRootMouseMove, className: "flex h-full min-h-0 min-w-0 w-full bg-[hsl(240,10%,6%)]", children: [_jsxs("section", { className: "flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-200", children: [_jsxs("header", { className: "flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsx(Volume2, { className: "h-4 w-4 text-muted-foreground" }), _jsxs("p", { className: "truncate text-sm font-semibold text-foreground", children: ["# ", channelName] }), hasScreenShare && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-xs text-muted-foreground", children: "\u2022" }), _jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsx("div", { className: "h-5 w-5 overflow-hidden rounded-full bg-[hsl(240,5%,20%)]", children: screenShareParticipant?.avatarUrl ? (_jsx("img", { src: screenShareParticipant.avatarUrl, alt: shareOwnerName, className: "h-full w-full object-cover" })) : null }), _jsxs("span", { className: "truncate text-sm text-foreground", children: [shareOwnerName, " dang chia se man hinh"] })] })] }))] }), _jsxs("div", { className: "flex items-center gap-1", children: [hasQualityInfo && (_jsxs(_Fragment, { children: [_jsx("span", { className: "rounded bg-[hsl(240,5%,20%)] px-2 py-0.5 font-mono text-xs text-foreground", children: qualityBadge }), hasScreenShare && (_jsx("span", { className: "animate-pulse rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white", children: "TRUC TIEP" }))] })), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => setShowThread((prev) => !prev), className: "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", children: _jsx(MessageSquare, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: showThread ? 'An chat voice' : 'Hien chat voice' })] }), canManageVoiceTools ? (_jsxs(DropdownMenu, { children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(DropdownMenuTrigger, { asChild: true, children: _jsx("button", { type: "button", className: "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", children: _jsx(Settings, { className: "h-4 w-4" }) }) }) }), _jsx(TooltipContent, { children: "Cai dat voice" })] }), _jsx(DropdownMenuContent, { align: "end", className: "w-56", children: _jsx(DropdownMenuItem, { onClick: () => pushToast('Tinh nang dang phat trien'), children: "Cai dat nang cao voice" }) })] })) : null, _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => void leaveVoiceChannel(), className: "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", children: _jsx(X, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: "Roi kenh thoai" })] })] })] }), _jsxs("div", { className: "min-h-0 flex-1 overflow-hidden p-3 md:p-4", children: [isTournamentVoice && tournamentMonitorTargets.length > 1 && (_jsxs("div", { className: "mb-3 rounded-lg border border-cyan-400/25 bg-cyan-500/10 p-2", children: [_jsx("div", { className: "mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200", children: "Tournament Monitor Bridge" }), _jsx("div", { className: "flex flex-wrap gap-2", children: tournamentMonitorTargets.map((target) => (_jsxs("button", { type: "button", onClick: () => {
                                                if (!joinVoiceChannel)
                                                    return;
                                                void joinVoiceChannel(target.id);
                                            }, className: cn('rounded-md border px-2.5 py-1.5 text-xs', target.id === activeChannelId
                                                ? 'border-cyan-300/60 bg-cyan-400/20 text-cyan-100'
                                                : 'border-white/15 bg-black/20 text-zinc-200 hover:border-cyan-400/40 hover:text-cyan-100'), children: [_jsx("span", { className: "font-semibold", children: target.name }), _jsxs("span", { className: "ml-1 text-[10px] text-zinc-300", children: ["(", target.activeCount, ")"] }), target.isLive ? _jsx("span", { className: "ml-1 text-[10px] text-red-300", children: "LIVE" }) : null] }, target.id))) }), _jsx("p", { className: "mt-2 text-[11px] text-cyan-100/90", children: "Admin/referee d\u00F9ng c\u00E1c n\u00FAt n\u00E0y \u0111\u1EC3 theo d\u00F5i nhanh team-a/team-b v\u00E0 ki\u1EC3m tra m\u00E0n h\u00ECnh tuy\u1EC3n th\u1EE7." })] })), currentChannelRole === 'admin' && observerRooms.length > 0 && (_jsxs("div", { className: "mb-3 rounded-lg border border-amber-400/25 bg-amber-500/10 p-2", children: [_jsx("div", { className: "mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100", children: "Admin Multi-View (All Player Streams)" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: observerRooms.map((observer) => (_jsx(ObserverRoomPanel, { room: observer.room, channelName: observer.channelName }, observer.channelId))) })] })), isFocusLayout && focusedParticipant ? (_jsxs("div", { className: "flex h-full min-h-0 flex-col gap-3", children: [_jsx("div", { className: "min-h-0 flex-1", children: _jsx(ParticipantTile, { participant: focusedParticipant, focused: true, onClick: () => handleToggleFocus(focusedParticipant.id) }) }), thumbnailParticipants.length > 0 && (_jsx("div", { className: "h-[140px] overflow-x-auto", children: _jsx("div", { className: "flex h-full gap-2 px-1", children: thumbnailParticipants.map((participant) => (_jsx("div", { className: "h-[130px] w-[220px] flex-shrink-0", children: _jsx(ParticipantTile, { participant: participant, thumbnail: true, focused: participant.id === effectiveFocusedParticipantId, onClick: () => handleToggleFocus(participant.id) }) }, participant.id))) }) }))] })) : (renderGridLayout)] }), _jsx("footer", { onMouseEnter: () => {
                            setIsFooterHovered(true);
                            setShowFooter(true);
                        }, onMouseLeave: () => setIsFooterHovered(false), className: cn('shrink-0 border-t border-white/10 px-4 py-3 transition-opacity duration-300', !isFullscreen || showFooter ? 'opacity-100' : 'pointer-events-none opacity-0'), children: isFocusLayout ? (_jsx("div", { className: "flex items-center justify-center", children: _jsxs("div", { className: "flex max-w-full flex-nowrap items-center justify-center gap-2 overflow-x-auto rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-sm", children: [_jsx("button", { type: "button", onClick: handleInviteClick, className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(UserPlus, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleMicrophone(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors', voiceState?.isMicrophoneEnabled
                                            ? 'text-foreground hover:bg-white/10'
                                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'), children: voiceState?.isMicrophoneEnabled ? _jsx(Mic, { className: "h-4 w-4" }) : _jsx(MicOff, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleCamera(), className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(Camera, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleScreenShare(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10', voiceState?.isScreenShareEnabled ? 'text-green-400' : 'text-foreground'), children: _jsx(Monitor, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: handleActivityClick, className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(Sparkles, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => setShowThread((prev) => !prev), className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(Users, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => pushToast('Tinh nang dang phat trien'), className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(MoreHorizontal, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => pushToast('Tinh nang dang phat trien'), className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(VolumeX, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: toggleFullscreen, className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: isFullscreen ? _jsx(Minimize2, { className: "h-4 w-4" }) : _jsx(Maximize2, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: handleGridToggle, className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(LayoutGrid, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void leaveVoiceChannel(), className: "flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600", children: _jsx(PhoneOff, { className: "h-5 w-5" }) })] }) })) : (_jsx("div", { className: "flex items-center justify-center", children: _jsxs("div", { className: "flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur-sm", children: [_jsx("button", { type: "button", onClick: () => void toggleMicrophone(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors', voiceState?.isMicrophoneEnabled
                                            ? 'text-foreground hover:bg-white/10'
                                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'), children: voiceState?.isMicrophoneEnabled ? _jsx(Mic, { className: "h-4 w-4" }) : _jsx(MicOff, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleCamera(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10', voiceState?.isCameraEnabled ? 'text-green-400' : 'text-foreground'), children: _jsx(Camera, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleScreenShare(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10', voiceState?.isScreenShareEnabled ? 'text-green-400' : 'text-foreground'), children: _jsx(Monitor, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => setShowThread((prev) => !prev), className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(Users, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void leaveVoiceChannel(), className: "flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600", children: _jsx(PhoneOff, { className: "h-5 w-5" }) })] }) })) })] }), showThread ? (_jsx("aside", { className: "h-full w-[clamp(300px,30vw,420px)] flex-none overflow-hidden border-l border-white/10 bg-[hsl(240,6%,10%)] transition-all duration-200", children: _jsxs("div", { className: "flex h-full min-h-0 flex-col", children: [_jsxs("div", { className: "flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3", children: [_jsxs("p", { className: "truncate text-sm font-semibold text-foreground", children: ["# ", channelName] }), _jsx("button", { type: "button", onClick: () => setShowThread(false), className: "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "min-h-0 flex-1 overflow-hidden", children: _jsx(ThreadPanelChat, { channelName: channelName, channelId: chatChannelId }) })] }) })) : null] }));
};
//# sourceMappingURL=VoiceChannelView.js.map