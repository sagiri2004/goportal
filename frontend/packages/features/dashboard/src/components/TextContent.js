import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@goportal/ui';
const emojiLookup = {
    smile: '😄',
    joy: '😂',
    heart: '❤️',
    thumbs_up: '👍',
    fire: '🔥',
    tada: '🎉',
    thinking: '🤔',
};
const transformSegments = (segments, pattern, type, pickValue = (match) => match[1] ?? match[0]) => {
    const next = [];
    segments.forEach((segment) => {
        if (segment.type !== 'text') {
            next.push(segment);
            return;
        }
        let lastIndex = 0;
        let match = pattern.exec(segment.value);
        while (match) {
            if (match.index > lastIndex) {
                next.push({ type: 'text', value: segment.value.slice(lastIndex, match.index) });
            }
            next.push({ type, value: pickValue(match) });
            lastIndex = match.index + match[0].length;
            match = pattern.exec(segment.value);
        }
        if (lastIndex < segment.value.length) {
            next.push({ type: 'text', value: segment.value.slice(lastIndex) });
        }
    });
    return next;
};
const parseContent = (content) => {
    let segments = [{ type: 'text', value: content }];
    segments = transformSegments(segments, /\*\*([^*]+)\*\*/g, 'bold');
    segments = transformSegments(segments, /(\*[^*\n]+\*|_[^_\n]+_)/g, 'italic', (match) => match[0].slice(1, -1));
    segments = transformSegments(segments, /~~([^~]+)~~/g, 'strike');
    segments = transformSegments(segments, /`([^`]+)`/g, 'code');
    segments = transformSegments(segments, /@([a-zA-Z0-9_.-]+)/g, 'mention', (match) => `@${match[1]}`);
    segments = transformSegments(segments, /#([a-zA-Z0-9_-]+)/g, 'channel', (match) => `#${match[1]}`);
    segments = transformSegments(segments, /(https?:\/\/[^\s]+)/g, 'url', (match) => match[1]);
    segments = transformSegments(segments, /:([a-zA-Z0-9_+-]+):/g, 'emoji', (match) => match[1]);
    return segments;
};
const renderSegment = (segment, index) => {
    switch (segment.type) {
        case 'bold':
            return _jsx("strong", { children: segment.value }, index);
        case 'italic':
            return _jsx("em", { children: segment.value }, index);
        case 'strike':
            return _jsx("del", { children: segment.value }, index);
        case 'code':
            return (_jsx("code", { className: "rounded bg-[hsl(240,4%,18%)] px-1 py-0.5 font-mono text-[13px] text-[hsl(35,85%,75%)]", children: segment.value }, index));
        case 'mention':
            return (_jsx("span", { className: "cursor-pointer rounded bg-indigo-500/25 px-0.5 text-indigo-300 hover:bg-indigo-500/40", children: segment.value }, index));
        case 'channel':
            return (_jsx("span", { className: "cursor-pointer text-indigo-300 hover:underline", children: segment.value }, index));
        case 'url':
            return (_jsx("a", { href: segment.value, target: "_blank", rel: "noreferrer noopener", className: "text-indigo-400 hover:underline", children: segment.value }, index));
        case 'emoji': {
            const resolved = emojiLookup[segment.value] ?? `:${segment.value}:`;
            return _jsx(React.Fragment, { children: resolved }, index);
        }
        default:
            return _jsx(React.Fragment, { children: segment.value }, index);
    }
};
export const TextContent = ({ content, className }) => {
    const segments = parseContent(content);
    return (_jsx("span", { className: cn('text-[15px] leading-relaxed whitespace-pre-wrap break-words', className), children: segments.map(renderSegment) }));
};
//# sourceMappingURL=TextContent.js.map