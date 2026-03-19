import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useOutletContext } from 'react-router-dom';
import { mockUsers } from './mockData';
import { Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui';
export const DMView = () => {
    const { showMembers, setShowMembers } = useOutletContext();
    const partner = mockUsers.find((u) => u.id !== 'u1') ?? mockUsers[0];
    return (_jsxs("div", { className: "h-full flex flex-col overflow-hidden", children: [_jsxs("header", { className: "h-12 border-b border-border px-4 flex items-center justify-between bg-background", children: [_jsxs("div", { className: "flex items-center min-w-0", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold flex-shrink-0", children: partner?.username?.[0]?.toUpperCase() ?? '?' }), _jsx("span", { className: "ml-2 font-semibold text-base text-foreground truncate", children: partner?.username ?? 'Direct Message' })] }), _jsx("button", { type: "button", onClick: () => setShowMembers((v) => !v), "aria-pressed": showMembers, className: [
                            'cursor-pointer p-1.5 rounded-md hover:bg-accent transition-colors duration-150',
                            showMembers ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                        ].join(' '), children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("span", { children: _jsx(Users, { className: "w-5 h-5" }) }) }), _jsx(TooltipContent, { children: "Member List" })] }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent", children: _jsx("div", { className: "text-sm text-muted-foreground", children: "DM mode placeholder (messages will be wired later)." }) }), _jsx("footer", { className: "flex-none mx-4 mb-4", children: _jsx("div", { className: "rounded-lg bg-[hsl(240,3.7%,18%)] flex items-center px-3 gap-2", children: _jsx("input", { className: "flex-1 bg-transparent text-[15px] py-[11px] outline-none placeholder:text-muted-foreground", placeholder: `Message @${partner?.username ?? 'user'}` }) }) })] }));
};
//# sourceMappingURL=DMView.js.map