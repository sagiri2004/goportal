import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
import { TooltipProvider } from '@goportal/ui';
import { ServerRail } from '@goportal/feature-servers';
import { ChannelSidebar } from '@goportal/feature-channels';
import { DirectMessagesSidebar } from '@goportal/feature-dashboard';
import { MemberListPanel } from './MemberListPanel';
import { createChannel, createServer, getChannels, getMembers, getServerById, getServers, } from '../services';
// ─── Panel size constants (% of PanelGroup width, must sum ≤ 100) ────────────
const SIZE = {
    sidebar: { default: 22, min: 18, max: 35 },
    mainWithMembers: 56, // 22 + 56 + 22 = 100
    mainAlone: 78, // 22 + 78      = 100
    members: { default: 22, min: 15, max: 28 },
};
// ─── Resize handle ────────────────────────────────────────────────────────────
export const ResizeHandle = () => (_jsx(PanelResizeHandle, { className: "group relative w-[6px] flex-shrink-0 cursor-col-resize bg-transparent", children: _jsx("div", { className: "absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-indigo-500/60 group-active:bg-indigo-500" }) }));
// ─── AppShell ─────────────────────────────────────────────────────────────────
export const AppShell = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();
    const isDmMode = useMemo(() => location.pathname.includes('/app/@me'), [location.pathname]);
    const isVoiceMode = useMemo(() => location.pathname.includes('/app/servers/') && location.pathname.includes('/voice/'), [location.pathname]);
    const [activeServerId, setActiveServerId] = useState('1');
    const [activeChannelId, setActiveChannelId] = useState('general');
    const [showMembers, setShowMembers] = useState(false);
    const [servers, setServers] = useState([]);
    const [serverDetails, setServerDetails] = useState({});
    const [channelsByServer, setChannelsByServer] = useState({});
    const [membersByServer, setMembersByServer] = useState({});
    // Imperative handle — resize main panel when member list toggles
    const mainRef = useRef(null);
    // After showMembers flips, imperatively resize main panel.
    // useEffect runs after render so mainRef is guaranteed to be attached.
    useEffect(() => {
        const target = showMembers ? SIZE.mainWithMembers : SIZE.mainAlone;
        mainRef.current?.resize(target);
    }, [showMembers]);
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
        if (isVoiceMode) {
            setShowMembers(false);
        }
    }, [isVoiceMode]);
    useEffect(() => {
        let isCancelled = false;
        const loadServers = async () => {
            const data = await getServers();
            if (isCancelled) {
                return;
            }
            setServers(data);
            if (data.length === 0) {
                return;
            }
            const paramServerId = params.serverId;
            const nextServerId = paramServerId && data.some((server) => server.id === paramServerId)
                ? paramServerId
                : data[0].id;
            setActiveServerId(nextServerId);
            if (!paramServerId || paramServerId !== nextServerId || location.pathname === '/app') {
                navigate(`/app/servers/${nextServerId}/channels/general`, { replace: true });
            }
        };
        void loadServers();
        return () => {
            isCancelled = true;
        };
    }, [location.pathname, navigate, params.serverId]);
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
    }), [showMembers, toggleMembers, activeServerId, activeChannelId]);
    return (_jsx(TooltipProvider, { delayDuration: 500, children: _jsxs("div", { className: "flex h-screen w-screen overflow-hidden bg-background text-foreground", children: [_jsx("div", { className: "w-[72px] flex-none overflow-hidden", children: _jsx(ServerRail, { servers: servers, activeServerId: activeServerId, onSelectServer: (serverId) => {
                            setActiveServerId(serverId);
                            setActiveChannelId('general');
                            navigate(`/app/servers/${serverId}/channels/general`);
                        }, onCreateServer: async () => {
                            const name = window.prompt('Server name');
                            if (!name || !name.trim()) {
                                return;
                            }
                            const created = await createServer({
                                name: name.trim(),
                                is_public: true,
                            });
                            setServers((prev) => [...prev, created]);
                            setActiveServerId(created.id);
                            setActiveChannelId('general');
                            navigate(`/app/servers/${created.id}/channels/general`);
                        } }) }), _jsxs(PanelGroup, { orientation: "horizontal", className: "min-w-0 flex-1 overflow-hidden", children: [_jsx(Panel, { id: "sidebar", defaultSize: SIZE.sidebar.default, minSize: SIZE.sidebar.min, maxSize: SIZE.sidebar.max, className: "overflow-hidden", children: _jsx("div", { className: "flex h-full min-w-0 flex-col overflow-hidden", children: isDmMode ? (_jsx(DirectMessagesSidebar, {})) : (_jsx(ChannelSidebar, { serverId: activeServerId, serverName: activeServer?.name ?? 'Server', serverInitials: activeServer?.initials, serverColor: activeServer?.color ?? 'bg-indigo-500', serverBannerUrl: activeServer?.bannerUrl, serverIconUrl: activeServer?.iconUrl, serverBoostLevel: activeServer?.boostLevel, categories: activeCategories, activeChannelId: activeChannelId, onSelectChannel: (channelId, type) => {
                                        setActiveChannelId(channelId);
                                        if (type === 'voice') {
                                            navigate(`/app/servers/${activeServerId}/voice/${channelId}`);
                                            return;
                                        }
                                        navigate(`/app/servers/${activeServerId}/channels/${channelId}`);
                                    }, onCreateChannel: async () => {
                                        if (!activeServerId) {
                                            return;
                                        }
                                        const name = window.prompt('Channel name');
                                        if (!name || !name.trim()) {
                                            return;
                                        }
                                        await createChannel(activeServerId, {
                                            name: name.trim(),
                                            type: 'TEXT',
                                        });
                                        const refreshed = await getChannels(activeServerId);
                                        setChannelsByServer((prev) => ({
                                            ...prev,
                                            [activeServerId]: refreshed.categories,
                                        }));
                                    }, isInVoiceChannel: isVoiceMode, activeVoiceChannelName: activeChannelId })) }) }), _jsx(ResizeHandle, {}), _jsx(Panel, { id: "main", panelRef: mainRef, defaultSize: showMembers ? SIZE.mainWithMembers : SIZE.mainAlone, minSize: 35, maxSize: 120, className: "overflow-hidden", children: _jsx("div", { className: "flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-background", children: _jsx(Outlet, { context: outletContext }) }) }), showMembers && !isVoiceMode && (_jsxs(_Fragment, { children: [_jsx(ResizeHandle, {}), _jsx(Panel, { id: "members", defaultSize: SIZE.members.default, minSize: SIZE.members.min, maxSize: SIZE.members.max, className: "overflow-hidden", children: _jsx("div", { className: "h-full overflow-hidden border-l border-border bg-[hsl(240,6%,10%)]", children: _jsx(MemberListPanel, { members: activeMembers }) }) })] }))] })] }) }));
};
//# sourceMappingURL=AppShell.js.map