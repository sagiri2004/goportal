import React from 'react';
type ChannelSidebarProps = {
    serverId: string;
    serverName: string;
    activeChannelId?: string;
    onSelectChannel: (channelId: string) => void;
    onCreateChannel: () => void;
};
/**
 * ChannelSidebar - Left sidebar showing channels for a server
 */
export declare const ChannelSidebar: React.FC<ChannelSidebarProps>;
export {};
//# sourceMappingURL=ChannelSidebar.d.ts.map