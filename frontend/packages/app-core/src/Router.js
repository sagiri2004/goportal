import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { PrivateRoute } from './PrivateRoute';
import { AppShell } from './layout/AppShell';
import { AuthView } from '@goportal/feature-auth';
import { DashboardView } from '@goportal/feature-dashboard';
export const Router = () => {
    const handleAuthSuccess = () => {
        window.location.href = '/app';
    };
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/auth/*", element: _jsx(AuthLayout, { children: _jsx(AuthView, { onAuthenticated: handleAuthSuccess }) }) }), _jsx(Route, { path: "/app/*", element: _jsx(PrivateRoute, { children: _jsx(AppShell, { children: _jsx(DashboardView, {}) }) }) }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/app", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/auth/login", replace: true }) })] }) }));
};
//# sourceMappingURL=Router.js.map