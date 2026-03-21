import type { Message as UIMessage } from '../lib/message-types';
type MessagePage = {
    items: UIMessage[];
    limit: number;
    offset: number;
};
export declare const getMessages: (channelId: string, opts?: {
    limit?: number;
    offset?: number;
}) => Promise<MessagePage>;
export declare const sendMessage: (channelId: string, content: string, attachmentIds?: string[], replyToId?: string | null) => Promise<UIMessage>;
export declare const updateMessage: (messageId: string, content: string) => Promise<UIMessage>;
export declare const deleteMessage: (messageId: string) => Promise<void>;
export declare const addReaction: (messageId: string, emoji: string) => Promise<void>;
export declare const removeReaction: (messageId: string, emoji: string) => Promise<void>;
export declare const uploadMessageAttachment: (file: File, onProgress?: (progress: number) => void) => Promise<{
    attachmentId: string;
    url: string;
}>;
export {};
//# sourceMappingURL=messages.d.ts.map