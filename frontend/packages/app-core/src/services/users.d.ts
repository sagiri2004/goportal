import type { AuthUser } from '@goportal/types';
export declare const updateMyProfile: (body: {
    username?: string;
    avatar_url?: string;
}) => Promise<AuthUser>;
export declare const uploadUserAvatar: (file: File, onProgress?: (progress: number) => void) => Promise<string>;
//# sourceMappingURL=users.d.ts.map