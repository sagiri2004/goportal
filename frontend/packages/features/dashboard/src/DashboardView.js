import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Separator, cn } from '@goportal/ui';
import { ChannelHeader } from '@goportal/feature-channels';
import { Edit, FileText, Gift, Hash, Image, MoreHorizontal, Plus, Reply, Smile, SmilePlus, Trash2, X, } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui';
import { getMessages, sendMessage } from '@goportal/app-core';
import { useDropzone } from 'react-dropzone';
import { TextContent } from './components/TextContent';
import { ReplyPreview } from './components/ReplyPreview';
import { ImageAttachment } from './components/ImageAttachment';
import { FileAttachment } from './components/FileAttachment';
import { ReactionBar } from './components/ReactionBar';
import { LinkEmbed } from './components/LinkEmbed';
import { VideoAttachment } from './components/VideoAttachment';
import { EmojiPicker } from './components/EmojiPicker';
export const DashboardView = () => {
    const { showMembers, setShowMembers, activeChannelId } = useOutletContext();
    const [messagesByChannel, setMessagesByChannel] = useState({});
    const [pagingByChannel, setPagingByChannel] = useState({});
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
    const messageListRef = useRef(null);
    const inputRef = useRef(null);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [composerHasContent, setComposerHasContent] = useState(false);
    const embedCacheRef = useRef({});
    const embedInFlightRef = useRef({});
    const [autoEmbedsByUrl, setAutoEmbedsByUrl] = useState({});
    const activeChannel = useMemo(() => ({
        id: activeChannelId,
        name: activeChannelId,
        type: 'TEXT',
    }), [activeChannelId]);
    const activeChannelKey = activeChannelId;
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
    useEffect(() => {
        let isCancelled = false;
        const loadInitialMessages = async () => {
            if (!activeChannelId) {
                return;
            }
            const page = await getMessages(activeChannelId, {
                limit: 50,
                offset: 0,
            });
            if (isCancelled) {
                return;
            }
            setMessagesByChannel((prev) => ({
                ...prev,
                [activeChannelId]: page.items,
            }));
            setPagingByChannel((prev) => ({
                ...prev,
                [activeChannelId]: {
                    offset: page.offset + page.items.length,
                    hasMore: page.items.length === 50,
                    isLoadingMore: false,
                },
            }));
        };
        void loadInitialMessages();
        return () => {
            isCancelled = true;
        };
    }, [activeChannelId]);
    const handleScrollToLoadMore = useCallback(async (event) => {
        const container = event.currentTarget;
        if (container.scrollTop > 48) {
            return;
        }
        const pageState = pagingByChannel[activeChannelId];
        if (!pageState || !pageState.hasMore || pageState.isLoadingMore) {
            return;
        }
        setPagingByChannel((prev) => ({
            ...prev,
            [activeChannelId]: {
                ...pageState,
                isLoadingMore: true,
            },
        }));
        const previousHeight = container.scrollHeight;
        const page = await getMessages(activeChannelId, {
            limit: 50,
            offset: pageState.offset,
        });
        setMessagesByChannel((prev) => {
            const current = prev[activeChannelId] ?? [];
            const next = [...page.items, ...current];
            const deduped = next.filter((message, index, all) => all.findIndex((candidate) => candidate.id === message.id) === index);
            return {
                ...prev,
                [activeChannelId]: deduped,
            };
        });
        setPagingByChannel((prev) => ({
            ...prev,
            [activeChannelId]: {
                offset: pageState.offset + page.items.length,
                hasMore: page.items.length === 50,
                isLoadingMore: false,
            },
        }));
        requestAnimationFrame(() => {
            const updatedHeight = container.scrollHeight;
            container.scrollTop = updatedHeight - previousHeight + container.scrollTop;
        });
    }, [activeChannelId, pagingByChannel]);
    const extractFirstUrl = useCallback((text) => {
        const match = text.match(/https?:\/\/[^\s<]+/i);
        return match ? match[0] : null;
    }, []);
    useEffect(() => {
        let isCancelled = false;
        const messagesNeedingEmbed = activeMessages.filter((message) => (!message.embeds || message.embeds.length === 0) && !!extractFirstUrl(message.content));
        messagesNeedingEmbed.forEach((message) => {
            const url = extractFirstUrl(message.content);
            if (!url) {
                return;
            }
            if (embedCacheRef.current[url] !== undefined) {
                const cached = embedCacheRef.current[url];
                if (cached) {
                    setAutoEmbedsByUrl((prev) => (prev[url] ? prev : { ...prev, [url]: cached }));
                }
                return;
            }
            if (embedInFlightRef.current[url]) {
                return;
            }
            embedInFlightRef.current[url] = true;
            const apiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            fetch(apiUrl)
                .then((response) => response.json())
                .then((payload) => {
                const html = payload.contents ?? '';
                if (!html) {
                    embedCacheRef.current[url] = null;
                    return;
                }
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const readMeta = (name) => doc.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ??
                    doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ??
                    undefined;
                const title = readMeta('og:title') ?? (doc.title || undefined);
                const description = readMeta('og:description');
                const image = readMeta('og:image');
                const siteName = readMeta('og:site_name') ?? (() => {
                    try {
                        return new URL(url).hostname;
                    }
                    catch {
                        return undefined;
                    }
                })();
                const hasAnyPreviewData = !!(title || description || image || siteName);
                const embed = hasAnyPreviewData
                    ? {
                        url,
                        title,
                        description,
                        image,
                        siteName,
                    }
                    : null;
                embedCacheRef.current[url] = embed;
                if (!isCancelled && embed) {
                    setAutoEmbedsByUrl((prev) => ({ ...prev, [url]: embed }));
                }
            })
                .catch(() => {
                embedCacheRef.current[url] = null;
            })
                .finally(() => {
                delete embedInFlightRef.current[url];
            });
        });
        return () => {
            isCancelled = true;
        };
    }, [activeMessages, extractFirstUrl]);
    const actionButtons = [
        { icon: Reply, label: 'Reply' },
        { icon: Edit, label: 'Edit' },
        { icon: Trash2, label: 'Delete' },
        { icon: MoreHorizontal, label: 'More' },
    ];
    const toggleReaction = (messageId, emoji) => {
        const currentUserId = 'you';
        setMessagesByChannel((prev) => {
            const messages = prev[activeChannelKey] ?? [];
            const nextMessages = messages.map((message) => {
                if (message.id !== messageId) {
                    return message;
                }
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
                const updatedReaction = {
                    ...reaction,
                    hasReacted: nextHasReacted,
                    count: nextCount,
                    userIds: nextUserIds,
                };
                const nextReactions = currentReactions
                    .map((item, index) => (index === reactionIndex ? updatedReaction : item))
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
    const pendingImagePreviewUrls = useMemo(() => pendingFiles.map((file) => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null)), [pendingFiles]);
    useEffect(() => {
        return () => {
            pendingImagePreviewUrls.forEach((url) => {
                if (url) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [pendingImagePreviewUrls]);
    const updateComposerState = useCallback(() => {
        const content = inputRef.current?.innerText.trim() ?? '';
        setComposerHasContent(content.length > 0);
    }, []);
    const onSend = useCallback(async ({ content, files }) => {
        if (!activeChannelId) {
            return;
        }
        const message = await sendMessage(activeChannelId, content);
        setMessagesByChannel((prev) => {
            const currentMessages = prev[activeChannelKey] ?? [];
            return {
                ...prev,
                [activeChannelKey]: [
                    ...currentMessages,
                    {
                        ...message,
                        // TODO: remove when backend attachment upload flow is integrated with composer
                        attachments: files.length > 0
                            ? files.map((file, index) => ({
                                id: `upload-${Date.now()}-${index}`,
                                type: file.type.startsWith('image/')
                                    ? 'image'
                                    : file.type.startsWith('video/')
                                        ? 'video'
                                        : file.type.startsWith('audio/')
                                            ? 'audio'
                                            : 'file',
                                url: URL.createObjectURL(file),
                                filename: file.name,
                                filesize: file.size,
                                mimeType: file.type || 'application/octet-stream',
                            }))
                            : message.attachments,
                    },
                ],
            };
        });
    }, [activeChannelId, activeChannelKey]);
    const handleKeyDown = useCallback(async (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const content = inputRef.current?.innerText.trim() ?? '';
            if (!content && pendingFiles.length === 0) {
                return;
            }
            await onSend({ content, files: pendingFiles });
            if (inputRef.current) {
                inputRef.current.innerText = '';
            }
            setPendingFiles([]);
            setComposerHasContent(false);
        }
    }, [onSend, pendingFiles]);
    const handlePaste = useCallback((event) => {
        const items = Array.from(event.clipboardData.items);
        const imageItems = items.filter((item) => item.type.startsWith('image/'));
        if (imageItems.length > 0) {
            event.preventDefault();
            const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
            setPendingFiles((prev) => [...prev, ...files]);
            return;
        }
        event.preventDefault();
        const text = event.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    }, []);
    const insertEmoji = useCallback((emoji) => {
        const el = inputRef.current;
        if (!el) {
            return;
        }
        el.focus();
        document.execCommand('insertText', false, emoji);
        updateComposerState();
    }, [updateComposerState]);
    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop: (files) => setPendingFiles((prev) => [...prev, ...files]),
        noClick: true,
        noKeyboard: true,
    });
    const canSend = composerHasContent || pendingFiles.length > 0;
    const composerPlaceholder = `Message #${activeChannel?.name ?? 'general'}`;
    const removePendingFile = (index) => {
        setPendingFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
    };
    return (_jsxs("div", { className: "h-full flex flex-col overflow-hidden", children: [_jsx("div", { className: "flex-none", children: _jsx(ChannelHeader, { channel: activeChannel, topic: "Welcome to the channel", showMembers: showMembers, onToggleMembers: () => setShowMembers((v) => !v) }) }), _jsxs("section", { ref: messageListRef, onScroll: handleScrollToLoadMore, className: "flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent", children: [_jsxs("div", { className: "py-4", children: [_jsx(Hash, { className: "w-16 h-16 p-3 rounded-full bg-muted text-muted-foreground mb-4" }), _jsxs("h2", { className: "text-2xl font-bold text-foreground", children: ["Welcome to #", activeChannel?.name ?? 'general'] }), _jsxs("p", { className: "text-muted-foreground text-sm", children: ["This is the start of #", activeChannel?.name ?? 'general', " channel."] })] }), _jsxs("div", { className: "flex items-center gap-3 my-4", children: [_jsx(Separator, { className: "flex-1" }), _jsx("span", { className: "text-xs text-muted-foreground whitespace-nowrap", children: "Today" }), _jsx(Separator, { className: "flex-1" })] }), _jsx("div", { className: "space-y-1", children: grouped.map((msg) => {
                            const username = msg.author ?? 'unknown';
                            const avatarLetter = msg.avatarInitials ?? username[0]?.toUpperCase() ?? '?';
                            const imageAttachments = (msg.attachments ?? []).filter((attachment) => attachment.type === 'image' || attachment.type === 'gif');
                            const videoAttachments = (msg.attachments ?? []).filter((attachment) => attachment.type === 'video');
                            const fileAttachments = (msg.attachments ?? []).filter((attachment) => attachment.type === 'file' || attachment.type === 'audio');
                            const reactions = msg.reactions ?? [];
                            if (msg.startsGroup) {
                                return (_jsxs("div", { className: "relative group overflow-visible", children: [msg.replyTo && _jsx(ReplyPreview, { replyTo: msg.replyTo }), _jsxs("div", { className: "flex gap-3 px-2 py-1 rounded-md hover:bg-white/5", children: [msg.avatarUrl ? (_jsx("img", { src: msg.avatarUrl, alt: username, className: "mt-0.5 h-10 w-10 flex-shrink-0 rounded-full object-cover" })) : (_jsx("div", { className: `mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${msg.avatarColor ?? 'bg-muted'}`, children: avatarLetter })), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-baseline", children: [_jsx("span", { className: `text-sm font-semibold ${msg.authorColor ?? 'text-foreground'}`, children: username }), _jsx("span", { className: "text-xs text-muted-foreground ml-2", children: msg.timestamp })] }), _jsx(TextContent, { content: msg.content, className: "text-foreground" }), imageAttachments.length > 0 && _jsx(ImageAttachment, { attachments: imageAttachments }), videoAttachments.map((attachment) => (_jsx(VideoAttachment, { url: attachment.url }, attachment.id))), fileAttachments.map((attachment) => (_jsx(FileAttachment, { attachment: attachment }, attachment.id))), (msg.embeds && msg.embeds.length > 0
                                                            ? msg.embeds
                                                            : (() => {
                                                                const contentUrl = extractFirstUrl(msg.content);
                                                                return contentUrl && autoEmbedsByUrl[contentUrl] ? [autoEmbedsByUrl[contentUrl]] : [];
                                                            })()).map((embed, index) => (_jsx(LinkEmbed, { embed: embed }, `${msg.id}-${embed.url}-${index}`))), _jsx(ReactionBar, { reactions: reactions, onToggleReaction: (emoji) => toggleReaction(msg.id, emoji) })] })] }), _jsxs("div", { className: cn('absolute right-2 top-1 z-20 overflow-visible bg-card border border-border rounded-md shadow-sm px-1 gap-0.5', reactionPickerMessageId === msg.id ? 'flex' : 'hidden group-hover:flex'), children: [_jsx(EmojiPicker, { open: reactionPickerMessageId === msg.id, onOpenChange: (open) => setReactionPickerMessageId(open ? msg.id : null), onSelect: (emoji) => toggleReaction(msg.id, emoji), trigger: (_jsx("button", { className: "flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground", type: "button", children: _jsx(SmilePlus, { className: "w-4 h-4" }) })) }), actionButtons.map(({ icon: Icon, label }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150", type: "button", children: _jsx(Icon, { className: "w-4 h-4" }) }) }), _jsx(TooltipContent, { children: label })] }, label)))] })] }, msg.id));
                            }
                            return (_jsxs("div", { className: "relative group overflow-visible pl-[52px] py-0.5 rounded-md hover:bg-white/5", children: [msg.replyTo && _jsx(ReplyPreview, { replyTo: msg.replyTo }), _jsx(TextContent, { content: msg.content, className: "text-foreground" }), imageAttachments.length > 0 && _jsx(ImageAttachment, { attachments: imageAttachments }), videoAttachments.map((attachment) => (_jsx(VideoAttachment, { url: attachment.url }, attachment.id))), fileAttachments.map((attachment) => (_jsx(FileAttachment, { attachment: attachment }, attachment.id))), (msg.embeds && msg.embeds.length > 0
                                        ? msg.embeds
                                        : (() => {
                                            const contentUrl = extractFirstUrl(msg.content);
                                            return contentUrl && autoEmbedsByUrl[contentUrl] ? [autoEmbedsByUrl[contentUrl]] : [];
                                        })()).map((embed, index) => (_jsx(LinkEmbed, { embed: embed }, `${msg.id}-${embed.url}-${index}`))), _jsx(ReactionBar, { reactions: reactions, onToggleReaction: (emoji) => toggleReaction(msg.id, emoji) }), _jsxs("div", { className: cn('absolute right-2 top-0 z-20 overflow-visible bg-card border border-border rounded-md shadow-sm px-1 gap-0.5', reactionPickerMessageId === msg.id ? 'flex' : 'hidden group-hover:flex'), children: [_jsx(EmojiPicker, { open: reactionPickerMessageId === msg.id, onOpenChange: (open) => setReactionPickerMessageId(open ? msg.id : null), onSelect: (emoji) => toggleReaction(msg.id, emoji), trigger: (_jsx("button", { className: "flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground", type: "button", children: _jsx(SmilePlus, { className: "w-4 h-4" }) })) }), actionButtons.map(({ icon: Icon, label }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150", type: "button", children: _jsx(Icon, { className: "w-4 h-4" }) }) }), _jsx(TooltipContent, { children: label })] }, label)))] })] }, msg.id));
                        }) })] }), _jsx("footer", { className: "flex-none mx-4 mb-4", children: _jsxs("div", { ...getRootProps(), className: `relative rounded-lg bg-[hsl(240,3.7%,18%)] ${canSend ? 'ring-1 ring-indigo-500/30' : ''}`, children: [isDragActive && (_jsx("div", { className: "absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-indigo-500/50 bg-indigo-500/10", children: _jsx("p", { className: "font-semibold text-indigo-400", children: "Drop files to upload" }) })), _jsx("input", { ...getInputProps() }), pendingFiles.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 px-3 pt-2", children: pendingFiles.map((file, index) => (_jsxs("div", { className: "group relative", children: [file.type.startsWith('image/') ? (_jsx("img", { src: pendingImagePreviewUrls[index] ?? undefined, alt: file.name, className: "h-16 w-16 rounded-md border border-border object-cover" })) : (_jsxs("div", { className: "flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-md border border-border bg-[hsl(240,4%,18%)]", children: [_jsx(FileText, { className: "h-5 w-5 text-muted-foreground" }), _jsx("span", { className: "w-12 truncate text-center text-[9px] text-muted-foreground", children: file.name })] })), _jsx("button", { type: "button", onClick: () => removePendingFile(index), className: "absolute -right-1.5 -top-1.5 hidden h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-red-500 text-[10px] text-white group-hover:flex", children: _jsx(X, { className: "h-2.5 w-2.5" }) })] }, `${file.name}-${index}`))) })), _jsxs("div", { className: "flex items-end gap-2 px-3", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground", type: "button", onClick: open, children: _jsx(Plus, { className: "h-5 w-5 text-muted-foreground hover:text-foreground" }) }) }), _jsx(TooltipContent, { children: "Add Attachment" })] }), _jsx("div", { ref: inputRef, contentEditable: true, suppressContentEditableWarning: true, onKeyDown: handleKeyDown, onPaste: handlePaste, onInput: updateComposerState, className: "min-h-[44px] max-h-[300px] min-w-0 flex-1 overflow-y-auto break-words bg-transparent py-[11px] text-[15px] text-foreground outline-none", "data-placeholder": composerPlaceholder }), _jsxs("div", { className: "flex items-center gap-1 pb-2", children: [[
                                            { icon: Gift, label: 'Gift' },
                                            { icon: Image, label: 'GIF' },
                                        ].map(({ icon: Icon, label }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground", type: "button", children: _jsx(Icon, { className: "w-5 h-5 text-muted-foreground hover:text-foreground" }) }) }), _jsx(TooltipContent, { children: label })] }, label))), _jsx(EmojiPicker, { align: "end", onSelect: insertEmoji, trigger: (_jsx("button", { className: "cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground", type: "button", children: _jsx(Smile, { className: "w-5 h-5 text-muted-foreground hover:text-foreground" }) })) })] })] })] }) })] }));
};
//# sourceMappingURL=DashboardView.js.map