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
export declare const sendMessage: (channelId: string, content: string) => Promise<UIMessage>;
export {};
//# sourceMappingURL=messages.d.ts.map