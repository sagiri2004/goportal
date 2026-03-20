import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Separator, Tooltip, TooltipContent, TooltipTrigger, } from '@goportal/ui';
import { getServerInitials } from '../mockData';
import { Plus, Compass, Download } from 'lucide-react';
/**
 * ServerRail - Left sidebar with server list (72px wide)
 *
 * Layout:
 * - Top: Create server button + divider
 * - Middle: Server icons (w-12 h-12, rounded-[24px], active has left accent bar + rounded-[16px])
 * - Bottom: Compass + Download icons
 */
export const ServerRail = ({ activeServerId, onSelectServer = () => { }, onCreateServer = () => { }, servers: serversProp, }) => {
    const servers = serversProp ?? [];
    const [hoveredServerId, setHoveredServerId] = useState(null);
    return (_jsxs("aside", { className: "h-full w-[72px] bg-[hsl(240,10%,6%)] border-r border-border flex flex-col overflow-hidden", children: [_jsxs("div", { className: "flex flex-col items-center gap-3 py-3", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", onClick: onCreateServer, className: "cursor-pointer w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-secondary hover:bg-indigo-500 hover:text-white text-foreground transition-all duration-200", children: _jsx(Plus, { className: "h-5 w-5" }) }) }), _jsx(TooltipContent, { children: "Add Server" })] }), _jsx("div", { className: "w-8 mx-auto", children: _jsx(Separator, { className: "w-8" }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent", children: _jsx("div", { className: "flex flex-col items-center gap-2", children: servers.map((server) => {
                        const isActive = server.id === activeServerId;
                        const isHovered = server.id === hoveredServerId;
                        return (_jsxs("div", { className: "relative w-12 group", onMouseEnter: () => setHoveredServerId(server.id), onMouseLeave: () => setHoveredServerId(null), children: [_jsx("div", { className: [
                                        'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-white transition-all duration-200',
                                        isActive ? 'h-8' : 'h-2 group-hover:h-5',
                                    ].join(' ') }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { onClick: () => onSelectServer(server.id), className: `cursor-pointer w-12 h-12 flex items-center justify-center text-sm font-semibold transition-all duration-200 ${isActive || isHovered
                                                    ? 'rounded-[16px] bg-indigo-500 text-white'
                                                    : 'rounded-[24px] bg-secondary text-foreground hover:bg-indigo-500 hover:text-white hover:rounded-[16px]'}`, type: "button", children: ('initials' in server ? server.initials : undefined) ?? getServerInitials(server.name) }) }), _jsx(TooltipContent, { children: server.name })] })] }, server.id));
                    }) }) }), _jsxs("div", { className: "flex flex-col items-center gap-2 py-3", children: [_jsx(Separator, { className: "w-8 mx-auto my-1" }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", className: "cursor-pointer w-12 h-12 rounded-[24px] hover:rounded-[16px] hover:bg-indigo-500 hover:text-white text-foreground transition-all duration-200", children: _jsx(Compass, { className: "h-5 w-5" }) }) }), _jsx(TooltipContent, { children: "Explore" })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", className: "cursor-pointer w-12 h-12 rounded-[24px] hover:rounded-[16px] hover:bg-indigo-500 hover:text-white text-foreground transition-all duration-200", children: _jsx(Download, { className: "h-5 w-5" }) }) }), _jsx(TooltipContent, { children: "Download" })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("button", { type: "button", className: "cursor-pointer relative w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 bg-secondary hover:bg-indigo-500 hover:text-white text-foreground flex items-center justify-center text-sm font-semibold", children: ["Y", _jsx("span", { className: "absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[hsl(240,10%,6%)]" })] }) }), _jsx(TooltipContent, { children: "You" })] })] })] }));
};
//# sourceMappingURL=ServerRail.js.map