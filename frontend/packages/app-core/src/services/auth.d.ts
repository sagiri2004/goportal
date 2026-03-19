import type { AuthUser, LoginRequest, LoginResponseData, RegisterRequest } from '@goportal/types';
export declare const clearSession: () => void;
export declare const register: (body: RegisterRequest) => Promise<AuthUser>;
export declare const login: (body: LoginRequest) => Promise<LoginResponseData>;
export declare const getCurrentUser: () => Promise<AuthUser>;
export declare const hydrateSession: () => Promise<AuthUser | null>;
export declare const logout: () => Promise<void>;
//# sourceMappingURL=auth.d.ts.map