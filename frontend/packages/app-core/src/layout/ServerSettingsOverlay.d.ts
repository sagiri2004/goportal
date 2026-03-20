import React from 'react';
import type { MockServer } from '../mock/servers';
type SettingsTab = 'profile' | 'identity' | 'interactions' | 'members' | 'roles' | 'invites' | 'audit';
type Props = {
    open: boolean;
    initialTab?: SettingsTab;
    serverId: string;
    server: MockServer;
    onClose: () => void;
    onServerUpdated: (serverId: string) => Promise<void>;
    onToast: (message: string) => void;
};
export declare const ServerSettingsOverlay: React.FC<Props>;
export {};
//# sourceMappingURL=ServerSettingsOverlay.d.ts.map