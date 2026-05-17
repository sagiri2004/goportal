import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { VideoTrack, useParticipants, useTracks } from '@livekit/components-react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Button, cn } from '@goportal/ui';
import { useAuthStore } from '@goportal/store';
import { Mic, MicOff, RadioTower, ScreenShare, ScreenShareOff, Signal } from 'lucide-react';
import { ThreadPanelChat } from './components/ThreadPanelChat';
const observerFeedSignature = (feed) => [feed.role, feed.channelId, feed.channelName, feed.url, feed.token].join('|');
const isSameObserverFeedList = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }
    const left = [...a].map(observerFeedSignature).sort();
    const right = [...b].map(observerFeedSignature).sort();
    for (let i = 0; i < left.length; i += 1) {
        if (left[i] !== right[i]) {
            return false;
        }
    }
    return true;
};
const feedHasVideo = (room) => {
    for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.trackPublications.values()) {
            const source = publication.source;
            if (source === Track.Source.ScreenShare || source === Track.Source.Camera) {
                return true;
            }
        }
    }
    return false;
};
const RoomFeedView = ({ room, label, className }) => {
    const remoteParticipants = useParticipants({ room });
    const tracks = useTracks([Track.Source.ScreenShare, Track.Source.Camera], {
        room,
        onlySubscribed: false,
    });
    const tiles = useMemo(() => {
        return remoteParticipants
            .map((participant) => {
            const screenRef = tracks.find((item) => item?.participant?.identity === participant.identity &&
                item?.source === Track.Source.ScreenShare);
            const cameraRef = tracks.find((item) => item?.participant?.identity === participant.identity &&
                item?.source === Track.Source.Camera);
            const trackRef = screenRef ?? cameraRef;
            return {
                id: `${label}:${participant.identity}`,
                name: participant.name || participant.identity || 'unknown',
                isScreen: Boolean(screenRef),
                trackRef,
            };
        })
            .filter((item) => Boolean(item.trackRef));
    }, [label, remoteParticipants, tracks]);
    if (tiles.length === 0) {
        return (_jsx("div", { className: cn('flex h-full min-h-[180px] w-full items-center justify-center rounded-xl border border-white/10 bg-[hsl(240,8%,14%)] text-sm text-muted-foreground', className), children: "No video feed" }));
    }
    return (_jsx("div", { className: cn('grid h-full min-h-[180px] w-full gap-2', className), children: tiles.slice(0, 2).map((tile) => (_jsxs("div", { className: "relative overflow-hidden rounded-xl border border-white/10 bg-black", children: [_jsx(VideoTrack, { trackRef: tile.trackRef, className: cn('h-full w-full', tile.isScreen ? 'object-contain' : 'object-cover') }), _jsxs("div", { className: "absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white", children: [tile.isScreen ? 'SCREEN' : 'CAMERA', " \u00B7 ", tile.name] })] }, tile.id))) }));
};
const LocalPublishedPreview = ({ room }) => {
    const videoRef = useRef(null);
    const [track, setTrack] = useState(null);
    useEffect(() => {
        const pickTrack = () => {
            const pubs = Array.from(room.localParticipant.trackPublications.values());
            const screenPub = pubs.find((pub) => pub.source === Track.Source.ScreenShare && pub.track);
            const cameraPub = pubs.find((pub) => pub.source === Track.Source.Camera && pub.track);
            const target = (screenPub ?? cameraPub)?.track;
            const mediaTrack = target?.mediaStreamTrack;
            setTrack(mediaTrack ?? null);
        };
        pickTrack();
        room.on(RoomEvent.LocalTrackPublished, pickTrack);
        room.on(RoomEvent.LocalTrackUnpublished, pickTrack);
        return () => {
            room.off(RoomEvent.LocalTrackPublished, pickTrack);
            room.off(RoomEvent.LocalTrackUnpublished, pickTrack);
        };
    }, [room]);
    useEffect(() => {
        const element = videoRef.current;
        if (!element) {
            return;
        }
        if (!track) {
            element.srcObject = null;
            return;
        }
        const stream = new MediaStream([track]);
        element.srcObject = stream;
        void element.play().catch(() => undefined);
        return () => {
            element.srcObject = null;
        };
    }, [track]);
    if (!track) {
        return (_jsx("div", { className: "flex min-h-[260px] items-center justify-center rounded-xl border border-white/10 bg-[hsl(240,8%,14%)] text-sm text-muted-foreground", children: "No local source (enable Share/Camera first)" }));
    }
    return (_jsxs("div", { className: "relative overflow-hidden rounded-xl border border-white/10 bg-black", children: [_jsx("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, className: "h-[420px] w-full object-contain" }), _jsx("div", { className: "absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white", children: "LOCAL SOURCE" })] }));
};
const LocalSourceCardPreview = ({ room }) => {
    const videoRef = useRef(null);
    const [track, setTrack] = useState(null);
    useEffect(() => {
        const pickTrack = () => {
            const pubs = Array.from(room.localParticipant.trackPublications.values());
            const screenPub = pubs.find((pub) => pub.source === Track.Source.ScreenShare && pub.track);
            const cameraPub = pubs.find((pub) => pub.source === Track.Source.Camera && pub.track);
            const target = (screenPub ?? cameraPub)?.track;
            const mediaTrack = target?.mediaStreamTrack;
            setTrack(mediaTrack ?? null);
        };
        pickTrack();
        room.on(RoomEvent.LocalTrackPublished, pickTrack);
        room.on(RoomEvent.LocalTrackUnpublished, pickTrack);
        return () => {
            room.off(RoomEvent.LocalTrackPublished, pickTrack);
            room.off(RoomEvent.LocalTrackUnpublished, pickTrack);
        };
    }, [room]);
    useEffect(() => {
        const element = videoRef.current;
        if (!element) {
            return;
        }
        if (!track) {
            element.srcObject = null;
            return;
        }
        const stream = new MediaStream([track]);
        element.srcObject = stream;
        void element.play().catch(() => undefined);
        return () => {
            element.srcObject = null;
        };
    }, [track]);
    if (!track) {
        return (_jsx("div", { className: "flex h-[180px] items-center justify-center rounded-lg border border-white/10 bg-[hsl(240,8%,14%)] text-xs text-muted-foreground", children: "Enable Share to preview your source" }));
    }
    return (_jsx("div", { className: "relative h-[180px] overflow-hidden rounded-lg border border-white/10 bg-black", children: _jsx("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, className: "h-full w-full object-cover" }) }));
};
export const LivestreamChannelView = () => {
    const { channelId = '' } = useParams();
    const { activeCategories = [], requestLivestreamToken, requestTournamentObserverTokens, pushToast, } = useOutletContext();
    const currentUser = useAuthStore((state) => state.user);
    const [room, setRoom] = useState(null);
    const [mode, setMode] = useState('viewer');
    const [canUseCasterConsole, setCanUseCasterConsole] = useState(false);
    const [isCheckingCasterPermission, setIsCheckingCasterPermission] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const [observerRooms, setObserverRooms] = useState({});
    const [observerFeeds, setObserverFeeds] = useState([]);
    const [observerLoaded, setObserverLoaded] = useState(false);
    const [selectedSource, setSelectedSource] = useState('team-a');
    const connectAttemptRef = useRef(0);
    const roomRef = useRef(null);
    const observerRoomsRef = useRef({});
    const requestObserverTokensRef = useRef(requestTournamentObserverTokens);
    const channel = useMemo(() => activeCategories
        .flatMap((category) => category.channels)
        .find((item) => item.id === channelId), [activeCategories, channelId]);
    const channelName = channel?.name ?? channelId;
    const isCasterConsole = canUseCasterConsole && !Boolean(currentUser?.is_admin);
    const observerFeedsKey = useMemo(() => observerFeeds.map(observerFeedSignature).sort().join('::'), [observerFeeds]);
    useEffect(() => {
        requestObserverTokensRef.current = requestTournamentObserverTokens;
    }, [requestTournamentObserverTokens]);
    useEffect(() => {
        observerRoomsRef.current = observerRooms;
    }, [observerRooms]);
    const disconnectRoom = useCallback(async () => {
        const current = roomRef.current;
        if (!current) {
            return;
        }
        roomRef.current = null;
        try {
            await current.disconnect();
        }
        catch {
            // no-op
        }
        setRoom(null);
    }, []);
    const connectRoom = useCallback(async (nextMode) => {
        if (!channelId || !requestLivestreamToken) {
            return;
        }
        const attempt = connectAttemptRef.current + 1;
        connectAttemptRef.current = attempt;
        setIsConnecting(true);
        setError(null);
        try {
            await disconnectRoom();
            const tokenResult = await requestLivestreamToken(channelId, nextMode);
            if (connectAttemptRef.current !== attempt) {
                return;
            }
            const nextRoom = new Room();
            await nextRoom.connect(tokenResult.url, tokenResult.token);
            if (connectAttemptRef.current !== attempt) {
                await nextRoom.disconnect();
                return;
            }
            nextRoom.on(RoomEvent.Disconnected, () => {
                if (roomRef.current === nextRoom) {
                    roomRef.current = null;
                }
                setRoom((prev) => (prev === nextRoom ? null : prev));
            });
            roomRef.current = nextRoom;
            setRoom(nextRoom);
            setMode(nextMode);
            if (nextMode === 'viewer') {
                await nextRoom.localParticipant.setMicrophoneEnabled(false);
                await nextRoom.localParticipant.setCameraEnabled(false);
                await nextRoom.localParticipant.setScreenShareEnabled(false);
            }
        }
        catch (e) {
            const msg = e?.message ?? 'Cannot connect livestream room.';
            setError(msg);
            pushToast?.(msg);
        }
        finally {
            if (connectAttemptRef.current === attempt) {
                setIsConnecting(false);
            }
        }
    }, [channelId, disconnectRoom, pushToast, requestLivestreamToken]);
    useEffect(() => {
        if (!channelId) {
            return;
        }
        connectAttemptRef.current += 1;
        void connectRoom('viewer');
        return () => {
            connectAttemptRef.current += 1;
            void disconnectRoom();
        };
    }, [channelId, connectRoom, disconnectRoom]);
    useEffect(() => {
        let cancelled = false;
        if (!channelId || !requestLivestreamToken) {
            setCanUseCasterConsole(false);
            setIsCheckingCasterPermission(false);
            return;
        }
        setIsCheckingCasterPermission(true);
        const check = async () => {
            try {
                await requestLivestreamToken(channelId, 'streamer');
                if (!cancelled) {
                    setCanUseCasterConsole(true);
                }
            }
            catch {
                if (!cancelled) {
                    setCanUseCasterConsole(false);
                }
            }
            finally {
                if (!cancelled) {
                    setIsCheckingCasterPermission(false);
                }
            }
        };
        void check();
        return () => {
            cancelled = true;
        };
    }, [channelId, requestLivestreamToken]);
    useEffect(() => {
        let cancelled = false;
        if (!channelId || !canUseCasterConsole) {
            setObserverLoaded(true);
            setObserverFeeds([]);
            return;
        }
        const requestObserverTokens = requestObserverTokensRef.current;
        if (!requestObserverTokens) {
            setObserverLoaded(true);
            setObserverFeeds([]);
            return;
        }
        setObserverLoaded(false);
        const load = async () => {
            const maxAttempts = 6;
            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                if (cancelled) {
                    return;
                }
                try {
                    const bundle = await requestObserverTokens(channelId);
                    if (cancelled) {
                        return;
                    }
                    const feeds = (bundle?.feeds ?? []).filter((feed) => feed.role === 'team-a' || feed.role === 'team-b');
                    if (feeds.length > 0) {
                        setObserverFeeds((prev) => (isSameObserverFeedList(prev, feeds) ? prev : feeds));
                        setObserverLoaded(true);
                        return;
                    }
                }
                catch {
                    // continue retry
                }
                if (attempt < maxAttempts) {
                    await new Promise((resolve) => window.setTimeout(resolve, 1200));
                }
            }
            if (!cancelled) {
                setObserverFeeds([]);
                setObserverLoaded(true);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [canUseCasterConsole, channelId]);
    useEffect(() => {
        let disposed = false;
        const connectObserverRooms = async () => {
            const connected = {};
            for (const feed of observerFeeds) {
                try {
                    const observerRoom = new Room();
                    connected[feed.channelId] = {
                        feed,
                        room: observerRoom,
                        status: 'connecting',
                    };
                    await observerRoom.connect(feed.url, feed.token);
                    if (disposed) {
                        await observerRoom.disconnect();
                        continue;
                    }
                    const refreshStatus = () => {
                        setObserverRooms((prev) => {
                            const current = prev[feed.channelId];
                            if (!current) {
                                return prev;
                            }
                            return {
                                ...prev,
                                [feed.channelId]: {
                                    ...current,
                                    status: feedHasVideo(observerRoom) ? 'live' : 'no-share',
                                },
                            };
                        });
                    };
                    observerRoom.on(RoomEvent.ParticipantConnected, refreshStatus);
                    observerRoom.on(RoomEvent.ParticipantDisconnected, refreshStatus);
                    observerRoom.on(RoomEvent.TrackPublished, refreshStatus);
                    observerRoom.on(RoomEvent.TrackUnpublished, refreshStatus);
                    observerRoom.on(RoomEvent.Disconnected, () => {
                        setObserverRooms((prev) => {
                            const current = prev[feed.channelId];
                            if (!current) {
                                return prev;
                            }
                            return {
                                ...prev,
                                [feed.channelId]: {
                                    ...current,
                                    status: 'disconnected',
                                },
                            };
                        });
                    });
                    connected[feed.channelId] = {
                        feed,
                        room: observerRoom,
                        status: feedHasVideo(observerRoom) ? 'live' : 'no-share',
                    };
                }
                catch (e) {
                    connected[feed.channelId] = {
                        feed,
                        room: new Room(),
                        status: 'error',
                        error: e?.message ?? 'Observer connect failed',
                    };
                }
            }
            if (!disposed) {
                setObserverRooms(connected);
            }
        };
        Object.values(observerRoomsRef.current).forEach((item) => {
            void item.room.disconnect();
        });
        setObserverRooms({});
        if (observerFeeds.length > 0) {
            void connectObserverRooms();
        }
        return () => {
            disposed = true;
            Object.values(observerRoomsRef.current).forEach((item) => {
                void item.room.disconnect();
            });
            setObserverRooms({});
        };
    }, [observerFeedsKey]);
    useEffect(() => {
        if (!isCasterConsole) {
            return;
        }
        if (selectedSource === 'self') {
            return;
        }
        if (!observerFeeds.some((feed) => feed.role === selectedSource)) {
            setSelectedSource('team-a');
        }
    }, [isCasterConsole, observerFeeds, selectedSource]);
    const isMicEnabled = room?.localParticipant.isMicrophoneEnabled ?? false;
    const isScreenEnabled = room?.localParticipant.isScreenShareEnabled ?? false;
    const toggleMic = useCallback(async () => {
        if (!room || mode !== 'streamer') {
            return;
        }
        await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
    }, [mode, room]);
    const toggleScreen = useCallback(async () => {
        if (!room || mode !== 'streamer') {
            return;
        }
        await room.localParticipant.setScreenShareEnabled(!room.localParticipant.isScreenShareEnabled);
    }, [mode, room]);
    const teamAState = observerFeeds.find((feed) => feed.role === 'team-a');
    const teamBState = observerFeeds.find((feed) => feed.role === 'team-b');
    const renderCasterSelectedStage = () => {
        if (!room) {
            return (_jsx("div", { className: "flex min-h-[360px] items-center justify-center rounded-xl border border-white/10 bg-[hsl(240,8%,14%)] text-sm text-muted-foreground", children: "Connecting livestream room..." }));
        }
        if (selectedSource === 'self') {
            return _jsx(LocalPublishedPreview, { room: room });
        }
        const selectedChannelId = selectedSource === 'team-a' ? teamAState?.channelId : teamBState?.channelId;
        const observer = observerRooms[selectedChannelId ?? ''];
        if (!observer?.room) {
            return (_jsxs("div", { className: "flex min-h-[360px] items-center justify-center rounded-xl border border-white/10 bg-[hsl(240,8%,14%)] text-sm text-muted-foreground", children: ["Source ", selectedSource.toUpperCase(), " is not connected"] }));
        }
        return _jsx(RoomFeedView, { room: observer.room, label: `selected-${selectedSource}`, className: "min-h-[360px]" });
    };
    return (_jsxs("div", { className: "relative flex h-full min-h-0 w-full overflow-hidden", children: [_jsxs("div", { className: "flex min-w-0 flex-1 flex-col overflow-hidden border-r border-white/10", children: [_jsxs("header", { className: "flex h-12 items-center justify-between border-b border-white/10 px-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(RadioTower, { className: "h-4 w-4 text-rose-400" }), _jsxs("span", { className: "truncate font-semibold", children: ["#", channelName] }), _jsx("span", { className: "rounded border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-300", children: "LIVESTREAM" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [!isCheckingCasterPermission && !isCasterConsole && (_jsx("span", { className: "rounded border border-zinc-500/40 bg-zinc-700/20 px-2 py-0.5 text-[11px] text-zinc-300", children: "Viewer only" })), _jsx(Button, { size: "sm", variant: "outline", disabled: isConnecting || mode === 'viewer', onClick: () => void connectRoom('viewer'), children: "Viewer" }), isCasterConsole && (_jsx(Button, { size: "sm", disabled: isConnecting || mode === 'streamer', onClick: () => void connectRoom('streamer'), children: "Go Live" }))] })] }), _jsxs("div", { className: "min-h-0 flex-1 overflow-y-auto p-4", children: [error && (_jsx("div", { className: "mb-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300", children: error })), isCasterConsole && (_jsxs("section", { className: "mb-4 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2", children: [_jsx(Signal, { className: "h-4 w-4 text-cyan-300" }), _jsx("h3", { className: "text-sm font-semibold tracking-wide text-cyan-100", children: "CASTER SOURCE CONSOLE (TEAM A / TEAM B / SELF)" })] }), _jsx("p", { className: "mb-3 text-xs text-cyan-100/80", children: "Click a source card to switch what you preview in Public Live Stage." }), !observerLoaded ? (_jsx("div", { className: "rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300", children: "Loading Team A / Team B sources..." })) : observerFeeds.length === 0 ? (_jsx("div", { className: "rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100", children: "No Team A / Team B observer feeds found for this match yet." })) : null, _jsxs("div", { className: "mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3", children: [teamAState && (_jsxs("button", { type: "button", onClick: () => setSelectedSource('team-a'), className: cn('rounded-lg border p-2 text-left transition', selectedSource === 'team-a' ? 'border-cyan-300 bg-cyan-500/10' : 'border-white/10 bg-black/25'), children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200", children: "Team A" }), _jsx("span", { className: "rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-zinc-300", children: observerRooms[teamAState.channelId]?.status ?? 'connecting' })] }), observerRooms[teamAState.channelId]?.room ? (_jsx(RoomFeedView, { room: observerRooms[teamAState.channelId].room, label: "team-a" })) : (_jsx("div", { className: "flex h-[180px] items-center justify-center rounded-lg border border-white/10 bg-[hsl(240,8%,14%)] text-xs text-muted-foreground", children: "Connecting Team A..." }))] })), teamBState && (_jsxs("button", { type: "button", onClick: () => setSelectedSource('team-b'), className: cn('rounded-lg border p-2 text-left transition', selectedSource === 'team-b' ? 'border-cyan-300 bg-cyan-500/10' : 'border-white/10 bg-black/25'), children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200", children: "Team B" }), _jsx("span", { className: "rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-zinc-300", children: observerRooms[teamBState.channelId]?.status ?? 'connecting' })] }), observerRooms[teamBState.channelId]?.room ? (_jsx(RoomFeedView, { room: observerRooms[teamBState.channelId].room, label: "team-b" })) : (_jsx("div", { className: "flex h-[180px] items-center justify-center rounded-lg border border-white/10 bg-[hsl(240,8%,14%)] text-xs text-muted-foreground", children: "Connecting Team B..." }))] })), _jsxs("button", { type: "button", onClick: () => setSelectedSource('self'), className: cn('rounded-lg border p-2 text-left transition', selectedSource === 'self' ? 'border-cyan-300 bg-cyan-500/10' : 'border-white/10 bg-black/25'), children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200", children: "My Share" }), _jsx("span", { className: "rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-zinc-300", children: isScreenEnabled ? 'screen-live' : 'idle' })] }), room ? _jsx(LocalSourceCardPreview, { room: room }) : (_jsx("div", { className: "flex h-[180px] items-center justify-center rounded-lg border border-white/10 bg-[hsl(240,8%,14%)] text-xs text-muted-foreground", children: "Connecting..." }))] })] })] })), _jsxs("section", { className: "rounded-xl border border-white/10 bg-black/20 p-3", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(RadioTower, { className: "h-4 w-4 text-rose-400" }), _jsx("span", { className: "text-sm font-semibold text-zinc-100", children: "Public Live Stage" })] }), _jsx("span", { className: "rounded border border-white/15 px-2 py-0.5 text-[11px] text-zinc-300", children: mode === 'streamer' ? 'Streamer mode' : 'Viewer mode' })] }), isCasterConsole ? (renderCasterSelectedStage()) : room ? (_jsx(RoomFeedView, { room: room, label: "public-live", className: "min-h-[360px]" })) : (_jsx("div", { className: "flex min-h-[360px] items-center justify-center rounded-xl border border-white/10 bg-[hsl(240,8%,14%)] text-sm text-muted-foreground", children: "Connecting livestream room..." }))] })] }), isCasterConsole && (_jsxs("div", { className: "flex h-16 items-center justify-center gap-2 border-t border-white/10 px-4", children: [_jsxs(Button, { size: "sm", variant: mode === 'streamer' && isMicEnabled ? 'default' : 'outline', onClick: () => void toggleMic(), disabled: mode !== 'streamer' || !room, children: [isMicEnabled ? _jsx(Mic, { className: "mr-1.5 h-4 w-4" }) : _jsx(MicOff, { className: "mr-1.5 h-4 w-4" }), "Mic"] }), _jsxs(Button, { size: "sm", variant: mode === 'streamer' && isScreenEnabled ? 'default' : 'outline', onClick: () => void toggleScreen(), disabled: mode !== 'streamer' || !room, children: [isScreenEnabled ? _jsx(ScreenShare, { className: "mr-1.5 h-4 w-4" }) : _jsx(ScreenShareOff, { className: "mr-1.5 h-4 w-4" }), "Share"] })] }))] }), !isCasterConsole && (_jsx("aside", { className: "w-[380px] flex-shrink-0", children: _jsx(ThreadPanelChat, { channelName: channelName, channelId: channelId }) })), isCheckingCasterPermission && (_jsx("div", { className: "pointer-events-none absolute right-4 top-14 rounded-md border border-white/10 bg-black/70 px-3 py-1 text-xs text-zinc-300", children: "Checking streamer permission..." }))] }));
};
//# sourceMappingURL=LivestreamChannelView.js.map