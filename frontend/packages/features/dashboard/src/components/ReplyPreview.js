import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@goportal/ui';
import { Image } from 'lucide-react';
export const ReplyPreview = ({ replyTo }) => {
    return (_jsxs("div", { className: "mb-1 ml-[52px] flex min-w-0 items-center gap-2", children: [_jsx("div", { className: "-mr-1 h-3 w-5 flex-shrink-0 rounded-tl-md border-l-2 border-t-2 border-muted-foreground/30" }), _jsx("div", { className: cn('flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white', replyTo.authorColor ?? 'bg-muted'), children: replyTo.authorName[0]?.toUpperCase() }), _jsx("span", { className: "cursor-pointer flex-shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground", children: replyTo.authorName }), replyTo.hasAttachment && !replyTo.content ? (_jsxs("span", { className: "flex items-center gap-1 text-xs italic text-muted-foreground/70", children: [_jsx(Image, { className: "h-3 w-3" }), " Attachment"] })) : (_jsx("span", { className: "min-w-0 truncate text-xs text-muted-foreground/70", children: replyTo.content }))] }));
};
//# sourceMappingURL=ReplyPreview.js.map