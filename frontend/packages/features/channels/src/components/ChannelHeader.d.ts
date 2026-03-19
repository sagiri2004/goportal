import React from 'react';
import type { ChannelDTO } from '@goportal/types';
type ChannelHeaderProps = {
    channel?: ChannelDTO;
    topic?: string;
    showMembers?: boolean;
    onToggleMembers?: () => void;
};
export declare const ChannelHeader: React.FC<ChannelHeaderProps>;
export {};
//# sourceMappingURL=ChannelHeader.d.ts.map