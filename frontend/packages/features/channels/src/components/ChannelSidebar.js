import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useChannels } from '../hooks/useChannels';
import { Button } from '@goportal/ui';
import { Plus, Hash, Volume2 } from 'lucide-react';
/**
 * ChannelSidebar - Left sidebar showing channels for a server
 */
export const ChannelSidebar = ({ serverId, serverName, activeChannelId, onSelectChannel, onCreateChannel, }) => {
    const { data: channels, isLoading } = useChannels(serverId);
    if (isLoading) {
        return (_jsx("aside", { className: "w-60 bg-[hsl(240,6%,10%)] flex flex-col border-r border-border", children: _jsx("div", { className: "text-xs text-muted-foreground p-4", children: "Loading..." }) }));
    }
    const textChannels = channels?.filter(c => c.type === 'TEXT') ?? [];
    const voiceChannels = channels?.filter(c => c.type === 'VOICE') ?? [];
    return (_jsxs("aside", { className: "w-60 bg-[hsl(240,6%,10%)] flex flex-col border-r border-border", children: [_jsxs("div", { className: "px-4 py-3 border-b border-border flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-semibold text-foreground truncate", children: serverName }), _jsx(Button, { variant: "ghost", size: "icon", onClick: onCreateChannel, className: "h-6 w-6 text-muted-foreground hover:text-foreground", title: "Create Channel", children: _jsx(Plus, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-2 py-3 space-y-4 text-xs", children: [textChannels.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "uppercase tracking-wide px-2 text-[10px] text-muted-foreground font-semibold mb-2", children: "Text Channels" }), _jsx("div", { className: "space-y-1", children: textChannels.map((channel) => {
                                    const isActive = channel.id === activeChannelId;
                                    return (_jsxs("button", { onClick: () => onSelectChannel(channel.id), className: `w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors ${isActive
                                            ? 'bg-accent text-accent-foreground'
                                            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`, children: [_jsx(Hash, { className: "w-4 h-4 flex-shrink-0" }), _jsx("span", { className: "truncate", children: channel.name })] }, channel.id));
                                }) })] })), voiceChannels.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "uppercase tracking-wide px-2 text-[10px] text-muted-foreground font-semibold mb-2", children: "Voice Channels" }), _jsx("div", { className: "space-y-1", children: voiceChannels.map((channel) => {
                                    const isActive = channel.id === activeChannelId;
                                    return (_jsxs("button", { onClick: () => onSelectChannel(channel.id), className: `w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors ${isActive
                                            ? 'bg-accent text-accent-foreground'
                                            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`, children: [_jsx(Volume2, { className: "w-4 h-4 flex-shrink-0" }), _jsx("span", { className: "truncate", children: channel.name })] }, channel.id));
                                }) })] }))] })] }));
};
//# sourceMappingURL=ChannelSidebar.js.map