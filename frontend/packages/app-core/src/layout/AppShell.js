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
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, } from 'react-resizable-panels';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, TooltipProvider, } from '@goportal/ui';
import { CreateServerModal, ServerRail } from '@goportal/feature-servers';
import { ChannelSidebar, CreateChannelModal } from '@goportal/feature-channels';
import { DirectMessagesSidebar } from '@goportal/feature-dashboard';
import { useAuthStore } from '@goportal/store';
import { Copy } from 'lucide-react';
import { MemberListPanel } from './MemberListPanel';
import { ServerSettingsOverlay } from './ServerSettingsOverlay';
import { createChannel, createServerInvite, createServer, getChannels, getMembers, getServerById, getServers, updateServerProfile, uploadServerMedia, updateMyProfile, uploadUserAvatar, } from '../services';
// ─── Panel size constants (% of PanelGroup width, must sum ≤ 100) ────────────
const SIZE = {
    sidebar: { default: 22, min: 18, max: 35 },
    mainWithMembers: 56, // 22 + 56 + 22 = 100
    mainAlone: 78, // 22 + 78      = 100
    members: { default: 22, min: 15, max: 28 },
};
// ─── Resize handle ────────────────────────────────────────────────────────────
export const ResizeHandle = () => (_jsx(PanelResizeHandle, { className: "group relative w-[6px] flex-shrink-0 cursor-col-resize bg-transparent", children: _jsx("div", { className: "absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-indigo-500/60 group-active:bg-indigo-500" }) }));
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
            const nextLink = `${window.location.origin}/invite/${invite.code}`;
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
    const [activeServerId, setActiveServerId] = useState('');
    const [activeChannelId, setActiveChannelId] = useState('');
    const [showMembers, setShowMembers] = useState(false);
    const [servers, setServers] = useState([]);
    const [isCreateServerModalOpen, setIsCreateServerModalOpen] = useState(false);
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
    const [voiceState, setVoiceState] = useState(null);
    const currentUser = useAuthStore((state) => state.user);
    const currentUsername = currentUser?.username;
    // Imperative handle — resize main panel when member list toggles
    const mainRef = useRef(null);
    const toastTimerRef = useRef(null);
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
        };
    }, []);
    useEffect(() => {
        if (params.serverId) {
            setActiveServerId(params.serverId);
        }
    }, [params.serverId]);
    useEffect(() => {
        if (params.channelId) {
            setActiveChannelId(params.channelId);
        }
    }, [params.channelId]);
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
        if (!isVoiceMode || !activeServerId || !activeChannelId) {
            setVoiceState(null);
            return;
        }
        const categories = channelsByServer[activeServerId] ?? [];
        const voiceChannel = categories
            .flatMap((category) => category.channels)
            .find((channel) => channel.id === activeChannelId);
        const serverName = serverDetails[activeServerId]?.name ??
            servers.find((server) => server.id === activeServerId)?.name ??
            'Server';
        setVoiceState({
            channelId: activeChannelId,
            channelName: voiceChannel?.name ?? activeChannelId,
            serverId: activeServerId,
            serverName,
        });
    }, [activeChannelId, activeServerId, channelsByServer, isVoiceMode, serverDetails, servers]);
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
                const fallbackChannel = availableChannels[0];
                setActiveChannelId(fallbackChannel.id);
                navigate(`/app/servers/${activeServerId}/channels/${fallbackChannel.id}`, { replace: true });
            }
        };
        void loadChannels();
        return () => {
            isCancelled = true;
        };
    }, [activeChannelId, activeServerId, navigate]);
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
    const handleCreateChannel = useCallback(async (payload) => {
        if (!activeServerId) {
            return;
        }
        await createChannel(activeServerId, payload);
        await refreshChannels(activeServerId);
    }, [activeServerId, refreshChannels]);
    const handleLeaveVoiceChannel = useCallback(async () => {
        if (!activeServerId) {
            setVoiceState(null);
            return;
        }
        const channelData = channelsByServer[activeServerId] ?? [];
        const availableChannels = channelData.flatMap((category) => category.channels);
        const firstText = availableChannels.find((channel) => channel.type === 'text')
            ?? availableChannels[0];
        setVoiceState(null);
        if (!firstText) {
            navigate('/app/@me');
            return;
        }
        setActiveChannelId(firstText.id);
        navigate(`/app/servers/${activeServerId}/channels/${firstText.id}`);
    }, [activeServerId, channelsByServer, navigate]);
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
    const activeMembers = useMemo(() => membersByServer[activeServerId] ?? [], [activeServerId, membersByServer]);
    // Context passed to all child routes via <Outlet>
    const outletContext = useMemo(() => ({
        showMembers,
        setShowMembers,
        toggleMembers,
        activeServerId,
        setActiveServerId,
        activeChannelId,
        setActiveChannelId,
        activeCategories,
        serverCount: servers.length,
        shouldShowOnboarding: servers.length === 0 && !hasSeenOnboarding,
        dismissOnboarding: markOnboardingSeen,
        openCreateServerModal: () => setIsCreateServerModalOpen(true),
        showDevelopingToast,
    }), [
        showMembers,
        toggleMembers,
        activeServerId,
        activeChannelId,
        activeCategories,
        servers.length,
        hasSeenOnboarding,
        markOnboardingSeen,
        showDevelopingToast,
    ]);
    return (_jsx(TooltipProvider, { delayDuration: 500, children: _jsxs("div", { className: "flex h-screen w-screen overflow-hidden bg-background text-foreground", children: [_jsx("div", { className: "w-[72px] flex-none overflow-hidden", children: _jsx(ServerRail, { servers: servers, activeServerId: activeServerId, onSelectServer: async (serverId) => {
                            try {
                                await navigateToServerFirstChannel(serverId);
                            }
                            catch {
                                navigate('/app/@me');
                            }
                        }, onCreateServer: () => setIsCreateServerModalOpen(true) }) }), _jsxs(PanelGroup, { orientation: "horizontal", className: "min-w-0 flex-1 overflow-hidden", children: [_jsx(Panel, { id: "sidebar", defaultSize: SIZE.sidebar.default, minSize: SIZE.sidebar.min, maxSize: SIZE.sidebar.max, className: "overflow-hidden", children: _jsx("div", { className: "flex h-full min-w-0 flex-col overflow-hidden", children: isDmMode ? (_jsx(DirectMessagesSidebar, {})) : (_jsx(ChannelSidebar, { serverId: activeServerId, serverName: activeServer?.name ?? 'Server', serverInitials: activeServer?.initials, serverColor: activeServer?.color ?? 'bg-indigo-500', serverBannerUrl: activeServer?.bannerUrl, serverIconUrl: activeServer?.iconUrl, serverBoostLevel: activeServer?.boostLevel, categories: activeCategories, activeChannelId: activeChannelId, onSelectChannel: (channelId, type) => {
                                        setActiveChannelId(channelId);
                                        if (type === 'voice') {
                                            const serverName = activeServer?.name ?? 'Server';
                                            const channel = activeCategories.flatMap((category) => category.channels).find((item) => item.id === channelId);
                                            setVoiceState({
                                                channelId,
                                                channelName: channel?.name ?? channelId,
                                                serverId: activeServerId,
                                                serverName,
                                            });
                                            navigate(`/app/servers/${activeServerId}/voice/${channelId}`);
                                            return;
                                        }
                                        setVoiceState(null);
                                        navigate(`/app/servers/${activeServerId}/channels/${channelId}`);
                                    }, onCreateChannel: () => setIsCreateChannelModalOpen(true), onInviteMember: () => setIsInviteDialogOpen(true), onOpenServerSettings: () => {
                                        setServerSettingsTab('profile');
                                        setIsServerSettingsOpen(true);
                                    }, onOpenServerMembers: () => {
                                        setServerSettingsTab('members');
                                        setIsServerSettingsOpen(true);
                                    }, onOpenUserSettings: () => setIsUserSettingsOpen(true), voiceState: voiceState, onLeaveVoiceChannel: () => void handleLeaveVoiceChannel() })) }) }), _jsx(ResizeHandle, {}), _jsx(Panel, { id: "main", panelRef: mainRef, defaultSize: showMembers ? SIZE.mainWithMembers : SIZE.mainAlone, minSize: 35, maxSize: 120, className: "overflow-hidden", children: _jsx("div", { className: "flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-background", children: _jsx(Outlet, { context: outletContext }) }) }), showMembers && !isVoiceMode && (_jsxs(_Fragment, { children: [_jsx(ResizeHandle, {}), _jsx(Panel, { id: "members", defaultSize: SIZE.members.default, minSize: SIZE.members.min, maxSize: SIZE.members.max, className: "overflow-hidden", children: _jsx("div", { className: "h-full overflow-hidden border-l border-border bg-[hsl(240,6%,10%)]", children: _jsx(MemberListPanel, { members: activeMembers }) }) })] }))] }), _jsx(CreateServerModal, { isOpen: isCreateServerModalOpen, onOpenChange: setIsCreateServerModalOpen, defaultServerName: `Server của ${currentUsername ?? 'bạn'}`, onCreate: handleCreateServer }), activeServerId && (_jsxs(_Fragment, { children: [_jsx(CreateChannelModal, { isOpen: isCreateChannelModalOpen, onOpenChange: setIsCreateChannelModalOpen, onCreate: handleCreateChannel }), _jsx(InviteMemberDialog, { open: isInviteDialogOpen, onOpenChange: setIsInviteDialogOpen, serverId: activeServerId })] })), toastMessage && (_jsx("div", { className: "fixed bottom-4 right-4 z-[100] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-lg", children: toastMessage })), activeServer && isServerSettingsOpen && (_jsx(ServerSettingsOverlay, { open: isServerSettingsOpen, initialTab: serverSettingsTab, serverId: activeServerId, server: activeServer, onClose: () => setIsServerSettingsOpen(false), onServerUpdated: refreshActiveServer, onToast: pushToast })), _jsx(UserSettingsDialog, { open: isUserSettingsOpen, onOpenChange: setIsUserSettingsOpen, username: currentUser?.username ?? 'you', avatarURL: currentUser?.avatar_url ?? null, onUpdated: (username, avatarURL) => {
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