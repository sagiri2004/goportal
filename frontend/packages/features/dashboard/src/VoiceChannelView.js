import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Tooltip, TooltipContent, TooltipTrigger, cn, } from '@goportal/ui';
import { useOutletContext } from 'react-router-dom';
import { VideoTrack, useLocalParticipant, useParticipants, useTracks } from '@livekit/components-react';
import { Room, RoomEvent, Track } from 'livekit-client';
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
    if (lower.startsWith('referee-') || lower.startsWith('admin-') || lower === 'admin-observer' || lower === 'referee-observer')
        return 'referee';
    if (lower.startsWith('spectator-') || lower === 'spectator-live')
        return 'spectator';
    if (lower.startsWith('caster-') || lower === 'caster-booth')
        return 'caster';
    return null;
};
const ParticipantTile = ({ participant, focused = false, thumbnail = false, onClick }) => (_jsxs("div", { className: cn('relative cursor-pointer overflow-hidden rounded-lg bg-[hsl(240,8%,14%)]', thumbnail ? 'h-full w-full' : 'h-full w-full min-h-[180px] aspect-video', focused ? 'ring-2 ring-white' : 'ring-1 ring-white/10'), onClick: onClick, children: [participant.trackRef ? (_jsx(VideoTrack, { trackRef: participant.trackRef, className: cn('h-full w-full', participant.isScreenSharing ? 'object-contain bg-black' : 'object-cover') })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center bg-[hsl(240,8%,16%)]", children: participant.avatarUrl ? (_jsx("img", { src: participant.avatarUrl, alt: participant.name, className: "h-20 w-20 rounded-full object-cover" })) : (_jsx("div", { className: cn('flex h-20 w-20 items-center justify-center rounded-full text-xl font-semibold text-white', participant.avatarColor), children: initialsFromName(participant.name) })) })), participant.isSpeaking && (_jsx("div", { className: "pointer-events-none absolute inset-0 z-10 animate-pulse rounded-lg ring-2 ring-green-500" })), participant.isScreenSharing && (_jsxs("div", { className: "absolute left-2 top-2 z-20 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5", children: [_jsx(Monitor, { className: "h-3 w-3 text-white" }), _jsx("span", { className: "text-[10px] text-white", children: "TRUC TIEP" })] })), _jsxs("div", { className: "absolute bottom-2 left-2 z-20 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm", children: [participant.isMuted ? (_jsx(MicOff, { className: "h-3 w-3 text-red-400" })) : (_jsx(Mic, { className: "h-3 w-3 text-white/70" })), _jsx("span", { className: cn('font-medium text-white', thumbnail ? 'text-[11px]' : 'text-xs'), children: participant.name })] })] }));
const ObserverRoomPanel = ({ room, channelName, isMuted, onToggleMute }) => {
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
    return (_jsxs("div", { className: "rounded-lg border border-white/10 bg-black/25 p-2", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300", children: channelName }), _jsx("button", { type: "button", onClick: onToggleMute, className: "rounded border border-white/15 bg-black/30 px-2 py-1 text-[10px] text-zinc-200 hover:border-cyan-400/40", children: isMuted ? 'Unmute feed' : 'Mute feed' })] }), participantTiles.length === 0 ? (_jsx("div", { className: "rounded border border-dashed border-white/15 bg-black/30 px-3 py-4 text-xs text-zinc-400", children: "Waiting for player stream..." })) : (_jsx("div", { className: "grid grid-cols-2 gap-2", children: participantTiles.map((participant) => (_jsx("div", { className: "h-[160px]", children: _jsx(ParticipantTile, { participant: participant, thumbnail: true }) }, participant.id))) }))] }));
};
const InviteActions = ({ onInvite, onActivity }) => (_jsxs("div", { className: "mt-4 flex justify-center gap-3", children: [_jsxs("button", { type: "button", onClick: onInvite, className: "flex cursor-pointer items-center gap-2 rounded-md bg-[hsl(240,5%,20%)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(240,5%,25%)]", children: [_jsx(UserPlus, { className: "h-4 w-4" }), _jsx("span", { children: "Moi vao Kenh thoai" })] }), _jsxs("button", { type: "button", onClick: onActivity, className: "flex cursor-pointer items-center gap-2 rounded-md bg-[hsl(240,5%,20%)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(240,5%,25%)]", children: [_jsx(Gamepad2, { className: "h-4 w-4" }), _jsx("span", { children: "Chon Hoat Dong" })] })] }));
export const VoiceChannelView = () => {
    const { activeChannelId, voiceState, canManageVoiceTools, requestTournamentObserverTokens, leaveVoiceChannel, toggleMicrophone, toggleCamera, toggleScreenShare, pushToast, openInviteMemberDialog, } = useOutletContext();
    const [showThread, setShowThread] = useState(true);
    const [focusedParticipantId, setFocusedParticipantId] = useState(null);
    const [forceGridMode, setForceGridMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
    const [showFooter, setShowFooter] = useState(true);
    const [isFooterHovered, setIsFooterHovered] = useState(false);
    const [footerInteractionTick, setFooterInteractionTick] = useState(0);
    const [observerRooms, setObserverRooms] = useState([]);
    const [observerMuteAll, setObserverMuteAll] = useState(true);
    const [observerMutedChannels, setObserverMutedChannels] = useState({});
    const [observerError, setObserverError] = useState(null);
    const rootRef = useRef(null);
    const fallbackRoomRef = useRef(null);
    if (!fallbackRoomRef.current) {
        fallbackRoomRef.current = new Room();
    }
    const channelName = voiceState?.channelName ?? (activeChannelId || 'voice');
    const chatChannelId = voiceState?.channelId ?? activeChannelId;
    const observerSourceChannelId = voiceState?.channelId ?? activeChannelId;
    const livekitRoom = voiceState?.room ?? fallbackRoomRef.current;
    const currentChannelRole = useMemo(() => normalizeTournamentVoiceRole(channelName), [channelName]);
    const isRefereeVarView = currentChannelRole === 'referee';
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
    useEffect(() => {
        if (isRefereeVarView) {
            setShowThread(false);
        }
    }, [isRefereeVarView]);
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
            if (currentChannelRole !== 'referee' || !requestTournamentObserverTokens) {
                setObserverRooms((prev) => {
                    prev.forEach((item) => {
                        void item.room.disconnect();
                    });
                    return [];
                });
                setObserverError(null);
                return;
            }
            const connected = [];
            try {
                if (!observerSourceChannelId) {
                    // eslint-disable-next-line no-console
                    console.warn('[observer] observer:token-fail', { activeChannelId, observerSourceChannelId, reason: 'missing-channel-id' });
                    setObserverError('Khong xac dinh duoc channel hien tai de khoi tao VAR.');
                    setObserverRooms([]);
                    return;
                }
                // eslint-disable-next-line no-console
                console.info('[observer] observer:init', { activeChannelId, observerSourceChannelId, currentChannelRole });
                const observerBundle = await requestTournamentObserverTokens(observerSourceChannelId);
                if (!observerBundle || observerBundle.feeds.length === 0) {
                    // eslint-disable-next-line no-console
                    console.warn('[observer] observer:token-fail', { activeChannelId, observerSourceChannelId, reason: 'empty-feeds' });
                    setObserverError('Khong tai duoc feed Team A/Team B cho VAR.');
                    setObserverRooms([]);
                    return;
                }
                // eslint-disable-next-line no-console
                console.info('[observer] observer:token-success', {
                    activeChannelId,
                    observerSourceChannelId,
                    matchId: observerBundle.matchId,
                    feedCount: observerBundle.feeds.length,
                    feeds: observerBundle.feeds.map((feed) => ({ role: feed.role, channelId: feed.channelId, channelName: feed.channelName })),
                });
                for (const resolved of observerBundle.feeds) {
                    const room = new Room();
                    createdRooms.push(room);
                    if (cancelled) {
                        await room.disconnect();
                        continue;
                    }
                    try {
                        await room.connect(resolved.url, resolved.token);
                        connected.push({
                            role: resolved.role,
                            channelId: resolved.channelId,
                            channelName: resolved.channelName,
                            room,
                            status: 'connecting',
                        });
                        // eslint-disable-next-line no-console
                        console.info('[observer] observer:room-connect-success', {
                            channelId: resolved.channelId,
                            channelName: resolved.channelName,
                            role: resolved.role,
                        });
                    }
                    catch (error) {
                        // eslint-disable-next-line no-console
                        console.error('[observer] observer:room-connect-fail', {
                            channelId: resolved.channelId,
                            channelName: resolved.channelName,
                            role: resolved.role,
                            error: error instanceof Error ? error.message : String(error),
                        });
                        void room.disconnect();
                    }
                }
            }
            catch {
                // eslint-disable-next-line no-console
                console.error('[observer] observer:token-fail', { activeChannelId, observerSourceChannelId });
                setObserverError('Khong the tao ket noi VAR. Vui long thu lai.');
            }
            if (cancelled) {
                connected.forEach((item) => {
                    void item.room.disconnect();
                });
                return;
            }
            setObserverError(null);
            setObserverRooms((prev) => {
                prev.forEach((item) => {
                    void item.room.disconnect();
                });
                return connected;
            });
            setObserverMutedChannels(() => {
                const muted = {};
                for (const roomState of connected) {
                    muted[roomState.channelId] = true;
                }
                return muted;
            });
        };
        void connectObserverRooms();
        return () => {
            cancelled = true;
            createdRooms.forEach((room) => {
                void room.disconnect();
            });
        };
    }, [activeChannelId, currentChannelRole, observerSourceChannelId, requestTournamentObserverTokens]);
    const observerRoomStatuses = useMemo(() => {
        const statuses = observerRooms.map((observer) => {
            const participants = Array.from(observer.room.remoteParticipants.values());
            if (participants.length === 0) {
                return { ...observer, status: 'disconnected' };
            }
            const hasShare = participants.some((participant) => {
                let found = false;
                participant.videoTrackPublications.forEach((publication) => {
                    if (publication.trackSid && publication.source === Track.Source.ScreenShare) {
                        found = true;
                    }
                });
                return found;
            });
            const status = hasShare ? 'live' : 'no-share';
            return { ...observer, status };
        });
        if (currentChannelRole === 'referee' && statuses.length > 0) {
            // eslint-disable-next-line no-console
            console.info('[observer] observer:render-state', statuses.map((item) => ({
                channelId: item.channelId,
                channelName: item.channelName,
                role: item.role,
                status: item.status,
                participantCount: item.room.remoteParticipants.size,
            })));
        }
        return statuses;
    }, [currentChannelRole, observerRooms]);
    useEffect(() => {
        const unsubscribe = [];
        observerRooms.forEach((observer) => {
            const shouldMute = observerMuteAll || observerMutedChannels[observer.channelId] !== false;
            const syncParticipantAudio = () => {
                observer.room.remoteParticipants.forEach((participant) => {
                    participant.audioTrackPublications.forEach((publication) => {
                        if (shouldMute && publication.isSubscribed) {
                            void publication.setSubscribed(false);
                            return;
                        }
                        if (!shouldMute && !publication.isSubscribed) {
                            void publication.setSubscribed(true);
                        }
                    });
                });
            };
            syncParticipantAudio();
            const onTrackSubscribed = () => {
                syncParticipantAudio();
            };
            observer.room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
            unsubscribe.push(() => {
                observer.room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
            });
        });
        return () => {
            unsubscribe.forEach((fn) => fn());
        };
    }, [observerMutedChannels, observerMuteAll, observerRooms]);
    const shareOwnerName = screenShareParticipant?.name ?? focusedParticipant?.name ?? '';
    const hasQualityInfo = qualityBadge !== 'N/A';
    return (_jsxs("div", { ref: rootRef, onMouseMove: handleRootMouseMove, className: "flex h-full min-h-0 min-w-0 w-full bg-[hsl(240,10%,6%)]", children: [_jsxs("section", { className: "flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-200", children: [_jsxs("header", { className: "flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsx(Volume2, { className: "h-4 w-4 text-muted-foreground" }), _jsxs("p", { className: "truncate text-sm font-semibold text-foreground", children: ["# ", channelName] }), hasScreenShare && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-xs text-muted-foreground", children: "\u2022" }), _jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [_jsx("div", { className: "h-5 w-5 overflow-hidden rounded-full bg-[hsl(240,5%,20%)]", children: screenShareParticipant?.avatarUrl ? (_jsx("img", { src: screenShareParticipant.avatarUrl, alt: shareOwnerName, className: "h-full w-full object-cover" })) : null }), _jsxs("span", { className: "truncate text-sm text-foreground", children: [shareOwnerName, " dang chia se man hinh"] })] })] }))] }), _jsxs("div", { className: "flex items-center gap-1", children: [hasQualityInfo && (_jsxs(_Fragment, { children: [_jsx("span", { className: "rounded bg-[hsl(240,5%,20%)] px-2 py-0.5 font-mono text-xs text-foreground", children: qualityBadge }), hasScreenShare && (_jsx("span", { className: "animate-pulse rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white", children: "TRUC TIEP" }))] })), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => setShowThread((prev) => !prev), className: "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", children: _jsx(MessageSquare, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: showThread ? 'An chat voice' : 'Hien chat voice' })] }), canManageVoiceTools ? (_jsxs(DropdownMenu, { children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(DropdownMenuTrigger, { asChild: true, children: _jsx("button", { type: "button", className: "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", children: _jsx(Settings, { className: "h-4 w-4" }) }) }) }), _jsx(TooltipContent, { children: "Cai dat voice" })] }), _jsx(DropdownMenuContent, { align: "end", className: "w-56", children: _jsx(DropdownMenuItem, { onClick: () => pushToast('Tinh nang dang phat trien'), children: "Cai dat nang cao voice" }) })] })) : null, _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => void leaveVoiceChannel(), className: "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", children: _jsx(X, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: "Roi kenh thoai" })] })] })] }), _jsx("div", { className: "min-h-0 flex-1 overflow-hidden p-3 md:p-4", children: isRefereeVarView ? (_jsxs("div", { className: "h-full rounded-xl border border-cyan-300/20 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent p-3", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100", children: "Referee VAR Monitor" }), _jsx("div", { className: "text-[11px] text-zinc-400", children: "Giam sat Team A va Team B theo thoi gian thuc" })] }), _jsx("button", { type: "button", onClick: () => setObserverMuteAll((prev) => !prev), className: "rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-[11px] text-zinc-100 hover:border-cyan-400/40", children: observerMuteAll ? 'Unmute all feeds' : 'Mute all feeds' })] }), observerError ? (_jsx("div", { className: "mb-3 rounded-md border border-red-400/30 bg-red-500/15 px-2.5 py-2 text-xs text-red-100", children: observerError })) : null, _jsxs("div", { className: "grid h-[calc(100%-72px)] min-h-[320px] grid-cols-1 gap-3 xl:grid-cols-2", children: [observerRoomStatuses.map((observer) => (_jsx(ObserverRoomPanel, { room: observer.room, channelName: observer.channelName, isMuted: observerMuteAll || observerMutedChannels[observer.channelId] !== false, onToggleMute: () => setObserverMutedChannels((prev) => ({
                                                ...prev,
                                                [observer.channelId]: !(prev[observer.channelId] ?? true),
                                            })) }, observer.channelId))), observerRoomStatuses.length === 0 ? (_jsx("div", { className: "rounded-md border border-white/10 bg-black/20 px-3 py-4 text-center text-xs text-zinc-300 xl:col-span-2", children: "Dang cho Team A/Team B bat chia se man hinh..." })) : null] })] })) : isFocusLayout && focusedParticipant ? (_jsxs("div", { className: "flex h-full min-h-0 flex-col gap-3", children: [_jsx("div", { className: "min-h-0 flex-1", children: _jsx(ParticipantTile, { participant: focusedParticipant, focused: true, onClick: () => handleToggleFocus(focusedParticipant.id) }) }), thumbnailParticipants.length > 0 && (_jsx("div", { className: "h-[140px] overflow-x-auto", children: _jsx("div", { className: "flex h-full gap-2 px-1", children: thumbnailParticipants.map((participant) => (_jsx("div", { className: "h-[130px] w-[220px] flex-shrink-0", children: _jsx(ParticipantTile, { participant: participant, thumbnail: true, focused: participant.id === effectiveFocusedParticipantId, onClick: () => handleToggleFocus(participant.id) }) }, participant.id))) }) }))] })) : (renderGridLayout) }), _jsx("footer", { onMouseEnter: () => {
                            setIsFooterHovered(true);
                            setShowFooter(true);
                        }, onMouseLeave: () => setIsFooterHovered(false), className: cn('shrink-0 border-t border-white/10 px-4 py-3 transition-opacity duration-300', !isFullscreen || showFooter ? 'opacity-100' : 'pointer-events-none opacity-0'), children: isRefereeVarView ? (_jsx("div", { className: "flex items-center justify-center", children: _jsxs("div", { className: "flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur-sm", children: [_jsx("button", { type: "button", onClick: () => void toggleMicrophone(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors', voiceState?.isMicrophoneEnabled
                                            ? 'text-foreground hover:bg-white/10'
                                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'), children: voiceState?.isMicrophoneEnabled ? _jsx(Mic, { className: "h-4 w-4" }) : _jsx(MicOff, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleCamera(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10', voiceState?.isCameraEnabled ? 'text-green-400' : 'text-foreground'), children: _jsx(Camera, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleScreenShare(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10', voiceState?.isScreenShareEnabled ? 'text-green-400' : 'text-foreground'), children: _jsx(Monitor, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void leaveVoiceChannel(), className: "flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600", children: _jsx(PhoneOff, { className: "h-5 w-5" }) })] }) })) : isFocusLayout ? (_jsx("div", { className: "flex items-center justify-center", children: _jsxs("div", { className: "flex max-w-full flex-nowrap items-center justify-center gap-2 overflow-x-auto rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-sm", children: [_jsx("button", { type: "button", onClick: handleInviteClick, className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(UserPlus, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleMicrophone(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors', voiceState?.isMicrophoneEnabled
                                            ? 'text-foreground hover:bg-white/10'
                                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'), children: voiceState?.isMicrophoneEnabled ? _jsx(Mic, { className: "h-4 w-4" }) : _jsx(MicOff, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleCamera(), className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(Camera, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleScreenShare(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10', voiceState?.isScreenShareEnabled ? 'text-green-400' : 'text-foreground'), children: _jsx(Monitor, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: handleActivityClick, className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(Sparkles, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => setShowThread((prev) => !prev), className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(Users, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => pushToast('Tinh nang dang phat trien'), className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(MoreHorizontal, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => pushToast('Tinh nang dang phat trien'), className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(VolumeX, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: toggleFullscreen, className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: isFullscreen ? _jsx(Minimize2, { className: "h-4 w-4" }) : _jsx(Maximize2, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: handleGridToggle, className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(LayoutGrid, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void leaveVoiceChannel(), className: "flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600", children: _jsx(PhoneOff, { className: "h-5 w-5" }) })] }) })) : (_jsx("div", { className: "flex items-center justify-center", children: _jsxs("div", { className: "flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur-sm", children: [_jsx("button", { type: "button", onClick: () => void toggleMicrophone(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors', voiceState?.isMicrophoneEnabled
                                            ? 'text-foreground hover:bg-white/10'
                                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'), children: voiceState?.isMicrophoneEnabled ? _jsx(Mic, { className: "h-4 w-4" }) : _jsx(MicOff, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleCamera(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10', voiceState?.isCameraEnabled ? 'text-green-400' : 'text-foreground'), children: _jsx(Camera, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void toggleScreenShare(), className: cn('flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10', voiceState?.isScreenShareEnabled ? 'text-green-400' : 'text-foreground'), children: _jsx(Monitor, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => setShowThread((prev) => !prev), className: "flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10", children: _jsx(Users, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => void leaveVoiceChannel(), className: "flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600", children: _jsx(PhoneOff, { className: "h-5 w-5" }) })] }) })) })] }), showThread ? (_jsx("aside", { className: "h-full w-[clamp(300px,30vw,420px)] flex-none overflow-hidden border-l border-white/10 bg-[hsl(240,6%,10%)] transition-all duration-200", children: _jsxs("div", { className: "flex h-full min-h-0 flex-col", children: [_jsxs("div", { className: "flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3", children: [_jsxs("p", { className: "truncate text-sm font-semibold text-foreground", children: ["# ", channelName] }), _jsx("button", { type: "button", onClick: () => setShowThread(false), className: "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "min-h-0 flex-1 overflow-hidden", children: _jsx(ThreadPanelChat, { channelName: channelName, channelId: chatChannelId }) })] }) })) : null] }));
};
//# sourceMappingURL=VoiceChannelView.js.map