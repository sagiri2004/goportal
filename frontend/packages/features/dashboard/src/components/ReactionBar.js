import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui';
export const ReactionBar = ({ reactions, onToggleReaction, }) => {
    if (reactions.length === 0) {
        return null;
    }
    return (_jsx("div", { className: "mt-1.5 flex flex-wrap gap-1", children: reactions.map((reaction) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("button", { type: "button", onClick: () => onToggleReaction(reaction.emoji), className: cn('flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 text-xs transition-colors duration-100', reaction.hasReacted
                            ? 'border-indigo-500/50 bg-indigo-500/15 hover:bg-indigo-500/25'
                            : 'border-[hsl(240,4%,22%)] bg-[hsl(240,4%,16%)] hover:border-[hsl(240,4%,28%)] hover:bg-[hsl(240,4%,22%)]'), children: [_jsx("span", { className: "text-[14px] leading-none", children: reaction.emoji }), _jsx("span", { className: cn('text-[12px] font-semibold leading-none', reaction.hasReacted ? 'text-indigo-300' : 'text-muted-foreground'), children: reaction.count })] }) }), _jsx(TooltipContent, { children: _jsxs("p", { className: "text-xs", children: [reaction.userIds.slice(0, 3).join(', '), reaction.userIds.length > 3 ? ` +${reaction.userIds.length - 3}` : '', " reacted"] }) })] }, reaction.emoji))) }));
};
//# sourceMappingURL=ReactionBar.js.map