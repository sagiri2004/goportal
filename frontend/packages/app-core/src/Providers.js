import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Create a client for React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
        },
    },
});
export const Providers = ({ children }) => {
    return (_jsx(QueryClientProvider, { client: queryClient, children: children }));
};
//# sourceMappingURL=Providers.js.map