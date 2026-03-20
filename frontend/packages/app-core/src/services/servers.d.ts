import type { CreateServerRequest } from '@goportal/types';
import type { MockServer } from '../mock/servers';
export declare const getServers: () => Promise<MockServer[]>;
export declare const getServerById: (serverId: string) => Promise<MockServer | null>;
export declare const createServer: (body: CreateServerRequest) => Promise<MockServer>;
export declare const joinServer: (serverId: string) => Promise<void>;
//# sourceMappingURL=servers.d.ts.map