export declare const apiClient: {
    get: <T>(path: string, headers?: Record<string, string>) => Promise<T>;
    post: <T>(path: string, body?: unknown, headers?: Record<string, string>) => Promise<T>;
    patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) => Promise<T>;
    put: <T>(path: string, body?: unknown, headers?: Record<string, string>) => Promise<T>;
    delete: <T>(path: string, headers?: Record<string, string>) => Promise<T>;
};
//# sourceMappingURL=api-client.d.ts.map