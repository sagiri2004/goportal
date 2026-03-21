import type { CreateServerRequest } from '@goportal/types';
import type { MockServer } from '../mock/servers';
export type InvitePreviewDTO = {
    invite_code: string;
    expires_at?: number | null;
    server: {
        id: string;
        name: string;
        icon_url?: string;
        member_count: number;
    };
};
export declare const getServers: () => Promise<MockServer[]>;
export declare const getServerById: (serverId: string) => Promise<MockServer | null>;
export declare const createServer: (body: CreateServerRequest) => Promise<MockServer>;
export declare const joinServer: (serverId: string) => Promise<void>;
export declare const getInvitePreview: (code: string) => Promise<InvitePreviewDTO>;
export declare const joinByInviteCode: (code: string) => Promise<MockServer>;
//# sourceMappingURL=servers.d.ts.map