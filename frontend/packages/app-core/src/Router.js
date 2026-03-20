import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * App Router
 *
 * Main routing setup for the application:
 * - Public routes: /auth/login, /auth/register
 * - Protected routes: /app/* (all require authentication)
 * - Fallback: redirect to /auth/login
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { PrivateRoute } from './PrivateRoute';
import { AppShell } from './layout/AppShell';
import { AuthView } from '@goportal/feature-auth';
import { DashboardView, VoiceChannelView } from '@goportal/feature-dashboard';
import { MessageCircle, Plus, Search, MessagesSquare } from 'lucide-react';
import { getChannels, getServers } from './services';
import { APP_NAME } from '@goportal/config';
const readLastVisited = () => {
    try {
        const raw = localStorage.getItem('last_visited');
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed.serverId || !parsed.channelId) {
            return null;
        }
        return {
            serverId: parsed.serverId,
            channelId: parsed.channelId,
        };
    }
    catch {
        return null;
    }
};
const AppIndexRedirect = () => {
    const navigate = useNavigate();
    React.useEffect(() => {
        let cancelled = false;
        const resolveRedirect = async () => {
            try {
                const servers = await getServers();
                if (cancelled) {
                    return;
                }
                if (servers.length === 0) {
                    navigate('/app/@me', { replace: true });
                    return;
                }
                const last = readLastVisited();
                const validLast = last && servers.find((server) => server.id === last.serverId);
                if (validLast && last) {
                    navigate(`/app/servers/${last.serverId}/channels/${last.channelId}`, { replace: true });
                    return;
                }
                const first = servers[0];
                const channels = await getChannels(first.id);
                if (cancelled) {
                    return;
                }
                const flatChannels = channels.categories.flatMap((category) => category.channels);
                const firstText = flatChannels.find((channel) => channel.type === 'text') ?? flatChannels[0];
                if (!firstText) {
                    navigate('/app/@me', { replace: true });
                    return;
                }
                navigate(`/app/servers/${first.id}/channels/${firstText.id}`, { replace: true });
            }
            catch {
                navigate('/app/@me', { replace: true });
            }
        };
        void resolveRedirect();
        return () => {
            cancelled = true;
        };
    }, [navigate]);
    return (_jsx("div", { className: "flex h-full w-full items-center justify-center", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" }) }));
};
const DMHomePage = () => {
    const { serverCount, shouldShowOnboarding, dismissOnboarding, openCreateServerModal, showDevelopingToast, } = useOutletContext();
    if (serverCount === 0 && shouldShowOnboarding) {
        return (_jsx("div", { className: "flex-1 flex flex-col items-center justify-center px-8", children: _jsxs("div", { className: "w-full max-w-xl rounded-xl border border-border bg-background px-8 py-10 text-center", children: [_jsx("div", { className: "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent", children: _jsx(MessageCircle, { className: "w-8 h-8 text-foreground" }) }), _jsxs("h2", { className: "text-2xl font-bold text-foreground", children: ["Ch\u00E0o m\u1EEBng \u0111\u1EBFn v\u1EDBi ", APP_NAME, "!"] }), _jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "N\u01A1i \u0111\u1EC3 chat, call v\u00E0 k\u1EBFt n\u1ED1i c\u00F9ng b\u1EA1n b\u00E8 v\u00E0 c\u1ED9ng \u0111\u1ED3ng." }), _jsxs("div", { className: "mt-6 flex items-center justify-center gap-3", children: [_jsxs("button", { type: "button", onClick: openCreateServerModal, className: "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90", children: [_jsx(Plus, { className: "w-4 h-4" }), "T\u1EA1o Server"] }), _jsxs("button", { type: "button", onClick: showDevelopingToast, className: "inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent", children: [_jsx(Search, { className: "w-4 h-4" }), "Kh\u00E1m ph\u00E1 Server"] })] }), _jsxs("div", { className: "mt-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground", children: [_jsx("div", { className: "h-px flex-1 bg-border" }), _jsx("span", { children: "Ho\u1EB7c" }), _jsx("div", { className: "h-px flex-1 bg-border" })] }), _jsxs("button", { type: "button", onClick: dismissOnboarding, className: "mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground", children: [_jsx(MessagesSquare, { className: "w-4 h-4" }), "Nh\u1EAFn tin tr\u1EF1c ti\u1EBFp v\u1EDBi b\u1EA1n b\u00E8"] })] }) }));
    }
    return (_jsxs("div", { className: "flex-1 flex flex-col items-center justify-center gap-3 text-center px-8", children: [_jsx(MessageCircle, { className: "w-12 h-12 text-muted-foreground" }), _jsx("h2", { className: "text-xl font-semibold text-foreground", children: "Tin nh\u1EAFn tr\u1EF1c ti\u1EBFp" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Ch\u1ECDn m\u1ED9t cu\u1ED9c tr\u00F2 chuy\u1EC7n ho\u1EB7c t\u00ECm b\u1EA1n b\u00E8 \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u." })] }));
};
export const Router = () => {
    const handleAuthSuccess = () => {
        window.location.href = '/app';
    };
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/auth/*", element: _jsx(AuthLayout, { children: _jsx(AuthView, { onAuthenticated: handleAuthSuccess }) }) }), _jsxs(Route, { path: "/app", element: _jsx(PrivateRoute, { children: _jsx(AppShell, {}) }), children: [_jsx(Route, { index: true, element: _jsx(AppIndexRedirect, {}) }), _jsx(Route, { path: "@me", element: _jsx(DMHomePage, {}) }), _jsx(Route, { path: "servers/:serverId/channels/:channelId", element: _jsx(DashboardView, {}) }), _jsx(Route, { path: "servers/:serverId/voice/:channelId", element: _jsx(VoiceChannelView, {}) })] }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/app", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/auth/login", replace: true }) })] }) }));
};
//# sourceMappingURL=Router.js.map