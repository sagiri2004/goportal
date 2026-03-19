import type { CreateChannelRequest } from '@goportal/types';
import { type MockCategory, type MockChannel } from '../mock/servers';
type ChannelsResult = {
    categories: MockCategory[];
};
export declare const getChannels: (serverId: string) => Promise<ChannelsResult>;
export declare const createChannel: (serverId: string, body: CreateChannelRequest) => Promise<MockChannel>;
export {};
//# sourceMappingURL=channels.d.ts.map