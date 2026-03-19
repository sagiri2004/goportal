/**
 * Auth Store
 *
 * Manages:
 * - Current user data and token
 * - Authentication state (isAuthenticated, isLoading)
 * - Auth errors
 *
 * Persists to localStorage via Zustand persist middleware
 */
import type { AuthUser, AuthErrorCode } from '@goportal/types';
type AuthState = {
    token: string | null;
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: AuthErrorCode | null;
    setToken: (token: string | null) => void;
    setUser: (user: AuthUser | null) => void;
    setIsLoading: (loading: boolean) => void;
    setError: (error: AuthErrorCode | null) => void;
    clearError: () => void;
    logout: () => void;
};
export declare const useAuthStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<AuthState>, "setState" | "persist"> & {
    setState(partial: AuthState | Partial<AuthState> | ((state: AuthState) => AuthState | Partial<AuthState>), replace?: false | undefined): unknown;
    setState(state: AuthState | ((state: AuthState) => AuthState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AuthState, {
            token: string | null;
            user: AuthUser | null;
            isAuthenticated: boolean;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AuthState) => void) => () => void;
        onFinishHydration: (fn: (state: AuthState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AuthState, {
            token: string | null;
            user: AuthUser | null;
            isAuthenticated: boolean;
        }, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=auth.store.d.ts.map