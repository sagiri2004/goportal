import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Separator } from '@goportal/ui';
import { ChannelHeader } from '@goportal/feature-channels';
import { Edit, Gift, Hash, Image, MoreHorizontal, Plus, Reply, Smile, Trash2, } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui';
import { mockMessages } from '@goportal/app-core';
import { TextContent } from './components/TextContent';
import { ReplyPreview } from './components/ReplyPreview';
export const DashboardView = () => {
    const { showMembers, setShowMembers, activeChannelId } = useOutletContext();
    const activeChannel = useMemo(() => ({
        id: activeChannelId,
        name: activeChannelId,
        type: 'TEXT',
    }), [activeChannelId]);
    const activeMessages = useMemo(() => mockMessages[activeChannelId] ?? mockMessages.general ?? [], [activeChannelId]);
    const grouped = useMemo(() => {
        const toMinutes = (t) => {
            const [hh, mm] = t.split(':').map((n) => Number(n));
            return (hh || 0) * 60 + (mm || 0);
        };
        return activeMessages.map((m, idx) => {
            const prev = activeMessages[idx - 1];
            const sameAuthor = prev && prev.authorId === m.authorId;
            const within5 = prev && Math.abs(toMinutes(m.timestamp) - toMinutes(prev.timestamp)) <= 5;
            const startsGroup = !(sameAuthor && within5);
            return { ...m, startsGroup };
        });
    }, [activeMessages]);
    const actionButtons = [
        { icon: Smile, label: 'Add Reaction' },
        { icon: Reply, label: 'Reply' },
        { icon: Edit, label: 'Edit' },
        { icon: Trash2, label: 'Delete' },
        { icon: MoreHorizontal, label: 'More' },
    ];
    return (_jsxs("div", { className: "h-full flex flex-col overflow-hidden", children: [_jsx("div", { className: "flex-none", children: _jsx(ChannelHeader, { channel: activeChannel, topic: "Welcome to the channel", showMembers: showMembers, onToggleMembers: () => setShowMembers((v) => !v) }) }), _jsxs("section", { className: "flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent", children: [_jsxs("div", { className: "py-4", children: [_jsx(Hash, { className: "w-16 h-16 p-3 rounded-full bg-muted text-muted-foreground mb-4" }), _jsxs("h2", { className: "text-2xl font-bold text-foreground", children: ["Welcome to #", activeChannel?.name ?? 'general'] }), _jsxs("p", { className: "text-muted-foreground text-sm", children: ["This is the start of #", activeChannel?.name ?? 'general', " channel."] })] }), _jsxs("div", { className: "flex items-center gap-3 my-4", children: [_jsx(Separator, { className: "flex-1" }), _jsx("span", { className: "text-xs text-muted-foreground whitespace-nowrap", children: "Today" }), _jsx(Separator, { className: "flex-1" })] }), _jsx("div", { className: "space-y-1", children: grouped.map((msg) => {
                            const username = msg.author ?? 'unknown';
                            const avatarLetter = msg.avatarInitials ?? username[0]?.toUpperCase() ?? '?';
                            if (msg.startsGroup) {
                                return (_jsxs("div", { className: "relative group", children: [msg.replyTo && _jsx(ReplyPreview, { replyTo: msg.replyTo }), _jsxs("div", { className: "flex gap-3 px-2 py-1 rounded-md hover:bg-white/5", children: [msg.avatarUrl ? (_jsx("img", { src: msg.avatarUrl, alt: username, className: "mt-0.5 h-10 w-10 flex-shrink-0 rounded-full object-cover" })) : (_jsx("div", { className: `mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${msg.avatarColor ?? 'bg-muted'}`, children: avatarLetter })), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-baseline", children: [_jsx("span", { className: `text-sm font-semibold ${msg.authorColor ?? 'text-foreground'}`, children: username }), _jsx("span", { className: "text-xs text-muted-foreground ml-2", children: msg.timestamp })] }), _jsx(TextContent, { content: msg.content, className: "text-foreground" })] })] }), _jsx("div", { className: "hidden group-hover:flex absolute right-2 top-1 bg-card border border-border rounded-md shadow-sm px-1 gap-0.5", children: actionButtons.map(({ icon: Icon, label }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150", type: "button", children: _jsx(Icon, { className: "w-4 h-4" }) }) }), _jsx(TooltipContent, { children: label })] }, label))) })] }, msg.id));
                            }
                            return (_jsxs("div", { className: "relative group pl-[52px] py-0.5 rounded-md hover:bg-white/5", children: [msg.replyTo && _jsx(ReplyPreview, { replyTo: msg.replyTo }), _jsx(TextContent, { content: msg.content, className: "text-foreground" }), _jsx("div", { className: "hidden group-hover:flex absolute right-2 top-0 bg-card border border-border rounded-md shadow-sm px-1 gap-0.5", children: actionButtons.map(({ icon: Icon, label }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150", type: "button", children: _jsx(Icon, { className: "w-4 h-4" }) }) }), _jsx(TooltipContent, { children: label })] }, label))) })] }, msg.id));
                        }) })] }), _jsx("footer", { className: "flex-none mx-4 mb-4", children: _jsxs("div", { className: "rounded-lg bg-[hsl(240,3.7%,18%)] flex items-center px-3 gap-2", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground", type: "button", children: _jsx(Plus, { className: "w-5 h-5 text-muted-foreground hover:text-foreground" }) }) }), _jsx(TooltipContent, { children: "Add Attachment" })] }), _jsx("input", { className: "flex-1 bg-transparent text-[15px] py-[11px] outline-none placeholder:text-muted-foreground", placeholder: "Message" }), _jsx("div", { className: "flex gap-1 items-center", children: [
                                { icon: Gift, label: 'Gift' },
                                { icon: Image, label: 'GIF' },
                                { icon: Smile, label: 'Emoji' },
                            ].map(({ icon: Icon, label }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground", type: "button", children: _jsx(Icon, { className: "w-5 h-5 text-muted-foreground hover:text-foreground" }) }) }), _jsx(TooltipContent, { children: label })] }, label))) })] }) })] }));
};
//# sourceMappingURL=DashboardView.js.map