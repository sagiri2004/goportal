import type { ChannelDTO, ServerDTO } from '@goportal/types';
export type MockServer = {
    id: string;
    name: string;
    ownerId?: string;
    initials: string;
    color: string;
    bannerUrl?: string;
    iconUrl?: string;
    boostLevel?: number;
};
export type MockChannel = {
    id: string;
    name: string;
    type: 'text' | 'voice';
    unread: number;
    activeMembers?: Array<{
        id: string;
        name?: string;
        avatarUrl?: string;
        initials: string;
        color: string;
        isStreaming?: boolean;
    }>;
    liveLabel?: string;
    isLive?: boolean;
};
export type MockCategory = {
    id: string;
    name: string;
    channels: MockChannel[];
};
export declare const mockServers: MockServer[];
export declare const mockChannels: Record<string, {
    categories: MockCategory[];
}>;
export declare const mockServersData: ServerDTO[];
export declare const mockChannelsData: ChannelDTO[];
//# sourceMappingURL=servers.d.ts.map