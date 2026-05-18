import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * App Shell Layout
 *
 * Discord-like layout:
 * [ServerRail 72px fixed] | [PanelGroup: Sidebar | Main | Members?]
 *
 * Key fixes vs previous version:
 * - panelRef → ref (react-resizable-panels v0/v1 correct API)
 * - PanelGroup: direction="horizontal" not orientation="horizontal"
 * - wrapper div gets min-w-0 w-full so Outlet never pushes panel wider
 * - resize() called AFTER state update via useEffect to guarantee ref is live
 * - members Panel conditionally mounted — PanelGroup re-evaluates sizes on mount
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Room, RoomEvent, Track } from 'livekit-client';
import { WS_URL } from '@goportal/config';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, } from 'react-resizable-panels';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, TooltipProvider, } from '@goportal/ui';
import { CreateServerModal, ServerRail } from '@goportal/feature-servers';
import { ChannelSidebar, CreateChannelModal } from '@goportal/feature-channels';
import { DirectMessagesSidebar } from '@goportal/feature-dashboard';
import { TournamentCreateEditDialog } from '../tournaments';
import { useAuthStore } from '@goportal/store';
import { Copy } from 'lucide-react';
import { useVoiceSessionStore } from '../stores/voice-session.store';
import { MemberListPanel } from './MemberListPanel';
import { ServerSettingsOverlay } from './ServerSettingsOverlay';
import { createChannel, createServerInvite, createServer, getChannels, getMembers, getServerById, getServers, getInvitePreview, getLivestreamState, getLivestreamToken, getTournamentMatchObserverTokens, joinByInviteCode, getVoiceToken, listTournamentMatchWorkspaces, listTournamentMatches, listTournamentsByServer, listVoiceParticipants, updateServerProfile, uploadServerMedia, updateMyProfile, uploadUserAvatar, } from '../services';
// ─── Panel size constants (% of PanelGroup width, must sum ≤ 100) ────────────
const SIZE = {
    sidebar: { default: 22, min: 18, max: 35 },
    mainWithMembers: 56, // 22 + 56 + 22 = 100
    mainAlone: 78, // 22 + 78      = 100
    members: { default: 22, min: 15, max: 28 },
};
// ─── Resize handle ────────────────────────────────────────────────────────────
export const ResizeHandle = () => (_jsx(PanelResizeHandle, { className: "group relative w-[6px] flex-shrink-0 cursor-col-resize bg-transparent", children: _jsx("div", { className: "absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-indigo-500/60 group-active:bg-indigo-500" }) }));
const voicePalette = [
    'bg-indigo-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-rose-500',
];
const PENDING_INVITE_CODE_KEY = 'goportal_pending_invite_code';
const VOICE_DEBUG_PREFIX = '[voice-debug]';
const isTournamentMatchVoiceChannelName = (name) => {
    const lower = name.toLowerCase();
    return (lower.includes('team-a-r') ||
        lower.includes('team-b-r') ||
        lower.includes('spectator-r') ||
        lower.includes('caster-r') ||
        lower.includes('referee-r') ||
        lower.includes('admin-r') ||
        // legacy names from previous workspace versions
        lower === 'team-a-comms' ||
        lower === 'team-b-comms' ||
        lower === 'spectator-live' ||
        lower === 'caster-booth' ||
        lower === 'admin-observer' ||
        lower === 'referee-observer');
};
const isTournamentMatchLivestreamChannelName = (name) => {
    const lower = name.toLowerCase();
    return lower.startsWith('live-r');
};
const logVoiceDebug = (step, data) => {
    if (data) {
        // eslint-disable-next-line no-console
        console.info(`${VOICE_DEBUG_PREFIX} ${step}`, data);
        return;
    }
    // eslint-disable-next-line no-console
    console.info(`${VOICE_DEBUG_PREFIX} ${step}`);
};
const logRouteDebug = (step, data) => {
    if (data) {
        // eslint-disable-next-line no-console
        console.info(`[route-debug] ${step}`, data);
        return;
    }
    // eslint-disable-next-line no-console
    console.info(`[route-debug] ${step}`);
};
const colorFromId = (id) => {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
        hash = (hash + id.charCodeAt(index)) % 997;
    }
    return voicePalette[hash % voicePalette.length];
};
const initialsFromName = (name) => name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
const parseParticipantMetadata = (metadata) => {
    if (!metadata) {
        return {};
    }
    try {
        const parsed = JSON.parse(metadata);
        const avatarUrl = parsed.avatar_url ?? parsed.avatarUrl;
        const displayName = parsed.display_name ?? parsed.displayName ?? parsed.username;
        return {
            avatarUrl: typeof avatarUrl === 'string' && avatarUrl ? avatarUrl : undefined,
            displayName: typeof displayName === 'string' && displayName ? displayName : undefined,
        };
    }
    catch {
        return {};
    }
};
const buildConnectTargets = (url) => {
    const targets = new Set([url]);
    try {
        const parsed = new URL(url);
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && parsed.protocol === 'ws:') {
            const secure = new URL(url);
            secure.protocol = 'wss:';
            targets.add(secure.toString());
        }
        if (parsed.hostname === 'localhost') {
            const ipv4 = new URL(url);
            ipv4.hostname = '127.0.0.1';
            targets.add(ipv4.toString());
        }
    }
    catch {
        // ignore invalid URL and keep original
    }
    return Array.from(targets);
};
const normalizeNotificationEventType = (raw) => typeof raw === 'string' ? raw.trim().toUpperCase() : '';
const resolveNotificationEventType = (event) => {
    const topLevelType = normalizeNotificationEventType(event?.type);
    const payloadType = normalizeNotificationEventType(event?.payload?.event_type ?? event?.payload?.type);
    if (topLevelType === 'POPUP') {
        return payloadType || topLevelType;
    }
    return payloadType || topLevelType;
};
const buildNotificationSocketTargets = (rawUrl, userId, token) => {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    }
    catch {
        return [];
    }
    if (parsed.protocol === 'http:') {
        parsed.protocol = 'ws:';
    }
    else if (parsed.protocol === 'https:') {
        parsed.protocol = 'wss:';
    }
    if (!parsed.pathname || parsed.pathname === '/') {
        parsed.pathname = '/ws';
    }
    const setCommonParams = (url) => {
        url.searchParams.set('user_id', userId);
        if (token) {
            url.searchParams.set('token', token);
        }
    };
    const targets = [];
    const addTarget = (url) => {
        setCommonParams(url);
        targets.push(url);
    };
    addTarget(parsed);
    return Array.from(new Set(targets.map((target) => target.toString())));
};
const InviteMemberDialog = ({ open, onOpenChange, serverId }) => {
    const [expiryOption, setExpiryOption] = useState('7d');
    const [inviteLink, setInviteLink] = useState('');
    const [inviteExpiresAt, setInviteExpiresAt] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (!open) {
            return;
        }
        setError(null);
        setCopied(false);
    }, [open]);
    const getExpiresAt = useCallback((option) => {
        const now = Math.floor(Date.now() / 1000);
        if (option === '7d')
            return now + 7 * 24 * 60 * 60;
        if (option === '1d')
            return now + 24 * 60 * 60;
        return undefined;
    }, []);
    const generateInvite = useCallback(async (option) => {
        if (!serverId) {
            return;
        }
        setIsCreating(true);
        setError(null);
        try {
            const invite = await createServerInvite(serverId, {
                max_uses: 0,
                expires_at: getExpiresAt(option),
            });
            const nextLink = invite.invite_url || `${window.location.origin}/invite/${invite.invite_code}`;
            setInviteLink(nextLink);
            setInviteExpiresAt(invite.expires_at ?? null);
        }
        catch (createError) {
            setError(createError?.message ?? 'Không thể tạo liên kết mời.');
        }
        finally {
            setIsCreating(false);
        }
    }, [getExpiresAt, serverId]);
    useEffect(() => {
        if (!open || !serverId || inviteLink) {
            return;
        }
        void generateInvite(expiryOption);
    }, [expiryOption, generateInvite, inviteLink, open, serverId]);
    const handleCopy = async () => {
        if (!inviteLink) {
            return;
        }
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "L\u1EDDi m\u1EDDi" }), _jsx(DialogDescription, { children: "T\u1EA1o ho\u1EB7c sao ch\u00E9p li\u00EAn k\u1EBFt m\u1EDDi v\u00E0o server." })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "invite-expiry", children: "H\u1EBFt h\u1EA1n" }), _jsxs("select", { id: "invite-expiry", value: expiryOption, onChange: (e) => {
                                        const next = e.target.value;
                                        setExpiryOption(next);
                                        setInviteLink('');
                                        setInviteExpiresAt(null);
                                    }, className: "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground", children: [_jsx("option", { value: "7d", children: "7 ng\u00E0y" }), _jsx("option", { value: "1d", children: "1 ng\u00E0y" }), _jsx("option", { value: "never", children: "Kh\u00F4ng h\u1EBFt h\u1EA1n" })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "invite-link", children: "Li\u00EAn k\u1EBFt m\u1EDDi" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Input, { id: "invite-link", readOnly: true, value: inviteLink, placeholder: isCreating ? 'Đang tạo liên kết...' : 'Chưa có liên kết mời' }), _jsx(Button, { type: "button", variant: "outline", onClick: () => void handleCopy(), disabled: !inviteLink, children: _jsx(Copy, { className: "h-4 w-4" }) })] }), copied && _jsx("p", { className: "text-xs text-green-400", children: "\u0110\u00E3 sao ch\u00E9p" }), inviteExpiresAt ? (_jsxs("p", { className: "text-xs text-muted-foreground", children: ["H\u1EBFt h\u1EA1n: ", new Date(inviteExpiresAt * 1000).toLocaleString('vi-VN')] })) : (_jsx("p", { className: "text-xs text-muted-foreground", children: "Li\u00EAn k\u1EBFt kh\u00F4ng h\u1EBFt h\u1EA1n." })), error && _jsx("p", { className: "text-xs text-red-400", children: error })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "\u0110\u00F3ng" }), _jsx(Button, { type: "button", onClick: () => void generateInvite(expiryOption), disabled: isCreating, children: isCreating ? 'Đang tạo...' : 'Tạo lại' })] })] }) }));
};
const UserSettingsDialog = ({ open, onOpenChange, username, avatarURL, onUpdated }) => {
    const [name, setName] = useState(username);
    const [avatar, setAvatar] = useState(avatarURL ?? null);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    useEffect(() => {
        if (!open) {
            return;
        }
        setName(username);
        setAvatar(avatarURL ?? null);
        setError(null);
        setIsSaving(false);
        setIsUploading(false);
    }, [avatarURL, open, username]);
    const handleUpload = async (file) => {
        setIsUploading(true);
        setError(null);
        try {
            const uploadedURL = await uploadUserAvatar(file);
            setAvatar(uploadedURL);
        }
        catch (uploadError) {
            setError(uploadError?.message ?? 'Không thể tải ảnh đại diện.');
        }
        finally {
            setIsUploading(false);
        }
    };
    const handleSave = async () => {
        const trimmed = name.trim();
        if (trimmed.length < 3) {
            setError('Tên người dùng phải có ít nhất 3 ký tự.');
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            const payload = {};
            if (trimmed !== username) {
                payload.username = trimmed;
            }
            if ((avatar ?? '') !== (avatarURL ?? '')) {
                payload.avatar_url = avatar ?? '';
            }
            if (Object.keys(payload).length > 0) {
                const updated = await updateMyProfile(payload);
                onUpdated(updated.username, updated.avatar_url ?? null);
            }
            onOpenChange(false);
        }
        catch (saveError) {
            setError(saveError?.message ?? 'Không thể cập nhật hồ sơ.');
        }
        finally {
            setIsSaving(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "C\u00E0i \u0111\u1EB7t ng\u01B0\u1EDDi d\u00F9ng" }), _jsx(DialogDescription, { children: "C\u1EADp nh\u1EADt \u1EA3nh \u0111\u1EA1i di\u1EC7n v\u00E0 t\u00EAn hi\u1EC3n th\u1ECB." })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", className: "flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-accent", onClick: () => fileInputRef.current?.click(), disabled: isUploading || isSaving, children: avatar ? (_jsx("img", { src: avatar, alt: name, className: "h-full w-full object-cover" })) : (_jsx("span", { className: "text-lg font-semibold", children: name[0]?.toUpperCase() ?? 'U' })) }), _jsxs("div", { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => fileInputRef.current?.click(), disabled: isUploading || isSaving, children: isUploading ? 'Đang tải...' : 'Đổi ảnh đại diện' }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", className: "hidden", onChange: (event) => {
                                                const file = event.target.files?.[0];
                                                if (file) {
                                                    void handleUpload(file);
                                                }
                                            } })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "user-settings-username", children: "T\u00EAn ng\u01B0\u1EDDi d\u00F9ng" }), _jsx(Input, { id: "user-settings-username", value: name, onChange: (event) => setName(event.target.value), disabled: isSaving || isUploading })] }), error && _jsx("p", { className: "text-sm text-red-400", children: error })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), disabled: isSaving, children: "\u0110\u00F3ng" }), _jsx(Button, { type: "button", onClick: () => void handleSave(), disabled: isSaving || isUploading, children: isSaving ? 'Đang lưu...' : 'Lưu thay đổi' })] })] }) }));
};
// ─── AppShell ─────────────────────────────────────────────────────────────────
export const AppShell = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();
    const isDmMode = useMemo(() => location.pathname.includes('/app/@me'), [location.pathname]);
    const isVoiceMode = useMemo(() => location.pathname.includes('/app/servers/') && location.pathname.includes('/voice/'), [location.pathname]);
    const isTournamentMode = useMemo(() => location.pathname.includes('/app/servers/') && location.pathname.includes('/tournaments'), [location.pathname]);
    const [activeServerId, setActiveServerId] = useState('');
    const [activeChannelId, setActiveChannelId] = useState('');
    const [showMembers, setShowMembers] = useState(false);
    const [servers, setServers] = useState([]);
    const [isCreateServerModalOpen, setIsCreateServerModalOpen] = useState(false);
    const [createServerModalInviteCode, setCreateServerModalInviteCode] = useState(null);
    const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
    const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
    const [serverSettingsTab, setServerSettingsTab] = useState('profile');
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }
        return window.localStorage.getItem('has_seen_onboarding') === 'true';
    });
    const [toastMessage, setToastMessage] = useState(null);
    const [serverDetails, setServerDetails] = useState({});
    const [channelsByServer, setChannelsByServer] = useState({});
    const [membersByServer, setMembersByServer] = useState({});
    const [tournamentsByServer, setTournamentsByServer] = useState({});
    const [tournamentMatchesById, setTournamentMatchesById] = useState({});
    const [tournamentWorkspacesById, setTournamentWorkspacesById] = useState({});
    const [loadedTournamentTreeById, setLoadedTournamentTreeById] = useState({});
    const [isCreateTournamentModalOpen, setIsCreateTournamentModalOpen] = useState(false);
    const [voiceActivityByChannel, setVoiceActivityByChannel] = useState({});
    const voiceSession = useVoiceSessionStore((state) => state.session);
    const setVoiceConnectingState = useVoiceSessionStore((state) => state.setConnecting);
    const setVoiceConnectedState = useVoiceSessionStore((state) => state.setConnected);
    const setVoiceErrorState = useVoiceSessionStore((state) => state.setError);
    const patchVoiceMediaState = useVoiceSessionStore((state) => state.patchMediaState);
    const clearVoiceSession = useVoiceSessionStore((state) => state.clear);
    const voiceState = useMemo(() => {
        if (!voiceSession.room || !voiceSession.serverId || !voiceSession.channelId || !voiceSession.serverName || !voiceSession.channelName) {
            return null;
        }
        return {
            channelId: voiceSession.channelId,
            channelName: voiceSession.channelName,
            serverId: voiceSession.serverId,
            serverName: voiceSession.serverName,
            room: voiceSession.room,
            lastTextChannelId: voiceSession.lastTextChannelId,
            isMicrophoneEnabled: voiceSession.isMicrophoneEnabled,
            isCameraEnabled: voiceSession.isCameraEnabled,
            isScreenShareEnabled: voiceSession.isScreenShareEnabled,
        };
    }, [voiceSession]);
    const isVoiceConnecting = voiceSession.connectionState === 'connecting';
    const currentUser = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);
    const currentUsername = currentUser?.username;
    // Imperative handle — resize main panel when member list toggles
    const mainRef = useRef(null);
    const toastTimerRef = useRef(null);
    const voiceStateRef = useRef(null);
    const forbiddenRealtimeChannelsRef = useRef(new Set());
    const joinVoiceInFlightRef = useRef(null);
    const pendingVoiceRoomRef = useRef(null);
    const voiceJoinAttemptRef = useRef(0);
    const notificationSocketRef = useRef(null);
    const notificationListenersRef = useRef(new Set());
    const applyVoiceChannelActivityUpdateRef = useRef(null);
    const markOnboardingSeen = useCallback(() => {
        setHasSeenOnboarding(true);
        localStorage.setItem('has_seen_onboarding', 'true');
    }, []);
    const pushToast = useCallback((message) => {
        setToastMessage(message);
        if (toastTimerRef.current) {
            window.clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = window.setTimeout(() => {
            setToastMessage(null);
            toastTimerRef.current = null;
        }, 2500);
    }, []);
    const showDevelopingToast = useCallback(() => {
        pushToast('Tính năng đang phát triển');
    }, [pushToast]);
    const handleLogout = useCallback(() => {
        try {
            useAuthStore.getState().logout();
        }
        catch {
            // no-op
        }
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-store');
        window.location.href = '/auth/login';
    }, []);
    const openCreateServerModal = useCallback((inviteCode) => {
        setCreateServerModalInviteCode(inviteCode?.trim() || null);
        setIsCreateServerModalOpen(true);
    }, []);
    const closeCreateServerModal = useCallback((open) => {
        setIsCreateServerModalOpen(open);
        if (!open) {
            setCreateServerModalInviteCode(null);
        }
    }, []);
    const mapVoiceParticipantsToActivity = useCallback((participants) => {
        const activeMembers = participants.map((participant) => ({
            id: participant.id,
            name: participant.name,
            avatarUrl: participant.avatarUrl,
            initials: initialsFromName(participant.name || participant.id || '?'),
            color: colorFromId(participant.id || participant.name || 'member'),
            isStreaming: participant.isScreenSharing,
        }));
        const hasScreenShare = participants.some((participant) => participant.isScreenSharing);
        return {
            activeMembers,
            liveLabel: hasScreenShare ? 'Đang chia sẻ màn hình' : undefined,
            isLive: hasScreenShare,
        };
    }, []);
    const syncVoiceStateFromRoom = useCallback((room) => {
        const localParticipant = room.localParticipant;
        const currentRoom = useVoiceSessionStore.getState().session.room;
        if (currentRoom !== room) {
            return;
        }
        patchVoiceMediaState({
            isMicrophoneEnabled: localParticipant.isMicrophoneEnabled,
            isCameraEnabled: localParticipant.isCameraEnabled,
            isScreenShareEnabled: localParticipant.isScreenShareEnabled,
        });
    }, [patchVoiceMediaState]);
    const syncCurrentRoomActivity = useCallback((state) => {
        const remoteParticipants = Array.from(state.room.remoteParticipants.values());
        const participants = [
            {
                id: state.room.localParticipant.identity,
                name: state.room.localParticipant.name || currentUser?.username || 'You',
                avatarUrl: currentUser?.avatar_url ?? undefined,
                isScreenSharing: state.room.localParticipant.isScreenShareEnabled,
            },
            ...remoteParticipants.map((participant) => {
                const meta = parseParticipantMetadata(participant.metadata);
                return {
                    id: participant.identity,
                    name: meta.displayName || participant.name || participant.identity,
                    avatarUrl: meta.avatarUrl,
                    isScreenSharing: participant.getTrackPublication(Track.Source.ScreenShare) != null ||
                        participant.getTrackPublication(Track.Source.ScreenShareAudio) != null,
                };
            }),
        ];
        setVoiceActivityByChannel((prev) => ({
            ...prev,
            [state.channelId]: mapVoiceParticipantsToActivity(participants),
        }));
    }, [currentUser?.avatar_url, currentUser?.username, mapVoiceParticipantsToActivity]);
    const applyVoiceChannelActivityUpdate = useCallback((update) => {
        if (!update.serverId || !update.channelId) {
            return;
        }
        if (update.serverId !== activeServerId) {
            return;
        }
        const participants = (update.participants ?? []).map((participant) => {
            const name = participant.name?.trim() || participant.user_id;
            return {
                id: participant.user_id,
                name,
                avatarUrl: participant.avatar_url,
                isScreenSharing: Boolean(participant.is_screen_sharing),
            };
        });
        setVoiceActivityByChannel((prev) => ({
            ...prev,
            [update.channelId]: mapVoiceParticipantsToActivity(participants),
        }));
    }, [activeServerId, mapVoiceParticipantsToActivity]);
    useEffect(() => {
        applyVoiceChannelActivityUpdateRef.current = applyVoiceChannelActivityUpdate;
    }, [applyVoiceChannelActivityUpdate]);
    const subscribeNotificationEvents = useCallback((listener) => {
        notificationListenersRef.current.add(listener);
        return () => {
            notificationListenersRef.current.delete(listener);
        };
    }, []);
    const sendNotificationSocketMessage = useCallback((payload) => {
        const socket = notificationSocketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return false;
        }
        socket.send(JSON.stringify(payload));
        return true;
    }, []);
    useEffect(() => {
        if (!currentUser?.id) {
            return;
        }
        let socket = null;
        let reconnectTimer = null;
        let initialConnectTimer = null;
        let reconnectAttempt = 0;
        let closedByClient = false;
        const onSocketMessage = (raw) => {
            let event;
            try {
                event = JSON.parse(raw);
            }
            catch {
                return;
            }
            notificationListenersRef.current.forEach((listener) => {
                try {
                    listener(event);
                }
                catch {
                    // no-op
                }
            });
            const eventType = resolveNotificationEventType(event);
            if (!eventType || eventType === 'CONNECTED') {
                return;
            }
            if (eventType !== 'VOICE_CHANNEL_ACTIVITY_UPDATED' &&
                eventType !== 'VOICE_ACTIVITY_UPDATED' &&
                eventType !== 'LIVESTREAM_ACTIVITY_UPDATED') {
                return;
            }
            logVoiceDebug('notification:voice-activity-event', {
                eventType,
                rawType: event?.type ?? null,
            });
            const payload = event.payload ?? {};
            const serverId = typeof payload.server_id === 'string' ? payload.server_id : '';
            const channelId = typeof payload.channel_id === 'string' ? payload.channel_id : '';
            const participants = Array.isArray(payload.participants) ? payload.participants : [];
            if (!serverId || !channelId) {
                return;
            }
            applyVoiceChannelActivityUpdateRef.current?.({
                serverId,
                channelId,
                participants,
            });
        };
        const connect = () => {
            if (closedByClient) {
                return;
            }
            const targets = buildNotificationSocketTargets(WS_URL, currentUser.id, token);
            if (targets.length === 0) {
                return;
            }
            const target = targets[reconnectAttempt % targets.length];
            const ws = new WebSocket(target);
            socket = ws;
            notificationSocketRef.current = ws;
            ws.onopen = () => {
                if (socket !== ws) {
                    return;
                }
                reconnectAttempt = 0;
            };
            ws.onmessage = (event) => {
                if (socket !== ws) {
                    return;
                }
                onSocketMessage(String(event.data));
            };
            ws.onclose = () => {
                if (socket === ws) {
                    socket = null;
                }
                if (notificationSocketRef.current === ws) {
                    notificationSocketRef.current = null;
                }
                if (closedByClient) {
                    return;
                }
                if (reconnectTimer) {
                    window.clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }
                const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt);
                reconnectAttempt += 1;
                reconnectTimer = window.setTimeout(() => {
                    reconnectTimer = null;
                    connect();
                }, delay);
            };
            ws.onerror = () => {
                if (socket !== ws) {
                    return;
                }
                ws.close();
            };
        };
        initialConnectTimer = window.setTimeout(connect, 150);
        return () => {
            closedByClient = true;
            if (initialConnectTimer) {
                window.clearTimeout(initialConnectTimer);
            }
            if (reconnectTimer) {
                window.clearTimeout(reconnectTimer);
            }
            socket?.close();
            socket = null;
            notificationSocketRef.current = null;
        };
    }, [currentUser?.id, token]);
    const refreshVoiceSidebarActivity = useCallback(async (serverId) => {
        if (!serverId) {
            return;
        }
        const categories = channelsByServer[serverId] ?? [];
        const realtimeChannels = categories.flatMap((category) => category.channels.filter((channel) => channel.type === 'voice' || channel.type === 'livestream'));
        const allRealtimeChannels = realtimeChannels.filter((channel) => !forbiddenRealtimeChannelsRef.current.has(channel.id));
        if (allRealtimeChannels.length === 0) {
            return;
        }
        const results = await Promise.allSettled(allRealtimeChannels.map(async (channel) => {
            if (channel.type === 'livestream') {
                const response = await getLivestreamState(channel.id);
                return { channelId: channel.id, participants: response.participants ?? [] };
            }
            const response = await listVoiceParticipants(channel.id);
            return { channelId: channel.id, participants: response.items ?? [] };
        }));
        setVoiceActivityByChannel((prev) => {
            const next = { ...prev };
            allRealtimeChannels.forEach((channel) => {
                if (!next[channel.id]) {
                    next[channel.id] = mapVoiceParticipantsToActivity([]);
                }
            });
            results.forEach((result, index) => {
                const channel = allRealtimeChannels[index];
                if (result.status !== 'fulfilled') {
                    const reason = result.reason;
                    const statusCode = reason?.statusCode ?? reason?.response?.status;
                    const errorCode = reason?.code ?? reason?.response?.data?.code;
                    if (channel &&
                        (statusCode === 403 || errorCode === 'CHANNEL_ACCESS_DENIED' || errorCode === 'NOT_SERVER_MEMBER')) {
                        forbiddenRealtimeChannelsRef.current.add(channel.id);
                    }
                    return;
                }
                const participants = result.value.participants.map((participant) => ({
                    id: participant.user_id,
                    name: participant.name || participant.user_id,
                    avatarUrl: participant.avatar_url,
                    isScreenSharing: Boolean(participant.is_screen_sharing),
                }));
                next[result.value.channelId] = mapVoiceParticipantsToActivity(participants);
            });
            return next;
        });
    }, [channelsByServer, mapVoiceParticipantsToActivity]);
    // After showMembers flips, imperatively resize main panel.
    // useEffect runs after render so mainRef is guaranteed to be attached.
    useEffect(() => {
        const target = showMembers ? SIZE.mainWithMembers : SIZE.mainAlone;
        mainRef.current?.resize(target);
    }, [showMembers]);
    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                window.clearTimeout(toastTimerRef.current);
            }
            if (pendingVoiceRoomRef.current) {
                void pendingVoiceRoomRef.current.disconnect();
            }
            if (voiceStateRef.current) {
                void voiceStateRef.current.room.disconnect();
            }
        };
    }, []);
    useEffect(() => {
        voiceStateRef.current = voiceState;
    }, [voiceState]);
    useEffect(() => {
        if (params.serverId) {
            setActiveServerId(params.serverId);
        }
    }, [params.serverId]);
    useEffect(() => {
        forbiddenRealtimeChannelsRef.current.clear();
    }, [activeServerId]);
    useEffect(() => {
        const isTextChannelRoute = location.pathname.includes('/app/servers/') && location.pathname.includes('/channels/');
        const isLivestreamRoute = location.pathname.includes('/app/servers/') && location.pathname.includes('/live/');
        if ((isTextChannelRoute || isLivestreamRoute) && params.channelId) {
            setActiveChannelId(params.channelId);
        }
    }, [location.pathname, params.channelId]);
    useEffect(() => {
        logRouteDebug('location-change', {
            pathname: location.pathname,
            activeServerId,
            activeChannelId,
            paramsServerId: params.serverId ?? null,
            paramsChannelId: params.channelId ?? null,
            isVoiceMode,
            isTournamentMode,
            voiceConnectedChannelId: voiceStateRef.current?.channelId ?? null,
            joinInFlight: joinVoiceInFlightRef.current,
            isVoiceConnecting,
        });
    }, [
        location.pathname,
        activeServerId,
        activeChannelId,
        params.serverId,
        params.channelId,
        isVoiceMode,
        isTournamentMode,
        isVoiceConnecting,
    ]);
    useEffect(() => {
        const isTextChannelRoute = location.pathname.includes('/app/servers/') && location.pathname.includes('/channels/');
        if (!isTextChannelRoute || !params.serverId || !params.channelId) {
            return;
        }
        localStorage.setItem('last_visited', JSON.stringify({ serverId: params.serverId, channelId: params.channelId }));
    }, [location.pathname, params.channelId, params.serverId]);
    useEffect(() => {
        if (isVoiceMode) {
            setShowMembers(false);
        }
    }, [isVoiceMode]);
    useEffect(() => {
        const pendingInviteCode = localStorage.getItem(PENDING_INVITE_CODE_KEY);
        if (!pendingInviteCode) {
            return;
        }
        localStorage.removeItem(PENDING_INVITE_CODE_KEY);
        openCreateServerModal(pendingInviteCode);
    }, [openCreateServerModal]);
    useEffect(() => {
        let isCancelled = false;
        const loadServers = async () => {
            const data = await getServers();
            if (isCancelled) {
                return;
            }
            setServers(data);
            if (data.length === 0) {
                navigate('/app/@me', { replace: true });
                return;
            }
            const paramServerId = params.serverId;
            const nextServerId = paramServerId && data.some((server) => server.id === paramServerId)
                ? paramServerId
                : data[0].id;
            setActiveServerId(nextServerId);
            if (location.pathname === '/app') {
                return;
            }
            if ((!paramServerId || paramServerId !== nextServerId) && !isDmMode) {
                try {
                    const channelData = await getChannels(nextServerId);
                    if (isCancelled) {
                        return;
                    }
                    const availableChannels = channelData.categories.flatMap((category) => category.channels);
                    const firstText = availableChannels.find((channel) => channel.type === 'text') ?? availableChannels[0];
                    if (!firstText) {
                        navigate('/app/@me', { replace: true });
                        return;
                    }
                    navigate(`/app/servers/${nextServerId}/channels/${firstText.id}`, { replace: true });
                }
                catch {
                    navigate('/app/@me', { replace: true });
                }
            }
        };
        void loadServers().catch(() => {
            if (!isCancelled) {
                navigate('/app/@me', { replace: true });
            }
        });
        return () => {
            isCancelled = true;
        };
    }, [isDmMode, location.pathname, navigate, params.serverId]);
    useEffect(() => {
        let isCancelled = false;
        const loadServerDetail = async () => {
            if (!activeServerId) {
                return;
            }
            const detail = await getServerById(activeServerId);
            if (!detail || isCancelled) {
                return;
            }
            setServerDetails((prev) => ({
                ...prev,
                [activeServerId]: detail,
            }));
        };
        void loadServerDetail();
        return () => {
            isCancelled = true;
        };
    }, [activeServerId]);
    useEffect(() => {
        let isCancelled = false;
        const loadChannels = async () => {
            if (!activeServerId) {
                return;
            }
            const data = await getChannels(activeServerId);
            if (isCancelled) {
                return;
            }
            setChannelsByServer((prev) => ({
                ...prev,
                [activeServerId]: data.categories,
            }));
            const availableChannels = data.categories.flatMap((category) => category.channels);
            const hasActiveChannel = availableChannels.some((channel) => channel.id === activeChannelId);
            if (!hasActiveChannel && availableChannels.length > 0) {
                if (isVoiceMode || isTournamentMode) {
                    return;
                }
                const fallbackChannel = availableChannels[0];
                setActiveChannelId(fallbackChannel.id);
                navigate(`/app/servers/${activeServerId}/channels/${fallbackChannel.id}`, { replace: true });
            }
        };
        void loadChannels();
        return () => {
            isCancelled = true;
        };
    }, [activeChannelId, activeServerId, isTournamentMode, isVoiceMode, navigate]);
    useEffect(() => {
        let isCancelled = false;
        const loadMembers = async () => {
            if (!activeServerId) {
                return;
            }
            const data = await getMembers(activeServerId);
            if (isCancelled) {
                return;
            }
            setMembersByServer((prev) => ({
                ...prev,
                [activeServerId]: data,
            }));
        };
        void loadMembers();
        return () => {
            isCancelled = true;
        };
    }, [activeServerId]);
    useEffect(() => {
        if (!activeServerId) {
            return;
        }
        let cancelled = false;
        const poll = async () => {
            try {
                await refreshVoiceSidebarActivity(activeServerId);
            }
            catch {
                // keep sidebar usable even if voice participants API is temporarily unavailable
            }
        };
        void poll();
        const timer = window.setInterval(() => {
            if (cancelled) {
                return;
            }
            void poll();
        }, 30_000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [activeServerId, refreshVoiceSidebarActivity]);
    const toggleMembers = useCallback(() => setShowMembers((v) => !v), []);
    const getFirstNavigableChannelId = useCallback(async (serverId) => {
        const data = await getChannels(serverId);
        const availableChannels = data.categories.flatMap((category) => category.channels);
        const firstText = availableChannels.find((channel) => channel.type === 'text') ?? availableChannels[0];
        return firstText?.id ?? null;
    }, []);
    const navigateToServerFirstChannel = useCallback(async (serverId, replace = false) => {
        const firstChannelId = await getFirstNavigableChannelId(serverId);
        if (!firstChannelId) {
            navigate('/app/@me', replace ? { replace: true } : undefined);
            return;
        }
        setActiveServerId(serverId);
        setActiveChannelId(firstChannelId);
        navigate(`/app/servers/${serverId}/channels/${firstChannelId}`, replace ? { replace: true } : undefined);
    }, [getFirstNavigableChannelId, navigate]);
    const refreshChannels = useCallback(async (serverId) => {
        const refreshed = await getChannels(serverId);
        setChannelsByServer((prev) => ({
            ...prev,
            [serverId]: refreshed.categories,
        }));
        return refreshed;
    }, []);
    const refreshTournaments = useCallback(async (serverId) => {
        if (!serverId) {
            return;
        }
        try {
            const response = await listTournamentsByServer(serverId, { limit: 100 });
            setTournamentsByServer((prev) => ({
                ...prev,
                [serverId]: (response.items ?? []).map((item) => ({
                    id: item.id,
                    name: item.name,
                    status: item.status,
                    tournament_general_channel_id: item.tournament_general_channel_id ?? null,
                })),
            }));
        }
        catch {
            setTournamentsByServer((prev) => ({
                ...prev,
                [serverId]: [],
            }));
        }
    }, []);
    const loadTournamentTreeData = useCallback(async (tournamentId) => {
        if (!tournamentId) {
            return;
        }
        if (loadedTournamentTreeById[tournamentId]) {
            return;
        }
        const [matches, workspaces] = await Promise.all([
            listTournamentMatches(tournamentId, {}),
            listTournamentMatchWorkspaces(tournamentId),
        ]);
        setTournamentMatchesById((prev) => ({
            ...prev,
            [tournamentId]: (matches ?? []).map((match) => ({
                id: match.id,
                round: match.round,
                match_number: match.match_number,
            })),
        }));
        setTournamentWorkspacesById((prev) => ({
            ...prev,
            [tournamentId]: workspaces ?? [],
        }));
        setLoadedTournamentTreeById((prev) => ({
            ...prev,
            [tournamentId]: true,
        }));
    }, [loadedTournamentTreeById]);
    useEffect(() => {
        if (!activeServerId) {
            return;
        }
        void refreshTournaments(activeServerId);
    }, [activeServerId, refreshTournaments]);
    useEffect(() => {
        if (!params.tournamentId) {
            return;
        }
        void loadTournamentTreeData(params.tournamentId).catch(() => {
            // no-op
        });
    }, [loadTournamentTreeData, params.tournamentId]);
    const incrementChannelUnread = useCallback((channelId) => {
        if (!channelId) {
            return;
        }
        setChannelsByServer((prev) => {
            let hasChanged = false;
            const next = {};
            Object.entries(prev).forEach(([serverId, categories]) => {
                const nextCategories = categories.map((category) => {
                    const nextChannels = category.channels.map((channel) => {
                        if (channel.id !== channelId || channel.type !== 'text') {
                            return channel;
                        }
                        hasChanged = true;
                        return {
                            ...channel,
                            unread: (channel.unread ?? 0) + 1,
                        };
                    });
                    return {
                        ...category,
                        channels: nextChannels,
                    };
                });
                next[serverId] = nextCategories;
            });
            return hasChanged ? next : prev;
        });
    }, []);
    const resetChannelUnread = useCallback((channelId) => {
        if (!channelId) {
            return;
        }
        setChannelsByServer((prev) => {
            let hasChanged = false;
            const next = {};
            Object.entries(prev).forEach(([serverId, categories]) => {
                const nextCategories = categories.map((category) => {
                    const nextChannels = category.channels.map((channel) => {
                        if (channel.id !== channelId || channel.type !== 'text' || (channel.unread ?? 0) === 0) {
                            return channel;
                        }
                        hasChanged = true;
                        return {
                            ...channel,
                            unread: 0,
                        };
                    });
                    return {
                        ...category,
                        channels: nextChannels,
                    };
                });
                next[serverId] = nextCategories;
            });
            return hasChanged ? next : prev;
        });
    }, []);
    const setChannelUnread = useCallback((channelId, unreadCount) => {
        if (!channelId) {
            return;
        }
        const nextUnread = Math.max(0, Math.floor(unreadCount));
        setChannelsByServer((prev) => {
            let hasChanged = false;
            const next = {};
            Object.entries(prev).forEach(([serverId, categories]) => {
                const nextCategories = categories.map((category) => {
                    const nextChannels = category.channels.map((channel) => {
                        if (channel.id !== channelId || channel.type !== 'text' || (channel.unread ?? 0) === nextUnread) {
                            return channel;
                        }
                        hasChanged = true;
                        return {
                            ...channel,
                            unread: nextUnread,
                        };
                    });
                    return {
                        ...category,
                        channels: nextChannels,
                    };
                });
                next[serverId] = nextCategories;
            });
            return hasChanged ? next : prev;
        });
    }, []);
    const handleCreateChannel = useCallback(async (payload) => {
        if (!activeServerId) {
            return;
        }
        await createChannel(activeServerId, payload);
        await refreshChannels(activeServerId);
    }, [activeServerId, refreshChannels]);
    const resolveFallbackTextChannel = useCallback((serverId, preferredChannelId) => {
        const channelData = channelsByServer[serverId] ?? [];
        const availableChannels = channelData.flatMap((category) => category.channels);
        const preferred = preferredChannelId
            ? availableChannels.find((channel) => channel.id === preferredChannelId && channel.type === 'text')
            : null;
        return preferred ?? availableChannels.find((channel) => channel.type === 'text') ?? availableChannels[0] ?? null;
    }, [channelsByServer]);
    const handleLeaveVoiceChannel = useCallback(async (opts = {}) => {
        const shouldNavigate = opts.navigateToText ?? true;
        const shouldInvalidateJoinAttempt = opts.invalidateJoinAttempt ?? true;
        logVoiceDebug('leave:start', {
            shouldNavigate,
            shouldInvalidateJoinAttempt,
            hasPendingRoom: Boolean(pendingVoiceRoomRef.current),
            hasCurrentVoiceState: Boolean(voiceStateRef.current),
        });
        if (shouldInvalidateJoinAttempt) {
            voiceJoinAttemptRef.current += 1;
            joinVoiceInFlightRef.current = null;
            logVoiceDebug('leave:invalidate-join-attempt', {
                nextJoinAttempt: voiceJoinAttemptRef.current,
            });
        }
        const pendingRoom = pendingVoiceRoomRef.current;
        if (pendingRoom) {
            pendingVoiceRoomRef.current = null;
            try {
                await pendingRoom.disconnect();
                logVoiceDebug('leave:pending-room-disconnected');
            }
            catch {
                // no-op
                logVoiceDebug('leave:pending-room-disconnect-failed');
            }
        }
        const current = voiceStateRef.current;
        if (!current) {
            logVoiceDebug('leave:no-current-voice-state');
            return;
        }
        try {
            await current.room.disconnect();
            logVoiceDebug('leave:current-room-disconnected', {
                serverId: current.serverId,
                channelId: current.channelId,
            });
        }
        catch {
            // no-op
            logVoiceDebug('leave:current-room-disconnect-failed', {
                serverId: current.serverId,
                channelId: current.channelId,
            });
        }
        if (current.serverId) {
            setVoiceActivityByChannel((prev) => ({
                ...prev,
                [current.channelId]: {
                    activeMembers: [],
                    isLive: false,
                    liveLabel: undefined,
                },
            }));
        }
        clearVoiceSession();
        logVoiceDebug('leave:voice-state-cleared', {
            serverId: current.serverId,
            channelId: current.channelId,
        });
        if (!shouldNavigate) {
            logVoiceDebug('leave:skip-navigation');
            return;
        }
        const fallback = resolveFallbackTextChannel(current.serverId, current.lastTextChannelId);
        if (!fallback) {
            logVoiceDebug('leave:no-fallback-channel-navigate-dm', {
                serverId: current.serverId,
            });
            navigate('/app/@me');
            return;
        }
        setActiveServerId(current.serverId);
        setActiveChannelId(fallback.id);
        navigate(`/app/servers/${current.serverId}/channels/${fallback.id}`);
        logVoiceDebug('leave:navigate-fallback-text-channel', {
            serverId: current.serverId,
            channelId: fallback.id,
        });
    }, [clearVoiceSession, navigate, resolveFallbackTextChannel]);
    const joinVoiceChannel = useCallback(async (channelId, preferredChannelName) => {
        logVoiceDebug('join:click', {
            activeServerId,
            channelId,
            activeChannelId,
            pathname: location.pathname,
            isVoiceConnecting,
            inFlight: joinVoiceInFlightRef.current,
            currentVoiceServerId: voiceStateRef.current?.serverId ?? null,
            currentVoiceChannelId: voiceStateRef.current?.channelId ?? null,
        });
        if (!activeServerId) {
            pushToast('Chưa xác định server hiện tại.');
            logVoiceDebug('join:blocked-no-active-server');
            return;
        }
        const joinKey = `${activeServerId}:${channelId}`;
        if (joinVoiceInFlightRef.current === joinKey) {
            logVoiceDebug('join:blocked-same-join-in-flight', { joinKey });
            return;
        }
        const currentVoice = voiceStateRef.current;
        if (currentVoice && currentVoice.serverId === activeServerId && currentVoice.channelId === channelId) {
            logVoiceDebug('join:already-in-target-room', { joinKey });
            return;
        }
        if (isVoiceConnecting) {
            logVoiceDebug('join:blocked-is-voice-connecting', { joinKey });
            return;
        }
        const categories = channelsByServer[activeServerId] ?? [];
        const selectedChannel = categories
            .flatMap((category) => category.channels)
            .find((channel) => channel.id === channelId && channel.type === 'voice');
        const channelName = selectedChannel?.name ?? preferredChannelName ?? channelId;
        const serverName = serverDetails[activeServerId]?.name ??
            servers.find((server) => server.id === activeServerId)?.name ??
            'Server';
        const previous = voiceStateRef.current;
        const lastTextChannelId = categories
            .find((category) => category.channels.some((channel) => channel.id === activeChannelId))
            ?.channels.find((channel) => channel.id === activeChannelId && channel.type === 'text')
            ? activeChannelId
            : previous?.lastTextChannelId ?? null;
        const joinAttempt = voiceJoinAttemptRef.current + 1;
        voiceJoinAttemptRef.current = joinAttempt;
        setVoiceConnectingState(activeServerId, channelId);
        joinVoiceInFlightRef.current = joinKey;
        logVoiceDebug('join:start', {
            joinAttempt,
            joinKey,
            serverName,
            channelName,
            hasPreviousVoice: Boolean(previous),
            lastTextChannelId,
        });
        try {
            if (previous) {
                await handleLeaveVoiceChannel({ navigateToText: false, invalidateJoinAttempt: false });
                logVoiceDebug('join:previous-room-left', {
                    joinAttempt,
                    previousServerId: previous.serverId,
                    previousChannelId: previous.channelId,
                });
            }
            else if (pendingVoiceRoomRef.current) {
                try {
                    await pendingVoiceRoomRef.current.disconnect();
                    logVoiceDebug('join:stale-pending-room-disconnected', { joinAttempt });
                }
                catch {
                    // no-op
                    logVoiceDebug('join:stale-pending-room-disconnect-failed', { joinAttempt });
                }
                pendingVoiceRoomRef.current = null;
            }
            if (voiceJoinAttemptRef.current !== joinAttempt) {
                logVoiceDebug('join:aborted-attempt-mismatch-before-token', {
                    joinAttempt,
                    currentAttempt: voiceJoinAttemptRef.current,
                });
                return;
            }
            const { token, url } = await getVoiceToken(channelId);
            logVoiceDebug('join:token-response', {
                joinAttempt,
                channelId,
                url,
                tokenLength: token?.length ?? 0,
                tokenPrefix: token?.slice(0, 12) ?? '',
            });
            if (voiceJoinAttemptRef.current !== joinAttempt) {
                logVoiceDebug('join:aborted-attempt-mismatch-after-token', {
                    joinAttempt,
                    currentAttempt: voiceJoinAttemptRef.current,
                });
                return;
            }
            const room = new Room();
            pendingVoiceRoomRef.current = room;
            const connectTargets = buildConnectTargets(url);
            logVoiceDebug('join:connect-targets', {
                joinAttempt,
                connectTargets,
            });
            let connectError = null;
            for (const target of connectTargets) {
                if (voiceJoinAttemptRef.current !== joinAttempt) {
                    logVoiceDebug('join:break-attempt-mismatch-during-connect-loop', {
                        joinAttempt,
                        currentAttempt: voiceJoinAttemptRef.current,
                    });
                    break;
                }
                try {
                    logVoiceDebug('join:connecting-target', { joinAttempt, target });
                    await room.connect(target, token);
                    connectError = null;
                    logVoiceDebug('join:connected-target', { joinAttempt, target });
                    break;
                }
                catch (error) {
                    connectError = error;
                    logVoiceDebug('join:connect-target-failed', {
                        joinAttempt,
                        target,
                        errorMessage: error?.message ?? 'unknown',
                        errorName: error?.name ?? 'unknown',
                    });
                    try {
                        await room.disconnect();
                    }
                    catch {
                        // no-op
                        logVoiceDebug('join:room-disconnect-after-failed-target-error', {
                            joinAttempt,
                            target,
                        });
                    }
                }
            }
            if (voiceJoinAttemptRef.current !== joinAttempt) {
                try {
                    await room.disconnect();
                }
                catch {
                    // no-op
                    logVoiceDebug('join:room-disconnect-attempt-mismatch-failed', { joinAttempt });
                }
                logVoiceDebug('join:aborted-attempt-mismatch-after-connect-loop', {
                    joinAttempt,
                    currentAttempt: voiceJoinAttemptRef.current,
                });
                return;
            }
            if (connectError) {
                logVoiceDebug('join:connect-failed-final', {
                    joinAttempt,
                    errorMessage: connectError?.message ?? 'unknown',
                    errorName: connectError?.name ?? 'unknown',
                });
                const rawMessage = connectError?.message ?? 'Không thể kết nối kênh thoại.';
                const normalized = String(rawMessage).toLowerCase();
                if (normalized.includes('websocket') ||
                    normalized.includes('ws://') ||
                    normalized.includes('wss://') ||
                    normalized.includes('network')) {
                    pushToast('Không thể kết nối LiveKit (WS). Kiểm tra URL LiveKit/TLS ở backend.');
                }
                else {
                    pushToast(rawMessage);
                }
                setVoiceErrorState(rawMessage);
                return;
            }
            pendingVoiceRoomRef.current = null;
            const nextVoiceState = {
                channelId,
                channelName,
                serverId: activeServerId,
                serverName,
                room,
                lastTextChannelId,
                isMicrophoneEnabled: room.localParticipant.isMicrophoneEnabled,
                isCameraEnabled: room.localParticipant.isCameraEnabled,
                isScreenShareEnabled: room.localParticipant.isScreenShareEnabled,
            };
            const onParticipantChanged = () => {
                syncCurrentRoomActivity(nextVoiceState);
                syncVoiceStateFromRoom(room);
            };
            room.on(RoomEvent.ParticipantConnected, onParticipantChanged);
            room.on(RoomEvent.ParticipantDisconnected, onParticipantChanged);
            room.on(RoomEvent.LocalTrackPublished, onParticipantChanged);
            room.on(RoomEvent.LocalTrackUnpublished, onParticipantChanged);
            room.on(RoomEvent.TrackPublished, onParticipantChanged);
            room.on(RoomEvent.TrackUnpublished, onParticipantChanged);
            room.on(RoomEvent.Disconnected, () => {
                logVoiceDebug('join:room-disconnected-event', {
                    joinAttempt,
                    channelId,
                    roomName: room.name,
                });
                const session = useVoiceSessionStore.getState().session;
                if (session.room === room) {
                    useVoiceSessionStore.getState().clear();
                }
            });
            setVoiceConnectedState({
                serverId: nextVoiceState.serverId,
                serverName: nextVoiceState.serverName,
                channelId: nextVoiceState.channelId,
                channelName: nextVoiceState.channelName,
                room: nextVoiceState.room,
                lastTextChannelId: nextVoiceState.lastTextChannelId,
                isMicrophoneEnabled: nextVoiceState.isMicrophoneEnabled,
                isCameraEnabled: nextVoiceState.isCameraEnabled,
                isScreenShareEnabled: nextVoiceState.isScreenShareEnabled,
            });
            syncCurrentRoomActivity(nextVoiceState);
            syncVoiceStateFromRoom(room);
            logVoiceDebug('join:connected-keep-current-route', {
                joinAttempt,
                channelId,
                activeServerId,
                pathname: location.pathname,
            });
            logVoiceDebug('join:success', {
                joinAttempt,
                channelId,
                serverId: activeServerId,
                roomName: room.name,
            });
        }
        catch (error) {
            logVoiceDebug('join:exception', {
                joinAttempt,
                channelId,
                errorMessage: error?.message ?? null,
                errorName: error?.name ?? 'unknown',
                errorStack: error?.stack ?? null,
            });
            const rawMessage = error?.message ?? 'Không thể kết nối kênh thoại.';
            const normalized = String(rawMessage).toLowerCase();
            if (normalized.includes('websocket') ||
                normalized.includes('ws://') ||
                normalized.includes('wss://') ||
                normalized.includes('network')) {
                pushToast('Không thể kết nối LiveKit (WS). Kiểm tra URL LiveKit/TLS ở backend.');
            }
            else {
                pushToast(rawMessage);
            }
            setVoiceErrorState(rawMessage);
        }
        finally {
            if (pendingVoiceRoomRef.current && voiceJoinAttemptRef.current === joinAttempt) {
                pendingVoiceRoomRef.current = null;
            }
            if (joinVoiceInFlightRef.current === joinKey) {
                joinVoiceInFlightRef.current = null;
            }
            logVoiceDebug('join:finally', {
                joinAttempt,
                joinKey,
                currentAttempt: voiceJoinAttemptRef.current,
                isConnectingWillReset: voiceJoinAttemptRef.current === joinAttempt,
                inFlightNow: joinVoiceInFlightRef.current,
                hasPendingRoom: Boolean(pendingVoiceRoomRef.current),
            });
        }
    }, [
        activeChannelId,
        activeServerId,
        channelsByServer,
        handleLeaveVoiceChannel,
        isVoiceConnecting,
        location.pathname,
        navigate,
        pushToast,
        serverDetails,
        servers,
        setVoiceConnectedState,
        setVoiceConnectingState,
        setVoiceErrorState,
        syncCurrentRoomActivity,
        syncVoiceStateFromRoom,
    ]);
    const toggleMicrophone = useCallback(async () => {
        if (!voiceState) {
            return;
        }
        const next = !voiceState.room.localParticipant.isMicrophoneEnabled;
        await voiceState.room.localParticipant.setMicrophoneEnabled(next);
        syncVoiceStateFromRoom(voiceState.room);
    }, [syncVoiceStateFromRoom, voiceState]);
    const toggleCamera = useCallback(async () => {
        if (!voiceState) {
            return;
        }
        const next = !voiceState.room.localParticipant.isCameraEnabled;
        await voiceState.room.localParticipant.setCameraEnabled(next);
        syncVoiceStateFromRoom(voiceState.room);
    }, [syncVoiceStateFromRoom, voiceState]);
    const toggleScreenShare = useCallback(async () => {
        if (!voiceState) {
            return;
        }
        const next = !voiceState.room.localParticipant.isScreenShareEnabled;
        await voiceState.room.localParticipant.setScreenShareEnabled(next);
        syncVoiceStateFromRoom(voiceState.room);
        syncCurrentRoomActivity(voiceState);
    }, [syncCurrentRoomActivity, syncVoiceStateFromRoom, voiceState]);
    const handleCreateServer = useCallback(async (payload, iconFile) => {
        const created = await createServer(payload);
        if (iconFile) {
            try {
                const iconURL = await uploadServerMedia(iconFile);
                await updateServerProfile(created.id, { icon_url: iconURL });
            }
            catch {
                pushToast('Tạo server thành công nhưng chưa thể tải biểu tượng.');
            }
        }
        markOnboardingSeen();
        const refreshedServers = await getServers();
        setServers(refreshedServers);
        const firstChannelId = await getFirstNavigableChannelId(created.id);
        if (firstChannelId) {
            setActiveServerId(created.id);
            setActiveChannelId(firstChannelId);
            navigate(`/app/servers/${created.id}/channels/${firstChannelId}`);
            return;
        }
        const createdChannel = await createChannel(created.id, {
            name: 'general',
            type: 'TEXT',
        });
        setActiveServerId(created.id);
        setActiveChannelId(createdChannel.id);
        navigate(`/app/servers/${created.id}/channels/${createdChannel.id}`);
    }, [getFirstNavigableChannelId, markOnboardingSeen, navigate, pushToast]);
    const resolveInvitePreview = useCallback(async (code) => {
        const preview = await getInvitePreview(code);
        return {
            code: preview.invite_code,
            expiresAt: preview.expires_at ?? null,
            server: {
                id: preview.server.id,
                name: preview.server.name,
                iconUrl: preview.server.icon_url,
                memberCount: preview.server.member_count,
            },
        };
    }, []);
    const handleJoinByInvite = useCallback(async (code) => {
        const joinedServer = await joinByInviteCode(code);
        markOnboardingSeen();
        const refreshedServers = await getServers();
        setServers(refreshedServers);
        setServerDetails((prev) => ({
            ...prev,
            [joinedServer.id]: joinedServer,
        }));
        await navigateToServerFirstChannel(joinedServer.id);
    }, [markOnboardingSeen, navigateToServerFirstChannel]);
    const refreshActiveServer = useCallback(async (serverId) => {
        const list = await getServers();
        setServers(list);
        const detail = await getServerById(serverId);
        if (detail) {
            setServerDetails((prev) => ({
                ...prev,
                [serverId]: detail,
            }));
        }
    }, []);
    const activeServer = useMemo(() => serverDetails[activeServerId] ??
        servers.find((server) => server.id === activeServerId) ??
        servers[0], [activeServerId, serverDetails, servers]);
    const activeCategories = useMemo(() => channelsByServer[activeServerId] ?? [], [activeServerId, channelsByServer]);
    const categoriesWithVoiceActivity = useMemo(() => activeCategories.map((category) => ({
        ...category,
        channels: category.channels.map((channel) => {
            if (channel.type !== 'voice' && channel.type !== 'livestream') {
                return channel;
            }
            const activity = voiceActivityByChannel[channel.id];
            if (!activity) {
                return channel;
            }
            return {
                ...channel,
                activeMembers: activity.activeMembers,
                liveLabel: activity.liveLabel,
                isLive: activity.isLive,
            };
        }),
    })), [activeCategories, voiceActivityByChannel]);
    const activeTournaments = useMemo(() => tournamentsByServer[activeServerId] ?? [], [activeServerId, tournamentsByServer]);
    const tournamentChannelMap = useMemo(() => {
        const map = new Map();
        for (const category of categoriesWithVoiceActivity) {
            for (const channel of category.channels) {
                map.set(channel.id, channel);
            }
        }
        return map;
    }, [categoriesWithVoiceActivity]);
    const tournamentChannelTree = useMemo(() => {
        const buildNode = (channelId, role, fallbackName, type) => {
            if (!channelId) {
                return null;
            }
            const channel = tournamentChannelMap.get(channelId);
            // Only show channels user can actually access (already resolved in server channel list).
            if (!channel) {
                return null;
            }
            return {
                id: channelId,
                name: channel.name ?? fallbackName,
                type: channel.type ?? type,
                role,
                unread: channel.unread ?? 0,
                activeMembers: channel.activeMembers,
                liveLabel: channel.liveLabel,
                isLive: channel.isLive,
            };
        };
        return activeTournaments.map((tournament) => {
            const matches = (tournamentMatchesById[tournament.id] ?? []).slice().sort((a, b) => {
                if (a.round !== b.round) {
                    return a.round - b.round;
                }
                return a.match_number - b.match_number;
            });
            const workspaces = tournamentWorkspacesById[tournament.id] ?? [];
            const workspaceByMatch = new Map(workspaces.map((workspace) => [workspace.match_id, workspace]));
            const matchNodes = matches.map((match) => {
                const workspace = workspaceByMatch.get(match.id);
                const channels = [];
                const roleNodes = [
                    buildNode(workspace?.team_a_channel_id, 'team-a', `team-a-r${match.round}-m${match.match_number}`, 'voice'),
                    buildNode(workspace?.team_b_channel_id, 'team-b', `team-b-r${match.round}-m${match.match_number}`, 'voice'),
                    buildNode(workspace?.referee_channel_id ?? workspace?.admin_channel_id, 'referee', `referee-r${match.round}-m${match.match_number}`, 'voice'),
                    buildNode(workspace?.livestream_channel_id ?? undefined, 'livestream', `live-r${match.round}-m${match.match_number}`, 'livestream'),
                ];
                for (const node of roleNodes) {
                    if (node)
                        channels.push(node);
                }
                return {
                    matchId: match.id,
                    round: match.round,
                    matchNumber: match.match_number,
                    label: `Round ${match.round} - Match ${match.match_number}`,
                    channels,
                };
            });
            return {
                id: tournament.id,
                name: tournament.name,
                status: tournament.status,
                generalTextChannelId: tournament.tournament_general_channel_id ?? null,
                generalChannel: buildNode(tournament.tournament_general_channel_id ?? undefined, 'general', 'tournament-general', 'text'),
                matches: matchNodes,
            };
        });
    }, [activeTournaments, tournamentChannelMap, tournamentMatchesById, tournamentWorkspacesById]);
    const categoriesForSidebar = useMemo(() => {
        const tournamentGeneralIds = new Set(activeTournaments
            .map((tournament) => tournament.tournament_general_channel_id)
            .filter((id) => Boolean(id)));
        const tournamentLivestreamIds = new Set((tournamentWorkspacesById[activeServerId] ?? [])
            .map((workspace) => workspace.livestream_channel_id)
            .filter((id) => Boolean(id)));
        return (categoriesWithVoiceActivity.map((category) => ({
            ...category,
            channels: category.channels.filter((channel) => !(channel.type === 'voice' && isTournamentMatchVoiceChannelName(channel.name)) &&
                !(channel.type === 'livestream' && (isTournamentMatchLivestreamChannelName(channel.name) || tournamentLivestreamIds.has(channel.id))) &&
                !(channel.type === 'text' && tournamentGeneralIds.has(channel.id))),
        })));
    }, [activeServerId, activeTournaments, categoriesWithVoiceActivity, tournamentWorkspacesById]);
    const activeMembers = useMemo(() => membersByServer[activeServerId] ?? [], [activeServerId, membersByServer]);
    const requestTournamentObserverTokens = useCallback(async (channelId) => {
        if (!activeServerId || activeTournaments.length === 0) {
            return null;
        }
        for (const tournament of activeTournaments) {
            let workspaces = [];
            try {
                workspaces = await listTournamentMatchWorkspaces(tournament.id);
            }
            catch {
                continue;
            }
            const workspace = workspaces.find((item) => [
                item.team_a_channel_id,
                item.team_b_channel_id,
                item.caster_channel_id,
                item.admin_channel_id,
                item.referee_channel_id,
                item.spectator_channel_id,
                item.livestream_channel_id,
            ].includes(channelId));
            if (!workspace) {
                continue;
            }
            const bundle = await getTournamentMatchObserverTokens(tournament.id, workspace.match_id);
            return {
                matchId: workspace.match_id,
                feeds: [
                    {
                        role: 'team-a',
                        channelId: bundle.team_a.channel_id,
                        channelName: 'team-a',
                        token: bundle.team_a.token,
                        url: bundle.team_a.url,
                    },
                    {
                        role: 'team-b',
                        channelId: bundle.team_b.channel_id,
                        channelName: 'team-b',
                        token: bundle.team_b.token,
                        url: bundle.team_b.url,
                    },
                ],
            };
        }
        return null;
    }, [activeServerId, activeTournaments]);
    const requestLivestreamToken = useCallback(async (channelId, mode = 'viewer') => getLivestreamToken(channelId, mode), []);
    const requestLivestreamState = useCallback(async (channelId) => getLivestreamState(channelId), []);
    const hasManageVoicePermission = useMemo(() => {
        if (!currentUser) {
            return false;
        }
        if (currentUser.is_admin) {
            return true;
        }
        return activeServer?.ownerId === currentUser.id;
    }, [activeServer?.ownerId, currentUser]);
    const hasManageTournamentsPermission = useMemo(() => {
        if (!currentUser) {
            return false;
        }
        if (currentUser.is_admin) {
            return true;
        }
        return activeServer?.ownerId === currentUser.id;
    }, [activeServer?.ownerId, currentUser]);
    useEffect(() => {
        if (!voiceState) {
            return;
        }
        syncCurrentRoomActivity(voiceState);
    }, [syncCurrentRoomActivity, voiceState?.room]);
    // Context passed to all child routes via <Outlet>
    const outletContext = useMemo(() => ({
        showMembers,
        setShowMembers,
        toggleMembers,
        activeServerId,
        setActiveServerId,
        activeChannelId,
        setActiveChannelId,
        activeCategories: categoriesWithVoiceActivity,
        serverCount: servers.length,
        shouldShowOnboarding: servers.length === 0 && !hasSeenOnboarding,
        dismissOnboarding: markOnboardingSeen,
        openCreateServerModal: () => openCreateServerModal(),
        openInviteMemberDialog: () => setIsInviteDialogOpen(true),
        showDevelopingToast,
        voiceState,
        isVoiceConnecting,
        canManageVoiceTools: hasManageVoicePermission,
        joinVoiceChannel,
        leaveVoiceChannel: handleLeaveVoiceChannel,
        toggleMicrophone,
        toggleCamera,
        toggleScreenShare,
        applyVoiceChannelActivityUpdate,
        subscribeNotificationEvents,
        sendNotificationSocketMessage,
        requestTournamentObserverTokens,
        requestLivestreamToken,
        requestLivestreamState,
        pushToast,
        incrementChannelUnread,
        resetChannelUnread,
        setChannelUnread,
        canManageTournaments: hasManageTournamentsPermission,
        openTournamentCreateDialog: () => setIsCreateTournamentModalOpen(true),
        refreshActiveServerTournaments: () => refreshTournaments(activeServerId),
        membersByServer,
    }), [
        showMembers,
        toggleMembers,
        activeServerId,
        activeChannelId,
        categoriesWithVoiceActivity,
        servers.length,
        hasSeenOnboarding,
        markOnboardingSeen,
        openCreateServerModal,
        setIsInviteDialogOpen,
        showDevelopingToast,
        voiceState,
        isVoiceConnecting,
        hasManageVoicePermission,
        joinVoiceChannel,
        handleLeaveVoiceChannel,
        toggleMicrophone,
        toggleCamera,
        toggleScreenShare,
        applyVoiceChannelActivityUpdate,
        subscribeNotificationEvents,
        sendNotificationSocketMessage,
        pushToast,
        requestLivestreamState,
        requestLivestreamToken,
        incrementChannelUnread,
        resetChannelUnread,
        setChannelUnread,
        hasManageTournamentsPermission,
        refreshTournaments,
        membersByServer,
        requestTournamentObserverTokens,
    ]);
    return (_jsx(TooltipProvider, { delayDuration: 500, children: _jsxs("div", { className: "flex h-screen w-screen overflow-hidden bg-background text-foreground", children: [_jsx("div", { className: "w-[72px] flex-none overflow-hidden", children: _jsx(ServerRail, { servers: servers, activeServerId: activeServerId, onSelectServer: async (serverId) => {
                            try {
                                await navigateToServerFirstChannel(serverId);
                            }
                            catch {
                                navigate('/app/@me');
                            }
                        }, onOpenGames: () => navigate('/games'), onCreateServer: () => openCreateServerModal() }) }), _jsxs(PanelGroup, { orientation: "horizontal", className: "min-w-0 flex-1 overflow-hidden", children: [_jsx(Panel, { id: "sidebar", defaultSize: SIZE.sidebar.default, minSize: SIZE.sidebar.min, maxSize: SIZE.sidebar.max, className: "overflow-hidden", children: _jsx("div", { className: "flex h-full min-w-0 flex-col overflow-hidden", children: isDmMode ? (_jsx(DirectMessagesSidebar, {})) : (_jsx(ChannelSidebar, { serverId: activeServerId, serverName: activeServer?.name ?? 'Server', serverInitials: activeServer?.initials, serverColor: activeServer?.color ?? 'bg-indigo-500', serverBannerUrl: activeServer?.bannerUrl, serverIconUrl: activeServer?.iconUrl, serverBoostLevel: activeServer?.boostLevel, categories: categoriesForSidebar, tournamentChannelTree: tournamentChannelTree, activeChannelId: activeChannelId, activeVoiceChannelId: voiceState?.channelId ?? undefined, onSelectChannel: (channelId, type, channelName) => {
                                        if (type === 'voice') {
                                            const connectedVoice = voiceStateRef.current;
                                            if (connectedVoice &&
                                                connectedVoice.serverId === activeServerId &&
                                                connectedVoice.channelId === channelId) {
                                                logVoiceDebug('ui:channel-sidebar-voice-already-connected', {
                                                    channelId,
                                                    activeServerId,
                                                });
                                                navigate(`/app/servers/${activeServerId}/voice/${channelId}`);
                                                return;
                                            }
                                            logRouteDebug('sidebar-click-voice', {
                                                channelId,
                                                fromPath: location.pathname,
                                                activeServerId,
                                                activeChannelId,
                                            });
                                            logVoiceDebug('ui:channel-sidebar-click-voice', {
                                                channelId,
                                                activeServerId,
                                                activeChannelId,
                                            });
                                            if (activeServerId) {
                                                logVoiceDebug('ui:channel-sidebar-join-voice-without-route-change', {
                                                    channelId,
                                                    activeServerId,
                                                    pathname: location.pathname,
                                                });
                                                navigate(`/app/servers/${activeServerId}/voice/${channelId}`);
                                            }
                                            void joinVoiceChannel(channelId, channelName);
                                            return;
                                        }
                                        if (type === 'livestream') {
                                            if (!activeServerId) {
                                                return;
                                            }
                                            logRouteDebug('sidebar-click-livestream', {
                                                channelId,
                                                fromPath: location.pathname,
                                                toPath: `/app/servers/${activeServerId}/live/${channelId}`,
                                                activeServerId,
                                                activeChannelId,
                                                voiceConnectedChannelId: voiceStateRef.current?.channelId ?? null,
                                            });
                                            setActiveChannelId(channelId);
                                            navigate(`/app/servers/${activeServerId}/live/${channelId}`);
                                            return;
                                        }
                                        logRouteDebug('sidebar-click-text', {
                                            channelId,
                                            fromPath: location.pathname,
                                            toPath: `/app/servers/${activeServerId}/channels/${channelId}`,
                                            activeServerId,
                                            activeChannelId,
                                            voiceConnectedChannelId: voiceStateRef.current?.channelId ?? null,
                                        });
                                        setActiveChannelId(channelId);
                                        navigate(`/app/servers/${activeServerId}/channels/${channelId}`);
                                    }, onCreateChannel: () => setIsCreateChannelModalOpen(true), onInviteMember: () => setIsInviteDialogOpen(true), onOpenServerSettings: () => {
                                        setServerSettingsTab('profile');
                                        setIsServerSettingsOpen(true);
                                    }, onOpenServerMembers: () => {
                                        setServerSettingsTab('members');
                                        setIsServerSettingsOpen(true);
                                    }, onOpenUserSettings: () => setIsUserSettingsOpen(true), onLogout: handleLogout, voiceState: voiceState, onLeaveVoiceChannel: () => void handleLeaveVoiceChannel(), tournaments: activeTournaments, onSelectTournament: (tournamentId) => {
                                        if (!activeServerId) {
                                            return;
                                        }
                                        void loadTournamentTreeData(tournamentId).catch(() => {
                                            // no-op: tournament detail page can still load independently
                                        });
                                        logRouteDebug('sidebar-click-tournament', {
                                            tournamentId,
                                            fromPath: location.pathname,
                                            toPath: `/app/servers/${activeServerId}/tournaments/${tournamentId}`,
                                            activeServerId,
                                            activeChannelId,
                                            voiceConnectedChannelId: voiceStateRef.current?.channelId ?? null,
                                        });
                                        navigate(`/app/servers/${activeServerId}/tournaments/${tournamentId}`);
                                    }, onCreateTournament: () => setIsCreateTournamentModalOpen(true), canCreateTournament: hasManageTournamentsPermission })) }) }), _jsx(ResizeHandle, {}), _jsx(Panel, { id: "main", panelRef: mainRef, defaultSize: showMembers ? SIZE.mainWithMembers : SIZE.mainAlone, minSize: 35, maxSize: 120, className: "overflow-hidden", children: _jsx("div", { className: "flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-background", children: _jsx(Outlet, { context: outletContext }, location.pathname) }) }), showMembers && !isVoiceMode && (_jsxs(_Fragment, { children: [_jsx(ResizeHandle, {}), _jsx(Panel, { id: "members", defaultSize: SIZE.members.default, minSize: SIZE.members.min, maxSize: SIZE.members.max, className: "overflow-hidden", children: _jsx("div", { className: "h-full overflow-hidden border-l border-border bg-[hsl(240,6%,10%)]", children: _jsx(MemberListPanel, { members: activeMembers }) }) })] }))] }), _jsx(CreateServerModal, { isOpen: isCreateServerModalOpen, onOpenChange: closeCreateServerModal, defaultServerName: `Server của ${currentUsername ?? 'bạn'}`, onCreate: handleCreateServer, onResolveInvitePreview: resolveInvitePreview, onJoinByInvite: handleJoinByInvite, initialInviteCode: createServerModalInviteCode }), activeServerId && (_jsxs(_Fragment, { children: [_jsx(CreateChannelModal, { isOpen: isCreateChannelModalOpen, onOpenChange: setIsCreateChannelModalOpen, onCreate: handleCreateChannel }), _jsx(InviteMemberDialog, { open: isInviteDialogOpen, onOpenChange: setIsInviteDialogOpen, serverId: activeServerId }), _jsx(TournamentCreateEditDialog, { open: isCreateTournamentModalOpen, onOpenChange: setIsCreateTournamentModalOpen, serverId: activeServerId, onSuccess: (created) => {
                                pushToast('Đã tạo giải đấu.');
                                void refreshTournaments(activeServerId);
                                navigate(`/app/servers/${activeServerId}/tournaments/${created.id}`);
                            } })] })), toastMessage && (_jsx("div", { className: "fixed bottom-4 right-4 z-[100] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-lg", children: toastMessage })), activeServer && isServerSettingsOpen && (_jsx(ServerSettingsOverlay, { open: isServerSettingsOpen, initialTab: serverSettingsTab, serverId: activeServerId, server: activeServer, onClose: () => setIsServerSettingsOpen(false), onServerUpdated: refreshActiveServer, onToast: pushToast })), _jsx(UserSettingsDialog, { open: isUserSettingsOpen, onOpenChange: setIsUserSettingsOpen, username: currentUser?.username ?? 'you', avatarURL: currentUser?.avatar_url ?? null, onUpdated: (username, avatarURL) => {
                        const previous = useAuthStore.getState().user;
                        if (!previous) {
                            return;
                        }
                        useAuthStore.getState().setUser({
                            ...previous,
                            username,
                            avatar_url: avatarURL,
                        });
                        pushToast('Đã cập nhật hồ sơ người dùng.');
                    } })] }) }));
};
//# sourceMappingURL=AppShell.js.map
