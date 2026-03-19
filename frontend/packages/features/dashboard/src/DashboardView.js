import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Button } from '@goportal/ui';
import { ServerRail, CreateServerModal } from '@goportal/feature-servers';
import { ChannelSidebar, ChannelHeader, CreateChannelModal } from '@goportal/feature-channels';
import { useChannel } from '@goportal/feature-channels';
import { mockCurrentUser, mockMessages, mockUsers } from './mockData';
export const DashboardView = ({ onLogout }) => {
    const [activeServerId, setActiveServerId] = useState('s1');
    const [activeChannelId, setActiveChannelId] = useState('c1');
    const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const { data: activeChannel } = useChannel(activeChannelId);
    const activeMessages = useMemo(() => mockMessages.filter((m) => m.channelId === activeChannelId), [activeChannelId]);
    const activeServerName = useMemo(() => {
        const serverMap = {
            s1: 'Discord Clone Devs',
            s2: 'LiveKit Lab',
            s3: 'Friends',
        };
        return serverMap[activeServerId] || 'Server';
    }, [activeServerId]);
    return (_jsxs("div", { className: "h-screen flex", children: [_jsx(ServerRail, { activeServerId: activeServerId, onSelectServer: setActiveServerId, onCreateServer: () => setIsCreateServerOpen(true) }), _jsx(ChannelSidebar, { serverId: activeServerId, serverName: activeServerName, activeChannelId: activeChannelId, onSelectChannel: setActiveChannelId, onCreateChannel: () => setIsCreateChannelOpen(true) }), _jsxs("main", { className: "flex-1 bg-background flex flex-col", children: [_jsx(ChannelHeader, { channel: activeChannel }), _jsx("section", { className: "flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm", children: activeMessages.map((msg) => {
                            const author = mockUsers.find((u) => u.id === msg.authorId);
                            return (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5", style: { backgroundColor: author?.avatarColor ?? '#27272a' }, children: author?.username[0]?.toUpperCase() }), _jsxs("div", { className: "space-y-0.5", children: [_jsxs("div", { className: "flex items-baseline gap-2", children: [_jsx("span", { className: "font-semibold text-foreground text-sm", children: author?.username ?? 'unknown' }), _jsx("span", { className: "text-[11px] text-muted-foreground", children: msg.timestamp })] }), _jsx("p", { className: "text-foreground", children: msg.content })] })] }, msg.id));
                        }) }), _jsx("footer", { className: "h-16 px-4 pb-4 flex items-end", children: _jsxs("div", { className: "w-full bg-card/80 rounded-md border border-border px-3 py-2 text-sm text-foreground flex items-center", children: [_jsx("span", { className: "text-muted-foreground mr-2", children: "Message" }), _jsx("span", { className: "text-muted-foreground text-xs", children: "(input disabled in mock)" })] }) })] }), _jsxs("aside", { className: "w-60 bg-[hsl(240,6%,10%)] border-l border-border flex flex-col", children: [_jsxs("div", { className: "h-12 border-b border-border px-3 flex items-center text-xs font-semibold text-muted-foreground", children: ["MEMBERS \u2014 ", mockUsers.length] }), _jsx("div", { className: "flex-1 overflow-y-auto px-3 py-3 space-y-2 text-xs", children: mockUsers.map((u) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold", style: { backgroundColor: u.avatarColor }, children: u.username[0]?.toUpperCase() }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-foreground text-xs", children: u.username }), _jsx("span", { className: "text-muted-foreground text-[10px] capitalize", children: u.status })] })] }, u.id))) })] }), _jsx(CreateServerModal, { isOpen: isCreateServerOpen, onOpenChange: setIsCreateServerOpen }), _jsx(CreateChannelModal, { serverId: activeServerId, isOpen: isCreateChannelOpen, onOpenChange: setIsCreateChannelOpen }), _jsxs("div", { className: "absolute bottom-0 right-0 w-60 h-16 bg-[hsl(240,6%,10%)] border-t border-border border-l px-3 py-2 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold", style: { backgroundColor: mockCurrentUser.avatarColor }, children: mockCurrentUser.username[0]?.toUpperCase() }), _jsxs("div", { className: "flex flex-col", children: [_jsx("div", { className: "text-foreground text-xs truncate", children: mockCurrentUser.username }), _jsx("div", { className: "text-muted-foreground text-[10px]", children: "Online" })] })] }), _jsx(Button, { variant: "ghost", size: "sm", className: "text-xs", onClick: onLogout, children: "Log out" })] })] }));
};
//# sourceMappingURL=DashboardView.js.map