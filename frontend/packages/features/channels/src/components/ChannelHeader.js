import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Hash, Volume2 } from 'lucide-react';
/**
 * ChannelHeader - Header for the chat area showing channel name and info
 */
export const ChannelHeader = ({ channel }) => {
    if (!channel) {
        return (_jsx("header", { className: "h-12 border-b border-border px-4 flex items-center justify-between text-sm bg-background", children: _jsx("span", { className: "text-muted-foreground", children: "No channel selected" }) }));
    }
    return (_jsxs("header", { className: "h-12 border-b border-border px-4 flex items-center justify-between text-sm bg-background", children: [_jsxs("div", { className: "flex items-center gap-2", children: [channel.type === 'TEXT' ? (_jsx(Hash, { className: "w-4 h-4 text-muted-foreground" })) : (_jsx(Volume2, { className: "w-4 h-4 text-muted-foreground" })), _jsx("span", { className: "font-semibold text-foreground", children: channel.name })] }), _jsx("div", { className: "text-xs text-muted-foreground", children: channel.type === 'TEXT' ? 'Text Channel' : 'Voice Channel' })] }));
};
//# sourceMappingURL=ChannelHeader.js.map