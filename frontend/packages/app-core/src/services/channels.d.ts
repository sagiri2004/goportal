import type { CreateChannelRequest } from '@goportal/types';
import { type MockCategory, type MockChannel } from '../mock/servers';
type ChannelsResult = {
    categories: MockCategory[];
};
export declare const getChannels: (serverId: string) => Promise<ChannelsResult>;
export declare const createChannel: (serverId: string, body: CreateChannelRequest) => Promise<MockChannel>;
export type ChannelNotificationLevel = 'all' | 'mentions_only' | 'none';
export type ChannelNotificationSetting = {
    user_id: string;
    channel_id: string;
    level: ChannelNotificationLevel;
    muted_until?: string | null;
};
export declare const markChannelRead: (channelId: string) => Promise<void>;
export declare const getChannelNotificationSetting: (channelId: string) => Promise<ChannelNotificationSetting>;
export declare const updateChannelNotificationSetting: (channelId: string, body: {
    level: ChannelNotificationLevel;
    muted_until: string | null;
}) => Promise<ChannelNotificationSetting>;
export {};
//# sourceMappingURL=channels.d.ts.map