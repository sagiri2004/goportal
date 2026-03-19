import type { AuthUser, LoginResponseData } from '@goportal/types';
import type { User } from '@goportal/types';
export declare const simulateDelay: (ms?: number) => Promise<void>;
export declare const mockCurrentUser: User & {
    name: string;
    initials: string;
    color: string;
    avatarUrl?: string;
};
export declare const mockUsers: User[];
export declare const mockAuthUser: AuthUser;
export declare const mockAuthCredentials: {
    username: string;
    password: string;
}[];
export declare const mockLoginResponse: LoginResponseData;
//# sourceMappingURL=user.d.ts.map