/**
 * Private Route
 *
 * Route guard that redirects unauthenticated users to login.
 * Uses Zustand auth store to check token and user state.
 */
import React from 'react';
type PrivateRouteProps = {
    children: React.ReactNode;
};
export declare const PrivateRoute: React.FC<PrivateRouteProps>;
export {};
//# sourceMappingURL=PrivateRoute.d.ts.map