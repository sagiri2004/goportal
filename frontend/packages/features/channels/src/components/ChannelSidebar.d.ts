import React from 'react';
type ChannelSidebarProps = {
    serverId?: string;
    serverName?: string;
    serverInitials?: string;
    serverColor?: string;
    serverBannerUrl?: string;
    serverIconUrl?: string;
    serverBoostLevel?: number;
    categories?: Array<{
        id: string;
        name: string;
        channels: Array<{
            id: string;
            name: string;
            type: 'text' | 'voice';
            unread: number;
            activeMembers?: ChannelMember[];
            liveLabel?: string;
            isLive?: boolean;
        }>;
    }>;
    activeChannelId?: string;
    onSelectChannel?: (channelId: string, type: 'text' | 'voice') => void;
    onCreateChannel?: () => void;
    onInviteMember?: () => void;
    isInVoiceChannel?: boolean;
    activeVoiceChannelName?: string;
};
type ChannelMember = {
    id: string;
    name?: string;
    avatarUrl?: string;
    initials: string;
    color: string;
    isStreaming?: boolean;
};
/**
 * ChannelSidebar - 240px wide sidebar showing channels for a server
 */
export declare const ChannelSidebar: React.FC<ChannelSidebarProps>;
export {};
//# sourceMappingURL=ChannelSidebar.d.ts.map