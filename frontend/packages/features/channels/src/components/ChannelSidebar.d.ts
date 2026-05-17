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
            type: 'text' | 'voice' | 'livestream';
            unread: number;
            activeMembers?: ChannelMember[];
            liveLabel?: string;
            isLive?: boolean;
        }>;
    }>;
    activeChannelId?: string;
    activeVoiceChannelId?: string;
    onSelectChannel?: (channelId: string, type: 'text' | 'voice' | 'livestream', channelName?: string) => void;
    onCreateChannel?: () => void;
    onInviteMember?: () => void;
    onOpenServerSettings?: () => void;
    onOpenServerMembers?: () => void;
    onOpenUserSettings?: () => void;
    voiceState?: {
        channelId: string;
        channelName: string;
        serverId: string;
        serverName: string;
    } | null;
    onLeaveVoiceChannel?: () => void;
    onLogout?: () => void;
    tournaments?: Array<{
        id: string;
        name: string;
        status: 'draft' | 'registration' | 'check_in' | 'in_progress' | 'completed' | 'cancelled';
    }>;
    onSelectTournament?: (tournamentId: string) => void;
    onCreateTournament?: () => void;
    canCreateTournament?: boolean;
    tournamentChannelTree?: Array<{
        id: string;
        name: string;
        status: 'draft' | 'registration' | 'check_in' | 'in_progress' | 'completed' | 'cancelled';
        generalTextChannelId?: string | null;
        generalChannel?: {
            id: string;
            name: string;
            type: 'text' | 'voice' | 'livestream';
            role: 'general' | 'team-a' | 'team-b' | 'caster' | 'referee' | 'spectator' | 'livestream';
            unread: number;
            activeMembers?: ChannelMember[];
            liveLabel?: string;
            isLive?: boolean;
        } | null;
        matches: Array<{
            matchId: string;
            round: number;
            matchNumber: number;
            label: string;
            channels: Array<{
                id: string;
                name: string;
                type: 'text' | 'voice' | 'livestream';
                role: 'general' | 'team-a' | 'team-b' | 'caster' | 'referee' | 'spectator' | 'livestream';
                unread: number;
                activeMembers?: ChannelMember[];
                liveLabel?: string;
                isLive?: boolean;
            }>;
        }>;
    }>;
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