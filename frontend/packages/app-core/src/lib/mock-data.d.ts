import type { Message } from './message-types';
export type MockServer = {
    id: string;
    name: string;
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
export type MockMemberStatus = 'online' | 'idle' | 'dnd' | 'offline';
export type MockMember = {
    id: string;
    name: string;
    initials: string;
    color: string;
    status: MockMemberStatus;
    role: string;
};
export type MockMessage = Message;
export declare const mockServers: MockServer[];
export declare const mockChannels: Record<string, {
    categories: MockCategory[];
}>;
export declare const mockMembers: MockMember[];
export declare const mockMessages: Record<string, MockMessage[]>;
//# sourceMappingURL=mock-data.d.ts.map