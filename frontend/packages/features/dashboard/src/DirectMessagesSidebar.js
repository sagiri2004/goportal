import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { mockUsers } from './mockData';
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui';
const statusDotClass = {
    online: 'bg-green-500',
    idle: 'bg-yellow-400',
    dnd: 'bg-red-500',
    offline: 'bg-zinc-500',
};
export const DirectMessagesSidebar = () => {
    const [activeUserId, setActiveUserId] = useState('u2');
    const dms = useMemo(() => mockUsers.filter((u) => u.id !== 'u1'), []);
    return (_jsxs("aside", { className: "h-full w-full bg-background flex flex-col border-r border-border overflow-hidden", children: [_jsxs("div", { className: "h-12 px-4 flex items-center justify-between border-b border-border shadow-sm", children: [_jsx("span", { className: "text-base font-semibold text-foreground truncate", children: "Direct Messages" }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", className: "cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground", children: _jsx(Plus, { className: "w-4 h-4" }) }) }), _jsx(TooltipContent, { children: "New DM" })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent", children: dms.map((u) => {
                    const isActive = u.id === activeUserId;
                    return (_jsxs("button", { type: "button", onClick: () => setActiveUserId(u.id), className: [
                            'w-full flex items-center gap-2 px-2 py-[6px] rounded-md text-sm group transition-colors',
                            isActive
                                ? 'bg-accent text-foreground font-medium'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        ].join(' '), children: [_jsxs("div", { className: "w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold relative flex-shrink-0", children: [u.username[0]?.toUpperCase(), _jsx("span", { className: [
                                            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2',
                                            'border-[hsl(240,6%,10%)]',
                                            statusDotClass[u.status] ?? statusDotClass.offline,
                                        ].join(' ') })] }), _jsx("span", { className: "truncate flex-1 text-left", children: u.username })] }, u.id));
                }) })] }));
};
//# sourceMappingURL=DirectMessagesSidebar.js.map