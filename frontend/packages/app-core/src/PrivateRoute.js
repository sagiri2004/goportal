import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Private Route
 *
 * Route guard that redirects unauthenticated users to login.
 * Uses Zustand auth store to check token and user state.
 */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
// @ts-ignore: external package '@goportal/store' has no local type declarations
import { useAuthStore } from '@goportal/store';
import { hydrateSession } from './services/auth';
export const PrivateRoute = ({ children }) => {
    const [isHydrated, setIsHydrated] = useState(false);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const token = useAuthStore((state) => state.token);
    useEffect(() => {
        let isMounted = true;
        const restore = async () => {
            await hydrateSession();
            if (isMounted) {
                // Zustand's persist middleware hydrates on mount
                setIsHydrated(true);
            }
        };
        void restore();
        return () => {
            isMounted = false;
        };
    }, []);
    // Wait for hydration before checking auth
    if (!isHydrated) {
        return _jsx("div", { className: "h-screen bg-background" });
    }
    if (!isAuthenticated || !token) {
        return _jsx(Navigate, { to: "/auth/login", replace: true });
    }
    return _jsx(_Fragment, { children: children });
};
//# sourceMappingURL=PrivateRoute.js.map