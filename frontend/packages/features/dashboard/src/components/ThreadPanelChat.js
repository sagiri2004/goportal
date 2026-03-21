import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useMemo, useRef, useState } from 'react';
import { Separator, cn, Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui';
import { Edit, FileText, Gift, Hash, Image, MoreHorizontal, Plus, Reply, Smile, Trash2, X, Loader2, } from 'lucide-react';
import { mockMessages, sendMessage, uploadMessageAttachment } from '@goportal/app-core';
import { TextContent } from './TextContent';
import { ReplyPreview } from './ReplyPreview';
import { ImageAttachment } from './ImageAttachment';
import { FileAttachment } from './FileAttachment';
import { ReactionBar } from './ReactionBar';
import { VideoAttachment } from './VideoAttachment';
import { EmojiPicker } from './EmojiPicker';
export const ThreadPanelChat = ({ channelName, channelId }) => {
    const [messagesByChannel, setMessagesByChannel] = useState(mockMessages);
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [composerHasContent, setComposerHasContent] = useState(false);
    const [uploadProgressByFile, setUploadProgressByFile] = useState({});
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const [composerError, setComposerError] = useState(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const activeChannelKey = useMemo(() => (messagesByChannel[channelName] ? channelName : 'general'), [channelName, messagesByChannel]);
    const activeMessages = useMemo(() => messagesByChannel[activeChannelKey] ?? [], [activeChannelKey, messagesByChannel]);
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
        { icon: Reply, label: 'Reply' },
        { icon: Edit, label: 'Edit' },
        { icon: Trash2, label: 'Delete' },
        { icon: MoreHorizontal, label: 'More' },
    ];
    const updateComposerState = useCallback(() => {
        const content = inputRef.current?.innerText.trim() ?? '';
        setComposerHasContent(content.length > 0);
    }, []);
    const toggleReaction = (messageId, emoji) => {
        const currentUserId = 'you';
        setMessagesByChannel((prev) => {
            const messages = prev[activeChannelKey] ?? [];
            const nextMessages = messages.map((message) => {
                if (message.id !== messageId)
                    return message;
                const currentReactions = message.reactions ?? [];
                const reactionIndex = currentReactions.findIndex((reaction) => reaction.emoji === emoji);
                if (reactionIndex === -1) {
                    return {
                        ...message,
                        reactions: [
                            ...currentReactions,
                            { emoji, count: 1, hasReacted: true, userIds: [currentUserId] },
                        ],
                    };
                }
                const reaction = currentReactions[reactionIndex];
                const nextHasReacted = !reaction.hasReacted;
                const nextCount = Math.max(0, reaction.count + (nextHasReacted ? 1 : -1));
                const nextUserIds = nextHasReacted
                    ? Array.from(new Set([...reaction.userIds, currentUserId]))
                    : reaction.userIds.filter((id) => id !== currentUserId);
                const nextReactions = currentReactions
                    .map((item, index) => index === reactionIndex
                    ? {
                        ...reaction,
                        hasReacted: nextHasReacted,
                        count: nextCount,
                        userIds: nextUserIds,
                    }
                    : item)
                    .filter((item) => item.count > 0);
                return {
                    ...message,
                    reactions: nextReactions,
                };
            });
            return {
                ...prev,
                [activeChannelKey]: nextMessages,
            };
        });
    };
    const onSend = useCallback(async () => {
        const content = inputRef.current?.innerText.trim() ?? '';
        if (!content && pendingFiles.length === 0)
            return;
        if (!channelId)
            return;
        try {
            setComposerError(null);
            setIsUploadingFiles(true);
            const attachmentIDs = await Promise.all(pendingFiles.map(async (file, index) => {
                const key = `${file.name}-${file.size}-${index}`;
                const uploaded = await uploadMessageAttachment(file, (progress) => {
                    setUploadProgressByFile((prev) => ({ ...prev, [key]: progress }));
                });
                return uploaded.attachmentId;
            }));
            const created = await sendMessage(channelId, content, attachmentIDs);
            setMessagesByChannel((prev) => {
                const currentMessages = prev[activeChannelKey] ?? [];
                return {
                    ...prev,
                    [activeChannelKey]: [...currentMessages, created],
                };
            });
            if (inputRef.current) {
                inputRef.current.innerText = '';
            }
            setPendingFiles([]);
            setComposerHasContent(false);
        }
        catch (error) {
            setComposerError(error instanceof Error ? error.message : 'Failed to send message.');
        }
        finally {
            setUploadProgressByFile({});
            setIsUploadingFiles(false);
        }
    }, [activeChannelKey, channelId, pendingFiles]);
    const handleKeyDown = useCallback(async (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            await onSend();
        }
    }, [onSend]);
    const insertEmoji = useCallback((emoji) => {
        const el = inputRef.current;
        if (!el)
            return;
        el.focus();
        document.execCommand('insertText', false, emoji);
        updateComposerState();
    }, [updateComposerState]);
    const canSend = (composerHasContent || pendingFiles.length > 0) && !isUploadingFiles;
    const pendingImagePreviewUrls = useMemo(() => pendingFiles.map((file) => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null)), [pendingFiles]);
    return (_jsxs(_Fragment, { children: [_jsxs("section", { className: "flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent", children: [_jsxs("div", { className: "py-4", children: [_jsx(Hash, { className: "mb-4 h-14 w-14 rounded-full bg-muted p-3 text-muted-foreground" }), _jsxs("h2", { className: "text-xl font-bold text-foreground", children: ["Welcome to #", channelName] }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["This is the start of #", channelName, " channel."] })] }), _jsxs("div", { className: "my-4 flex items-center gap-3", children: [_jsx(Separator, { className: "flex-1" }), _jsx("span", { className: "whitespace-nowrap text-xs text-muted-foreground", children: "Today" }), _jsx(Separator, { className: "flex-1" })] }), _jsx("div", { className: "space-y-1", children: grouped.map((msg) => {
                            const username = msg.author ?? 'unknown';
                            const avatarLetter = msg.avatarInitials ?? username[0]?.toUpperCase() ?? '?';
                            const imageAttachments = (msg.attachments ?? []).filter((a) => a.type === 'image' || a.type === 'gif');
                            const videoAttachments = (msg.attachments ?? []).filter((a) => a.type === 'video');
                            const fileAttachments = (msg.attachments ?? []).filter((a) => a.type === 'file' || a.type === 'audio');
                            const reactions = msg.reactions ?? [];
                            if (msg.startsGroup) {
                                return (_jsxs("div", { className: "group relative overflow-visible", children: [msg.replyTo && _jsx(ReplyPreview, { replyTo: msg.replyTo }), _jsxs("div", { className: "flex gap-3 rounded-md px-2 py-1 hover:bg-white/5", children: [msg.avatarUrl ? (_jsx("img", { src: msg.avatarUrl, alt: username, className: "mt-0.5 h-9 w-9 flex-shrink-0 rounded-full object-cover" })) : (_jsx("div", { className: `mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${msg.avatarColor ?? 'bg-muted'}`, children: avatarLetter })), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-baseline", children: [_jsx("span", { className: `text-sm font-semibold ${msg.authorColor ?? 'text-foreground'}`, children: username }), _jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: msg.timestamp })] }), _jsx(TextContent, { content: msg.content, className: "text-foreground" }), imageAttachments.length > 0 && _jsx(ImageAttachment, { attachments: imageAttachments }), videoAttachments.map((attachment) => _jsx(VideoAttachment, { url: attachment.url }, attachment.id)), fileAttachments.map((attachment) => _jsx(FileAttachment, { attachment: attachment }, attachment.id)), _jsx(ReactionBar, { reactions: reactions, onToggleReaction: (emoji) => toggleReaction(msg.id, emoji) })] })] }), _jsxs("div", { className: cn('absolute right-2 top-1 z-20 overflow-visible rounded-md border border-border bg-card px-1 shadow-sm', reactionPickerMessageId === msg.id ? 'flex gap-0.5' : 'hidden group-hover:flex group-hover:gap-0.5'), children: [_jsx(EmojiPicker, { open: reactionPickerMessageId === msg.id, onOpenChange: (open) => setReactionPickerMessageId(open ? msg.id : null), onSelect: (emoji) => toggleReaction(msg.id, emoji), trigger: (_jsx("button", { className: "flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", type: "button", children: _jsx(Smile, { className: "h-4 w-4" }) })) }), actionButtons.map(({ icon: Icon, label }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", type: "button", children: _jsx(Icon, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: label })] }, label)))] })] }, msg.id));
                            }
                            return (_jsxs("div", { className: "group relative overflow-visible rounded-md py-0.5 pl-[48px] hover:bg-white/5", children: [msg.replyTo && _jsx(ReplyPreview, { replyTo: msg.replyTo }), _jsx(TextContent, { content: msg.content, className: "text-foreground" }), imageAttachments.length > 0 && _jsx(ImageAttachment, { attachments: imageAttachments }), videoAttachments.map((attachment) => _jsx(VideoAttachment, { url: attachment.url }, attachment.id)), fileAttachments.map((attachment) => _jsx(FileAttachment, { attachment: attachment }, attachment.id)), _jsx(ReactionBar, { reactions: reactions, onToggleReaction: (emoji) => toggleReaction(msg.id, emoji) }), _jsxs("div", { className: cn('absolute right-2 top-0 z-20 overflow-visible rounded-md border border-border bg-card px-1 shadow-sm', reactionPickerMessageId === msg.id ? 'flex gap-0.5' : 'hidden group-hover:flex group-hover:gap-0.5'), children: [_jsx(EmojiPicker, { open: reactionPickerMessageId === msg.id, onOpenChange: (open) => setReactionPickerMessageId(open ? msg.id : null), onSelect: (emoji) => toggleReaction(msg.id, emoji), trigger: (_jsx("button", { className: "flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", type: "button", children: _jsx(Smile, { className: "h-4 w-4" }) })) }), actionButtons.map(({ icon: Icon, label }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", type: "button", children: _jsx(Icon, { className: "h-4 w-4" }) }) }), _jsx(TooltipContent, { children: label })] }, label)))] })] }, msg.id));
                        }) })] }), _jsx("footer", { className: "mx-3 mb-3 flex-none", children: _jsxs("div", { className: `relative rounded-lg bg-[hsl(240,3.7%,18%)] ${canSend ? 'ring-1 ring-indigo-500/30' : ''}`, children: [_jsx("input", { ref: fileInputRef, type: "file", className: "hidden", multiple: true, onChange: (event) => {
                                const files = Array.from(event.target.files ?? []);
                                setPendingFiles((prev) => [...prev, ...files]);
                            }, disabled: isUploadingFiles }), pendingFiles.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 px-3 pt-2", children: pendingFiles.map((file, index) => (_jsxs("div", { className: "group relative", children: [file.type.startsWith('image/') ? (_jsx("img", { src: pendingImagePreviewUrls[index] ?? undefined, alt: file.name, className: "h-14 w-14 rounded-md border border-border object-cover" })) : (_jsx("div", { className: "flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-md border border-border bg-[hsl(240,4%,18%)]", children: _jsx(FileText, { className: "h-4 w-4 text-muted-foreground" }) })), _jsx("button", { type: "button", onClick: () => setPendingFiles((prev) => prev.filter((_, i) => i !== index)), disabled: isUploadingFiles, className: "absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex", children: _jsx(X, { className: "h-2.5 w-2.5" }) })] }, `${file.name}-${index}`))) })), isUploadingFiles && (_jsxs("div", { className: "px-3 pb-2 text-xs text-muted-foreground", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }), _jsx("span", { children: "Uploading attachments..." })] }), pendingFiles.map((file, index) => {
                                    const key = `${file.name}-${file.size}-${index}`;
                                    const progress = uploadProgressByFile[key] ?? 0;
                                    return (_jsxs("p", { className: "truncate", children: [file.name, ": ", progress, "%"] }, key));
                                })] })), composerError && _jsx("p", { className: "px-3 pb-2 text-xs text-red-400", children: composerError }), _jsxs("div", { className: "flex items-end gap-2 px-3", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", type: "button", onClick: () => fileInputRef.current?.click(), disabled: isUploadingFiles, children: _jsx(Plus, { className: "h-5 w-5" }) }) }), _jsx(TooltipContent, { children: "Add Attachment" })] }), _jsx("div", { ref: inputRef, contentEditable: true, suppressContentEditableWarning: true, onKeyDown: handleKeyDown, onInput: updateComposerState, className: "min-h-[44px] min-w-0 flex-1 overflow-y-auto break-words bg-transparent py-[11px] text-[15px] text-foreground outline-none", "data-placeholder": `Nhắn #${channelName}` }), _jsxs("div", { className: "flex items-center gap-1 pb-2", children: [[
                                            { icon: Gift, label: 'Gift' },
                                            { icon: Image, label: 'GIF' },
                                        ].map(({ icon: Icon, label }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", type: "button", children: _jsx(Icon, { className: "h-5 w-5" }) }) }), _jsx(TooltipContent, { children: label })] }, label))), _jsx(EmojiPicker, { align: "end", onSelect: insertEmoji, trigger: (_jsx("button", { className: "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", type: "button", children: _jsx(Smile, { className: "h-5 w-5" }) })) })] })] })] }) })] }));
};
//# sourceMappingURL=ThreadPanelChat.js.map