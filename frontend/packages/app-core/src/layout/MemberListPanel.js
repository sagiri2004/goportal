import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui';
const statusDotClass = {
    online: 'bg-green-500',
    idle: 'bg-yellow-400',
    dnd: 'bg-red-500',
    offline: 'bg-zinc-500',
};
export const MemberListPanel = ({ members }) => {
    const groups = useMemo(() => {
        const online = members.filter((u) => u.status !== 'offline');
        const offline = members.filter((u) => u.status === 'offline');
        return [
            { label: `ONLINE — ${online.length}`, users: online },
            { label: `OFFLINE — ${offline.length}`, users: offline },
        ].filter((g) => g.users.length > 0);
    }, [members]);
    return (_jsx("div", { className: "h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent", children: groups.map((group) => (_jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase tracking-wide text-muted-foreground px-3 mt-4 mb-1", children: group.label }), _jsx("div", { className: "space-y-0.5", children: group.users.map((u) => (_jsxs("div", { className: "flex items-center gap-2 px-3 py-[6px] rounded-md hover:bg-accent cursor-pointer group", children: [_jsxs("div", { className: `w-8 h-8 rounded-full ${u.color} flex items-center justify-center text-xs font-semibold relative flex-shrink-0 text-white`, children: [u.initials, _jsx("span", { className: [
                                            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2',
                                            'border-[hsl(240,6%,10%)]',
                                            statusDotClass[u.status] ?? statusDotClass.offline,
                                        ].join(' ') })] }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-sm text-muted-foreground group-hover:text-foreground truncate", children: u.name }), _jsx("div", { className: "text-xs text-muted-foreground capitalize", children: u.status })] }), _jsx("div", { className: "ml-auto hidden group-hover:block", children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", className: "cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground", children: _jsx(MoreHorizontal, { className: "w-4 h-4" }) }) }), _jsx(TooltipContent, { children: "More" })] }) })] }, u.id))) })] }, group.label))) }));
};
//# sourceMappingURL=MemberListPanel.js.map