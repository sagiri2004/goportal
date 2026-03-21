import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Separator, cn } from '@goportal/ui';
import { ChannelHeader } from '@goportal/feature-channels';
import { Edit, FileText, Gift, Hash, Image, Loader2, MoreHorizontal, Plus, Reply, Smile, SmilePlus, Trash2, X, } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui';
import { addReaction, deleteMessage, getMessages, markChannelRead, removeReaction, sendMessage, updateMessage, uploadMessageAttachment, } from '@goportal/app-core';
import { useAuthStore } from '@goportal/store';
import { WS_URL } from '@goportal/config';
import { useDropzone } from 'react-dropzone';
import { TextContent } from './components/TextContent';
import { ReplyPreview } from './components/ReplyPreview';
import { ImageAttachment } from './components/ImageAttachment';
import { FileAttachment } from './components/FileAttachment';
import { ReactionBar } from './components/ReactionBar';
import { LinkEmbed } from './components/LinkEmbed';
import { VideoAttachment } from './components/VideoAttachment';
import { EmojiPicker } from './components/EmojiPicker';
const MESSAGE_CREATED_EVENT_TYPES = new Set([
    'CHAT_MESSAGE_CREATED',
    'MESSAGE_CREATED',
    'MESSAGE_CREATE',
    'MESSAGE:CREATE',
    'MESSAGE.CREATED',
]);
const MESSAGE_UPDATED_EVENT_TYPES = new Set([
    'CHAT_MESSAGE_UPDATED',
    'MESSAGE_UPDATED',
    'MESSAGE_UPDATE',
    'MESSAGE:UPDATE',
    'MESSAGE.UPDATED',
]);
const MESSAGE_DELETED_EVENT_TYPES = new Set([
    'CHAT_MESSAGE_DELETED',
    'MESSAGE_DELETED',
    'MESSAGE_DELETE',
    'MESSAGE:DELETE',
    'MESSAGE.DELETED',
]);
const REACTION_ADDED_EVENT_TYPES = new Set([
    'MESSAGE_REACTION_ADDED',
    'REACTION_ADDED',
    'MESSAGE:REACTION:ADD',
    'REACTION.ADDED',
]);
const REACTION_REMOVED_EVENT_TYPES = new Set([
    'MESSAGE_REACTION_REMOVED',
    'REACTION_REMOVED',
    'MESSAGE:REACTION:REMOVE',
    'REACTION.REMOVED',
]);
const VOICE_ACTIVITY_EVENT_TYPES = new Set([
    'VOICE_CHANNEL_ACTIVITY_UPDATED',
    'VOICE_ACTIVITY_UPDATED',
]);
const messagePalette = [
    'bg-indigo-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-rose-500',
];
const messageColorFromId = (id) => {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
        hash = (hash + id.charCodeAt(index)) % 1031;
    }
    return messagePalette[hash % messagePalette.length];
};
const messageInitialsFromName = (name) => name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
const formatSocketTimestamp = (timestamp) => {
    let source;
    if (typeof timestamp === 'number') {
        source = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp);
    }
    else if (typeof timestamp === 'string' && timestamp) {
        source = new Date(timestamp);
    }
    else {
        source = new Date();
    }
    const safeSource = Number.isNaN(source.getTime()) ? new Date() : source;
    return {
        timestamp: safeSource.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        date: safeSource.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    };
};
const normalizeEventType = (raw) => typeof raw === 'string' ? raw.trim().toUpperCase() : '';
const resolveEnvelopeEventType = (event) => {
    const topLevelType = normalizeEventType(event.type);
    const payloadType = normalizeEventType(event.payload?.event_type ?? event.payload?.type);
    if (topLevelType === 'POPUP') {
        if (payloadType) {
            return payloadType;
        }
        if (event.payload?.message_id && event.payload?.channel_id) {
            return 'CHAT_MESSAGE_CREATED';
        }
    }
    return payloadType || topLevelType;
};
const buildNotificationSocketTargets = (rawUrl, userId, token) => {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    }
    catch {
        return [];
    }
    if (parsed.protocol === 'http:') {
        parsed.protocol = 'ws:';
    }
    else if (parsed.protocol === 'https:') {
        parsed.protocol = 'wss:';
    }
    if (!parsed.pathname || parsed.pathname === '/') {
        parsed.pathname = '/ws';
    }
    const setCommonParams = (url) => {
        url.searchParams.set('user_id', userId);
        if (token) {
            url.searchParams.set('token', token);
        }
    };
    const targets = [];
    const addTarget = (url) => {
        setCommonParams(url);
        targets.push(url);
    };
    if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
        parsed.port === '8080') {
        const preferred = new URL(parsed.toString());
        preferred.port = '8090';
        addTarget(preferred);
        const fallback = new URL(parsed.toString());
        fallback.port = '8085';
        addTarget(fallback);
    }
    addTarget(parsed);
    return Array.from(new Set(targets.map((target) => target.toString())));
};
const mapSocketAttachments = (attachments) => {
    if (!Array.isArray(attachments)) {
        return [];
    }
    return attachments.map((item, index) => {
        const mimeType = item?.file_type ?? item?.mime_type ?? 'application/octet-stream';
        return {
            id: item?.id ?? item?.attachment_id ?? `att-${index}`,
            type: mimeType.startsWith('image/')
                ? 'image'
                : mimeType.startsWith('video/')
                    ? 'video'
                    : mimeType.startsWith('audio/')
                        ? 'audio'
                        : 'file',
            url: item?.file_url ?? item?.url ?? '',
            filename: item?.file_name ?? item?.filename ?? 'attachment',
            filesize: item?.file_size ?? item?.filesize ?? 0,
            mimeType,
        };
    });
};
const mapSocketReactions = (reactions, currentUserId) => {
    if (!Array.isArray(reactions)) {
        return [];
    }
    const grouped = new Map();
    reactions.forEach((reaction) => {
        const emoji = reaction?.emoji;
        if (!emoji) {
            return;
        }
        const nextUserIds = Array.isArray(reaction?.user_ids)
            ? reaction.user_ids.filter((item) => typeof item === 'string')
            : typeof reaction?.user_id === 'string'
                ? [reaction.user_id]
                : [];
        const existing = grouped.get(emoji) ?? [];
        grouped.set(emoji, [...existing, ...nextUserIds]);
    });
    return Array.from(grouped.entries()).map(([emoji, userIds]) => ({
        emoji,
        count: userIds.length,
        hasReacted: !!currentUserId && userIds.includes(currentUserId),
        userIds,
    }));
};
const mapSocketPayloadToMessage = (payload, envelopeTimestamp, currentUserId) => {
    const messageId = payload?.message_id ?? payload?.id;
    const authorId = payload?.author_id ?? payload?.author?.id;
    const channelId = payload?.channel_id;
    if (!messageId || !authorId || !channelId) {
        return null;
    }
    const author = payload?.author?.username ?? `user-${String(authorId).slice(0, 6)}`;
    const { timestamp, date } = formatSocketTimestamp(payload?.created_at ?? envelopeTimestamp);
    return {
        id: messageId,
        authorId,
        author,
        avatarUrl: payload?.author?.avatar_url,
        avatarColor: payload?.author?.avatar_color ?? messageColorFromId(authorId),
        avatarInitials: messageInitialsFromName(author),
        content: payload?.content?.payload ?? payload?.content ?? '',
        timestamp,
        date,
        editedAt: payload?.updated_at
            ? formatSocketTimestamp(payload.updated_at).timestamp
            : undefined,
        attachments: mapSocketAttachments(payload?.attachments),
        reactions: mapSocketReactions(payload?.reactions, currentUserId),
        replyTo: payload?.reply_to
            ? {
                messageId: payload.reply_to.message_id ?? payload.reply_to.id ?? '',
                authorName: payload.reply_to.author_name ?? payload.reply_to.author_id ?? 'unknown',
                content: payload.reply_to.content ?? '',
            }
            : undefined,
    };
};
export const DashboardView = () => {
    const { showMembers, setShowMembers, activeChannelId, activeCategories, incrementChannelUnread, resetChannelUnread, setChannelUnread, applyVoiceChannelActivityUpdate, } = useOutletContext();
    const currentUser = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);
    const [messagesByChannel, setMessagesByChannel] = useState({});
    const [pagingByChannel, setPagingByChannel] = useState({});
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
    const messageListRef = useRef(null);
    const inputRef = useRef(null);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [composerHasContent, setComposerHasContent] = useState(false);
    const [uploadProgressByFile, setUploadProgressByFile] = useState({});
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const [composerError, setComposerError] = useState(null);
    const embedCacheRef = useRef({});
    const embedInFlightRef = useRef({});
    const [autoEmbedsByUrl, setAutoEmbedsByUrl] = useState({});
    const activeChannelIdRef = useRef(activeChannelId);
    const currentUserIdRef = useRef(currentUser?.id ?? null);
    const socketRef = useRef(null);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const isNearBottomRef = useRef(true);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [typingUsersByChannel, setTypingUsersByChannel] = useState({});
    const typingTimersRef = useRef({});
    const lastTypingSentAtRef = useRef({});
    const [replyToMessage, setReplyToMessage] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingDraft, setEditingDraft] = useState('');
    useEffect(() => {
        activeChannelIdRef.current = activeChannelId;
    }, [activeChannelId]);
    useEffect(() => {
        isNearBottomRef.current = isNearBottom;
    }, [isNearBottom]);
    useEffect(() => {
        currentUserIdRef.current = currentUser?.id ?? null;
    }, [currentUser?.id]);
    useEffect(() => {
        return () => {
            Object.values(typingTimersRef.current).forEach((timer) => window.clearTimeout(timer));
            typingTimersRef.current = {};
        };
    }, []);
    const activeChannel = useMemo(() => {
        const channels = activeCategories.flatMap((category) => category.channels);
        const match = channels.find((channel) => channel.id === activeChannelId);
        if (!match) {
            return undefined;
        }
        return {
            id: match.id,
            name: match.name,
            type: match.type === 'voice' ? 'VOICE' : 'TEXT',
            server_id: '',
            position: 0,
            is_private: false,
        };
    }, [activeCategories, activeChannelId]);
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
    useEffect(() => {
        if (!activeChannelId) {
            return;
        }
        requestAnimationFrame(() => {
            const list = messageListRef.current;
            if (!list) {
                return;
            }
            list.scrollTop = list.scrollHeight;
            setNewMessageCount(0);
            setIsNearBottom(true);
        });
    }, [activeChannelId]);
    useEffect(() => {
        if (!activeChannelId) {
            return;
        }
        resetChannelUnread?.(activeChannelId);
        void markChannelRead(activeChannelId).catch(() => { });
        const socket = socketRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'channel.focus',
                data: { channel_id: activeChannelId },
            }));
        }
    }, [activeChannelId, resetChannelUnread]);
    useEffect(() => {
        if (typeof window === 'undefined' || typeof Notification === 'undefined') {
            return;
        }
        void Notification.requestPermission();
    }, []);
    useEffect(() => {
        if (!currentUser?.id) {
            return;
        }
        let socket = null;
        let reconnectTimer = null;
        let initialConnectTimer = null;
        let reconnectAttempt = 0;
        let closedByClient = false;
        const updateMessageInChannel = (channelId, updater) => {
            setMessagesByChannel((prev) => {
                if (channelId) {
                    const current = prev[channelId] ?? [];
                    return {
                        ...prev,
                        [channelId]: updater(current),
                    };
                }
                const next = { ...prev };
                Object.keys(next).forEach((key) => {
                    next[key] = updater(next[key] ?? []);
                });
                return next;
            });
        };
        const applyReactionDelta = (message, emoji, userId, mode) => {
            const reactions = message.reactions ?? [];
            const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
            if (index === -1) {
                if (mode === 'remove') {
                    return message;
                }
                return {
                    ...message,
                    reactions: [
                        ...reactions,
                        {
                            emoji,
                            count: 1,
                            hasReacted: currentUserIdRef.current === userId,
                            userIds: [userId],
                        },
                    ],
                };
            }
            const target = reactions[index];
            const currentUserIds = target.userIds ?? [];
            const nextUserIds = mode === 'add'
                ? Array.from(new Set([...currentUserIds, userId]))
                : currentUserIds.filter((id) => id !== userId);
            const nextCount = nextUserIds.length;
            const nextReactions = reactions
                .map((reaction, reactionIndex) => {
                if (reactionIndex !== index) {
                    return reaction;
                }
                return {
                    ...reaction,
                    count: nextCount,
                    userIds: nextUserIds,
                    hasReacted: currentUserIdRef.current ? nextUserIds.includes(currentUserIdRef.current) : false,
                };
            })
                .filter((reaction) => reaction.count > 0);
            return {
                ...message,
                reactions: nextReactions,
            };
        };
        const onSocketMessage = (raw) => {
            let event;
            try {
                event = JSON.parse(raw);
            }
            catch {
                return;
            }
            const eventType = resolveEnvelopeEventType(event);
            if (!eventType || eventType === 'CONNECTED') {
                return;
            }
            if (VOICE_ACTIVITY_EVENT_TYPES.has(eventType)) {
                const payload = event.payload ?? {};
                const serverId = typeof payload.server_id === 'string' ? payload.server_id : '';
                const channelId = typeof payload.channel_id === 'string' ? payload.channel_id : '';
                const participants = Array.isArray(payload.participants) ? payload.participants : [];
                if (serverId && channelId && applyVoiceChannelActivityUpdate) {
                    applyVoiceChannelActivityUpdate({
                        serverId,
                        channelId,
                        participants,
                    });
                }
                return;
            }
            if (eventType === 'CHANNEL.UNREAD') {
                const payload = event.payload ?? {};
                const channelId = payload.channel_id;
                const unreadCount = Number(payload.unread_count ?? 0);
                if (!channelId) {
                    return;
                }
                if (channelId !== activeChannelIdRef.current) {
                    setChannelUnread?.(channelId, unreadCount);
                }
                else if (unreadCount > 0) {
                    resetChannelUnread?.(channelId);
                }
                return;
            }
            if (eventType === 'MENTION') {
                const payload = event.payload ?? {};
                if (typeof window !== 'undefined' &&
                    typeof Notification !== 'undefined' &&
                    Notification.permission === 'granted') {
                    const title = payload.from_username ? `@mention từ ${payload.from_username}` : 'Bạn được nhắc đến';
                    const body = payload.preview ?? 'Bạn có một @mention mới';
                    if (document.hidden) {
                        new Notification(title, { body });
                    }
                }
                return;
            }
            if (eventType === 'TYPING' || eventType === 'TYPING.START') {
                const payload = event.payload ?? {};
                const channelId = payload.channel_id;
                const userId = payload.user_id;
                const username = payload.username;
                if (!channelId || !userId || userId === currentUserIdRef.current) {
                    return;
                }
                setTypingUsersByChannel((prev) => ({
                    ...prev,
                    [channelId]: {
                        ...(prev[channelId] ?? {}),
                        [userId]: username ?? userId,
                    },
                }));
                const timerKey = `${channelId}:${userId}`;
                if (typingTimersRef.current[timerKey]) {
                    window.clearTimeout(typingTimersRef.current[timerKey]);
                }
                typingTimersRef.current[timerKey] = window.setTimeout(() => {
                    setTypingUsersByChannel((prev) => {
                        const channelUsers = { ...(prev[channelId] ?? {}) };
                        delete channelUsers[userId];
                        return { ...prev, [channelId]: channelUsers };
                    });
                    delete typingTimersRef.current[timerKey];
                }, 3000);
                return;
            }
            if (eventType === 'TYPING.STOP') {
                const payload = event.payload ?? {};
                const channelId = payload.channel_id;
                const userId = payload.user_id;
                if (!channelId || !userId) {
                    return;
                }
                const timerKey = `${channelId}:${userId}`;
                if (typingTimersRef.current[timerKey]) {
                    window.clearTimeout(typingTimersRef.current[timerKey]);
                    delete typingTimersRef.current[timerKey];
                }
                setTypingUsersByChannel((prev) => {
                    const channelUsers = { ...(prev[channelId] ?? {}) };
                    delete channelUsers[userId];
                    return { ...prev, [channelId]: channelUsers };
                });
                return;
            }
            if (MESSAGE_CREATED_EVENT_TYPES.has(eventType)) {
                const payload = event.payload ?? {};
                const message = mapSocketPayloadToMessage(payload, event.timestamp, currentUserIdRef.current);
                if (!message) {
                    return;
                }
                setMessagesByChannel((prev) => {
                    const channelId = payload.channel_id;
                    const current = prev[channelId] ?? [];
                    if (current.some((item) => item.id === message.id)) {
                        return prev;
                    }
                    const next = {
                        ...prev,
                        [channelId]: [...current, message],
                    };
                    if (activeChannelIdRef.current !== channelId) {
                        incrementChannelUnread?.(channelId);
                    }
                    else {
                        void markChannelRead(channelId).catch(() => { });
                        if (isNearBottomRef.current) {
                            requestAnimationFrame(() => {
                                const list = messageListRef.current;
                                if (!list) {
                                    return;
                                }
                                list.scrollTop = list.scrollHeight;
                            });
                        }
                        else {
                            setNewMessageCount((count) => count + 1);
                        }
                    }
                    return next;
                });
                if (typeof window !== 'undefined' &&
                    typeof Notification !== 'undefined' &&
                    Notification.permission === 'granted' &&
                    document.hidden) {
                    const authorName = message.author ?? 'New message';
                    new Notification(authorName, { body: message.content.slice(0, 120) });
                }
                return;
            }
            if (MESSAGE_UPDATED_EVENT_TYPES.has(eventType)) {
                const payload = event.payload ?? {};
                const messageId = payload.message_id ?? payload.id;
                if (!messageId) {
                    return;
                }
                const channelId = payload.channel_id ?? null;
                updateMessageInChannel(channelId, (messages) => messages.map((message) => {
                    if (message.id !== messageId) {
                        return message;
                    }
                    return {
                        ...message,
                        content: payload.content?.payload ?? payload.content ?? message.content,
                        attachments: payload.attachments !== undefined
                            ? mapSocketAttachments(payload.attachments)
                            : message.attachments,
                        reactions: payload.reactions !== undefined
                            ? mapSocketReactions(payload.reactions, currentUserIdRef.current)
                            : message.reactions,
                        editedAt: formatSocketTimestamp(payload.updated_at ?? event.timestamp).timestamp,
                    };
                }));
                return;
            }
            if (MESSAGE_DELETED_EVENT_TYPES.has(eventType)) {
                const payload = event.payload ?? {};
                const messageId = payload.message_id ?? payload.id;
                if (!messageId) {
                    return;
                }
                const channelId = payload.channel_id ?? null;
                updateMessageInChannel(channelId, (messages) => messages.filter((message) => message.id !== messageId));
                return;
            }
            if (REACTION_ADDED_EVENT_TYPES.has(eventType) || REACTION_REMOVED_EVENT_TYPES.has(eventType)) {
                const payload = event.payload ?? {};
                const messageId = payload.message_id ?? payload.id;
                if (!messageId) {
                    return;
                }
                const emoji = payload.emoji;
                const userId = payload.user_id ?? event.user_id ?? currentUserIdRef.current;
                const channelId = payload.channel_id ?? null;
                const mode = REACTION_ADDED_EVENT_TYPES.has(eventType) ? 'add' : 'remove';
                updateMessageInChannel(channelId, (messages) => messages.map((message) => {
                    if (message.id !== messageId) {
                        return message;
                    }
                    if (payload.reactions !== undefined) {
                        return {
                            ...message,
                            reactions: mapSocketReactions(payload.reactions, currentUserIdRef.current),
                        };
                    }
                    if (!emoji || !userId) {
                        return message;
                    }
                    return applyReactionDelta(message, emoji, userId, mode);
                }));
            }
        };
        const connect = () => {
            if (closedByClient) {
                return;
            }
            const targets = buildNotificationSocketTargets(WS_URL, currentUser.id, token);
            if (targets.length === 0) {
                return;
            }
            const target = targets[reconnectAttempt % targets.length];
            const ws = new WebSocket(target);
            socket = ws;
            socketRef.current = ws;
            ws.onopen = () => {
                if (socket !== ws) {
                    return;
                }
                reconnectAttempt = 0;
                if (activeChannelIdRef.current) {
                    ws.send(JSON.stringify({
                        type: 'channel.focus',
                        data: { channel_id: activeChannelIdRef.current },
                    }));
                }
            };
            ws.onmessage = (event) => {
                if (socket !== ws) {
                    return;
                }
                onSocketMessage(String(event.data));
            };
            ws.onclose = () => {
                if (socket === ws) {
                    socket = null;
                    socketRef.current = null;
                }
                if (closedByClient) {
                    return;
                }
                if (reconnectTimer) {
                    window.clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }
                const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt);
                reconnectAttempt += 1;
                reconnectTimer = window.setTimeout(() => {
                    reconnectTimer = null;
                    connect();
                }, delay);
            };
            ws.onerror = () => {
                if (socket !== ws) {
                    return;
                }
                ws.close();
            };
        };
        // Delay initial connect slightly to avoid React StrictMode dev double-mount
        // from opening/closing a socket while still CONNECTING.
        initialConnectTimer = window.setTimeout(connect, 120);
        return () => {
            closedByClient = true;
            if (initialConnectTimer) {
                window.clearTimeout(initialConnectTimer);
            }
            if (reconnectTimer) {
                window.clearTimeout(reconnectTimer);
            }
            socket?.close();
            socket = null;
            socketRef.current = null;
        };
    }, [applyVoiceChannelActivityUpdate, currentUser?.id, incrementChannelUnread, resetChannelUnread, setChannelUnread, token]);
    const handleScrollToLoadMore = useCallback(async (event) => {
        const container = event.currentTarget;
        const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
        const nearBottom = distanceToBottom <= 150;
        setIsNearBottom(nearBottom);
        if (nearBottom && newMessageCount > 0) {
            setNewMessageCount(0);
        }
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
    }, [activeChannelId, newMessageCount, pagingByChannel]);
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
        { icon: Reply, label: 'Reply', key: 'reply' },
        { icon: Edit, label: 'Edit', key: 'edit' },
        { icon: Trash2, label: 'Delete', key: 'delete' },
        { icon: MoreHorizontal, label: 'More', key: 'more' },
    ];
    const toggleReaction = async (messageId, emoji) => {
        const currentUserId = currentUserIdRef.current ?? 'you';
        const message = (messagesByChannel[activeChannelKey] ?? []).find((item) => item.id === messageId);
        const reaction = (message?.reactions ?? []).find((item) => item.emoji === emoji);
        const hasReacted = !!reaction?.hasReacted;
        try {
            if (hasReacted) {
                await removeReaction(messageId, emoji);
            }
            else {
                await addReaction(messageId, emoji);
            }
        }
        catch {
            // inline API errors are handled by apiClient toast event
            return;
        }
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
        if (!activeChannelId || !content) {
            return;
        }
        const now = Date.now();
        const key = `${activeChannelId}:${currentUserIdRef.current ?? 'anonymous'}`;
        const lastSentAt = lastTypingSentAtRef.current[key] ?? 0;
        if (now - lastSentAt < 2000) {
            return;
        }
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return;
        }
        socket.send(JSON.stringify({
            type: 'typing.start',
            data: {
                channel_id: activeChannelId,
                username: currentUser?.username ?? '',
            },
        }));
        lastTypingSentAtRef.current[key] = now;
    }, [activeChannelId, currentUser?.username]);
    const onSend = useCallback(async ({ content, files }) => {
        if (!activeChannelId) {
            return false;
        }
        try {
            setComposerError(null);
            const attachmentIds = [];
            if (files.length > 0) {
                setIsUploadingFiles(true);
                const uploaded = await Promise.all(files.map(async (file, index) => {
                    const uploadKey = `${file.name}-${file.size}-${index}`;
                    const result = await uploadMessageAttachment(file, (progress) => {
                        setUploadProgressByFile((prev) => ({ ...prev, [uploadKey]: progress }));
                    });
                    return result.attachmentId;
                }));
                attachmentIds.push(...uploaded);
            }
            const message = await sendMessage(activeChannelId, content, attachmentIds, replyToMessage?.id);
            const nextMessage = replyToMessage
                ? {
                    ...message,
                    replyTo: {
                        messageId: replyToMessage.id,
                        authorName: replyToMessage.author,
                        authorColor: replyToMessage.authorColor,
                        content: replyToMessage.content,
                        hasAttachment: (replyToMessage.attachments ?? []).length > 0,
                    },
                }
                : message;
            setMessagesByChannel((prev) => {
                const currentMessages = prev[activeChannelKey] ?? [];
                return {
                    ...prev,
                    [activeChannelKey]: [...currentMessages, nextMessage],
                };
            });
            setReplyToMessage(null);
            return true;
        }
        catch (error) {
            setComposerError(error instanceof Error ? error.message : 'Failed to send message.');
            return false;
        }
        finally {
            setIsUploadingFiles(false);
            setUploadProgressByFile({});
        }
    }, [activeChannelId, activeChannelKey, replyToMessage?.id]);
    const handleKeyDown = useCallback(async (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const content = inputRef.current?.innerText.trim() ?? '';
            if (!content && pendingFiles.length === 0) {
                return;
            }
            const sent = await onSend({ content, files: pendingFiles });
            if (sent) {
                if (inputRef.current) {
                    inputRef.current.innerText = '';
                }
                setPendingFiles([]);
                setComposerHasContent(false);
            }
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
    const canSend = (composerHasContent || pendingFiles.length > 0) && !isUploadingFiles;
    const composerPlaceholder = `Message #${activeChannel?.name ?? 'general'}`;
    const typingUsers = Object.values(typingUsersByChannel[activeChannelId] ?? {});
    const removePendingFile = (index) => {
        setPendingFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
    };
    const handleMessageAction = async (action, message) => {
        if (action === 'reply') {
            setReplyToMessage(message);
            return;
        }
        if (action === 'edit') {
            setEditingMessageId(message.id);
            setEditingDraft(message.content);
            return;
        }
        if (action === 'delete') {
            const confirmed = window.confirm('Bạn có chắc muốn xoá tin nhắn này không?');
            if (!confirmed) {
                return;
            }
            try {
                await deleteMessage(message.id);
            }
            catch {
                return;
            }
            setMessagesByChannel((prev) => ({
                ...prev,
                [activeChannelKey]: (prev[activeChannelKey] ?? []).filter((item) => item.id !== message.id),
            }));
        }
    };
    const saveEditedMessage = async () => {
        if (!editingMessageId) {
            return;
        }
        const nextContent = editingDraft.trim();
        if (!nextContent) {
            return;
        }
        try {
            const updated = await updateMessage(editingMessageId, nextContent);
            setMessagesByChannel((prev) => ({
                ...prev,
                [activeChannelKey]: (prev[activeChannelKey] ?? []).map((item) => item.id === editingMessageId
                    ? {
                        ...item,
                        content: updated.content,
                        editedAt: updated.editedAt ?? item.editedAt ?? updated.timestamp,
                    }
                    : item),
            }));
            setEditingMessageId(null);
            setEditingDraft('');
        }
        catch {
            // no-op
        }
    };
    return (_jsxs("div", { className: "relative h-full flex flex-col overflow-hidden", children: [_jsx("div", { className: "flex-none", children: _jsx(ChannelHeader, { channel: activeChannel, topic: "Welcome to the channel", showMembers: showMembers, onToggleMembers: () => setShowMembers((v) => !v) }) }), _jsxs("section", { ref: messageListRef, onScroll: handleScrollToLoadMore, className: "flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent", children: [_jsxs("div", { className: "py-4", children: [_jsx(Hash, { className: "w-16 h-16 p-3 rounded-full bg-muted text-muted-foreground mb-4" }), _jsxs("h2", { className: "text-2xl font-bold text-foreground", children: ["Welcome to #", activeChannel?.name ?? 'general'] }), _jsxs("p", { className: "text-muted-foreground text-sm", children: ["This is the start of #", activeChannel?.name ?? 'general', " channel."] })] }), _jsxs("div", { className: "flex items-center gap-3 my-4", children: [_jsx(Separator, { className: "flex-1" }), _jsx("span", { className: "text-xs text-muted-foreground whitespace-nowrap", children: "Today" }), _jsx(Separator, { className: "flex-1" })] }), _jsx("div", { className: "space-y-1", children: grouped.map((msg) => {
                            const username = msg.author ?? 'unknown';
                            const avatarLetter = msg.avatarInitials ?? username[0]?.toUpperCase() ?? '?';
                            const imageAttachments = (msg.attachments ?? []).filter((attachment) => attachment.type === 'image' || attachment.type === 'gif');
                            const videoAttachments = (msg.attachments ?? []).filter((attachment) => attachment.type === 'video');
                            const fileAttachments = (msg.attachments ?? []).filter((attachment) => attachment.type === 'file' || attachment.type === 'audio');
                            const reactions = msg.reactions ?? [];
                            const hasPersonalMention = Boolean((currentUser?.username && msg.content.includes(`@${currentUser.username}`)) ||
                                msg.content.includes('@everyone'));
                            if (msg.startsGroup) {
                                return (_jsxs("div", { className: cn('relative group overflow-visible', hasPersonalMention ? 'border-l-2 border-indigo-500 pl-1' : ''), children: [msg.replyTo && _jsx(ReplyPreview, { replyTo: msg.replyTo }), _jsxs("div", { className: "flex gap-3 px-2 py-1 rounded-md hover:bg-white/5", children: [msg.avatarUrl ? (_jsx("img", { src: msg.avatarUrl, alt: username, className: "mt-0.5 h-10 w-10 flex-shrink-0 rounded-full object-cover" })) : (_jsx("div", { className: `mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${msg.avatarColor ?? 'bg-muted'}`, children: avatarLetter })), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-baseline", children: [_jsx("span", { className: `text-sm font-semibold ${msg.authorColor ?? 'text-foreground'}`, children: username }), _jsx("span", { className: "text-xs text-muted-foreground ml-2", children: msg.timestamp }), msg.editedAt && (_jsx("span", { className: "text-xs text-muted-foreground ml-2", children: "(\u0111\u00E3 ch\u1EC9nh s\u1EEDa)" }))] }), editingMessageId === msg.id ? (_jsx("textarea", { value: editingDraft, onChange: (event) => setEditingDraft(event.target.value), onKeyDown: (event) => {
                                                                if (event.key === 'Enter' && !event.shiftKey) {
                                                                    event.preventDefault();
                                                                    void saveEditedMessage();
                                                                }
                                                                if (event.key === 'Escape') {
                                                                    event.preventDefault();
                                                                    setEditingMessageId(null);
                                                                    setEditingDraft('');
                                                                }
                                                            }, className: "mt-1 min-h-[60px] w-full rounded-md border border-border bg-background/60 p-2 text-sm text-foreground outline-none" })) : (_jsx(TextContent, { content: msg.content, className: "text-foreground" })), imageAttachments.length > 0 && _jsx(ImageAttachment, { attachments: imageAttachments }), videoAttachments.map((attachment) => (_jsx(VideoAttachment, { url: attachment.url }, attachment.id))), fileAttachments.map((attachment) => (_jsx(FileAttachment, { attachment: attachment }, attachment.id))), (msg.embeds && msg.embeds.length > 0
                                                            ? msg.embeds
                                                            : (() => {
                                                                const contentUrl = extractFirstUrl(msg.content);
                                                                return contentUrl && autoEmbedsByUrl[contentUrl] ? [autoEmbedsByUrl[contentUrl]] : [];
                                                            })()).map((embed, index) => (_jsx(LinkEmbed, { embed: embed }, `${msg.id}-${embed.url}-${index}`))), _jsx(ReactionBar, { reactions: reactions, onToggleReaction: (emoji) => toggleReaction(msg.id, emoji) })] })] }), _jsxs("div", { className: cn('absolute right-2 top-1 z-20 overflow-visible bg-card border border-border rounded-md shadow-sm px-1 gap-0.5', reactionPickerMessageId === msg.id ? 'flex' : 'hidden group-hover:flex'), children: [_jsx(EmojiPicker, { open: reactionPickerMessageId === msg.id, onOpenChange: (open) => setReactionPickerMessageId(open ? msg.id : null), onSelect: (emoji) => toggleReaction(msg.id, emoji), trigger: (_jsx("button", { className: "flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground", type: "button", children: _jsx(SmilePlus, { className: "w-4 h-4" }) })) }), actionButtons.map(({ icon: Icon, label, key }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150", type: "button", onClick: () => void handleMessageAction(key, msg), children: _jsx(Icon, { className: "w-4 h-4" }) }) }), _jsx(TooltipContent, { children: label })] }, label)))] })] }, msg.id));
                            }
                            return (_jsxs("div", { className: cn('relative group overflow-visible pl-[52px] py-0.5 rounded-md hover:bg-white/5', hasPersonalMention ? 'border-l-2 border-indigo-500' : ''), children: [msg.replyTo && _jsx(ReplyPreview, { replyTo: msg.replyTo }), editingMessageId === msg.id ? (_jsx("textarea", { value: editingDraft, onChange: (event) => setEditingDraft(event.target.value), onKeyDown: (event) => {
                                            if (event.key === 'Enter' && !event.shiftKey) {
                                                event.preventDefault();
                                                void saveEditedMessage();
                                            }
                                            if (event.key === 'Escape') {
                                                event.preventDefault();
                                                setEditingMessageId(null);
                                                setEditingDraft('');
                                            }
                                        }, className: "mt-1 min-h-[60px] w-full rounded-md border border-border bg-background/60 p-2 text-sm text-foreground outline-none" })) : (_jsx(TextContent, { content: msg.content, className: "text-foreground" })), imageAttachments.length > 0 && _jsx(ImageAttachment, { attachments: imageAttachments }), videoAttachments.map((attachment) => (_jsx(VideoAttachment, { url: attachment.url }, attachment.id))), fileAttachments.map((attachment) => (_jsx(FileAttachment, { attachment: attachment }, attachment.id))), (msg.embeds && msg.embeds.length > 0
                                        ? msg.embeds
                                        : (() => {
                                            const contentUrl = extractFirstUrl(msg.content);
                                            return contentUrl && autoEmbedsByUrl[contentUrl] ? [autoEmbedsByUrl[contentUrl]] : [];
                                        })()).map((embed, index) => (_jsx(LinkEmbed, { embed: embed }, `${msg.id}-${embed.url}-${index}`))), _jsx(ReactionBar, { reactions: reactions, onToggleReaction: (emoji) => toggleReaction(msg.id, emoji) }), _jsxs("div", { className: cn('absolute right-2 top-0 z-20 overflow-visible bg-card border border-border rounded-md shadow-sm px-1 gap-0.5', reactionPickerMessageId === msg.id ? 'flex' : 'hidden group-hover:flex'), children: [_jsx(EmojiPicker, { open: reactionPickerMessageId === msg.id, onOpenChange: (open) => setReactionPickerMessageId(open ? msg.id : null), onSelect: (emoji) => toggleReaction(msg.id, emoji), trigger: (_jsx("button", { className: "flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground", type: "button", children: _jsx(SmilePlus, { className: "w-4 h-4" }) })) }), actionButtons.map(({ icon: Icon, label, key }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150", type: "button", onClick: () => void handleMessageAction(key, msg), children: _jsx(Icon, { className: "w-4 h-4" }) }) }), _jsx(TooltipContent, { children: label })] }, label)))] })] }, msg.id));
                        }) })] }), newMessageCount > 0 && (_jsx("div", { className: "pointer-events-none absolute inset-x-0 bottom-24 flex justify-center", children: _jsxs("button", { type: "button", className: "pointer-events-auto rounded-full bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-md", onClick: () => {
                        const list = messageListRef.current;
                        if (!list) {
                            return;
                        }
                        list.scrollTop = list.scrollHeight;
                        setNewMessageCount(0);
                        setIsNearBottom(true);
                    }, children: ["\u2193 ", newMessageCount, " tin nh\u1EAFn m\u1EDBi"] }) })), _jsx("footer", { className: "flex-none mx-4 mb-4", children: _jsxs("div", { ...getRootProps(), className: `relative rounded-lg bg-[hsl(240,3.7%,18%)] ${canSend ? 'ring-1 ring-indigo-500/30' : ''}`, children: [isDragActive && (_jsx("div", { className: "absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-indigo-500/50 bg-indigo-500/10", children: _jsx("p", { className: "font-semibold text-indigo-400", children: "Drop files to upload" }) })), _jsx("input", { ...getInputProps() }), pendingFiles.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 px-3 pt-2", children: pendingFiles.map((file, index) => (_jsxs("div", { className: "group relative", children: [file.type.startsWith('image/') ? (_jsx("img", { src: pendingImagePreviewUrls[index] ?? undefined, alt: file.name, className: "h-16 w-16 rounded-md border border-border object-cover" })) : (_jsxs("div", { className: "flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-md border border-border bg-[hsl(240,4%,18%)]", children: [_jsx(FileText, { className: "h-5 w-5 text-muted-foreground" }), _jsx("span", { className: "w-12 truncate text-center text-[9px] text-muted-foreground", children: file.name })] })), _jsx("button", { type: "button", onClick: () => removePendingFile(index), disabled: isUploadingFiles, className: "absolute -right-1.5 -top-1.5 hidden h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-red-500 text-[10px] text-white group-hover:flex", children: _jsx(X, { className: "h-2.5 w-2.5" }) })] }, `${file.name}-${index}`))) })), isUploadingFiles && (_jsxs("div", { className: "px-3 pb-2 text-xs text-muted-foreground", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }), _jsx("span", { children: "Uploading attachments..." })] }), pendingFiles.map((file, index) => {
                                    const key = `${file.name}-${file.size}-${index}`;
                                    const progress = uploadProgressByFile[key] ?? 0;
                                    return (_jsxs("p", { className: "truncate", children: [file.name, ": ", progress, "%"] }, key));
                                })] })), composerError && (_jsx("p", { className: "px-3 pb-2 text-xs text-red-400", children: composerError })), replyToMessage && (_jsxs("div", { className: "mx-3 mt-2 rounded-md border border-border bg-background/50 px-2 py-1", children: [_jsx(ReplyPreview, { replyTo: {
                                        messageId: replyToMessage.id,
                                        authorName: replyToMessage.author,
                                        authorColor: replyToMessage.authorColor,
                                        content: replyToMessage.content,
                                        hasAttachment: (replyToMessage.attachments ?? []).length > 0,
                                    } }), _jsx("button", { type: "button", className: "mt-1 text-xs text-muted-foreground hover:text-foreground", onClick: () => setReplyToMessage(null), children: "Hu\u1EF7 tr\u1EA3 l\u1EDDi" })] })), _jsxs("div", { className: "flex items-end gap-2 px-3", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground", type: "button", onClick: open, disabled: isUploadingFiles, children: _jsx(Plus, { className: "h-5 w-5 text-muted-foreground hover:text-foreground" }) }) }), _jsx(TooltipContent, { children: "Add Attachment" })] }), _jsx("div", { ref: inputRef, contentEditable: true, suppressContentEditableWarning: true, onKeyDown: handleKeyDown, onPaste: handlePaste, onInput: updateComposerState, className: "min-h-[44px] max-h-[300px] min-w-0 flex-1 overflow-y-auto break-words bg-transparent py-[11px] text-[15px] text-foreground outline-none", "data-placeholder": composerPlaceholder }), _jsxs("div", { className: "flex items-center gap-1 pb-2", children: [[
                                            { icon: Gift, label: 'Gift' },
                                            { icon: Image, label: 'GIF' },
                                        ].map(({ icon: Icon, label }) => (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { className: "cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground", type: "button", children: _jsx(Icon, { className: "w-5 h-5 text-muted-foreground hover:text-foreground" }) }) }), _jsx(TooltipContent, { children: label })] }, label))), _jsx(EmojiPicker, { align: "end", onSelect: insertEmoji, trigger: (_jsx("button", { className: "cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground", type: "button", children: _jsx(Smile, { className: "w-5 h-5 text-muted-foreground hover:text-foreground" }) })) })] })] }), typingUsers.length > 0 && (_jsxs("p", { className: "px-3 pb-2 text-xs italic text-muted-foreground", children: [typingUsers.join(', '), " \u0111ang nh\u1EAFn tin..."] }))] }) })] }));
};
//# sourceMappingURL=DashboardView.js.map