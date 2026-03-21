import React from 'react';
type ServerRailProps = {
    activeServerId?: string;
    onSelectServer?: (serverId: string) => void;
    onCreateServer?: () => void;
    servers?: Array<{
        id: string;
        name: string;
        initials?: string;
        color?: string;
        iconUrl?: string;
    }>;
};
/**
 * ServerRail - Left sidebar with server list (72px wide)
 *
 * Layout:
 * - Top: Create server button + divider
 * - Middle: Server icons (w-12 h-12, rounded-[24px], active has left accent bar + rounded-[16px])
 * - Bottom: Utility actions (no user card; handled by ChannelSidebar UserPanel)
 */
export declare const ServerRail: React.FC<ServerRailProps>;
export {};
//# sourceMappingURL=ServerRail.d.ts.map