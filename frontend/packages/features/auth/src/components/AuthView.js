import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AuthView Component
 *
 * Main auth view that toggles between login and register forms.
 */
import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
export const AuthView = ({ onAuthenticated }) => {
    const [mode, setMode] = useState('login');
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-background", children: _jsxs("div", { className: "w-full max-w-md bg-[hsl(240,6%,10%)] rounded-lg shadow-2xl px-8 py-10 space-y-6", children: [_jsxs("div", { className: "text-center space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold text-foreground", children: mode === 'login' ? 'Welcome back!' : 'Create an account' }), _jsx("p", { className: "text-sm text-muted-foreground", children: mode === 'login'
                                ? "We're so excited to see you again!"
                                : 'Join your friends on GoPortal.' })] }), mode === 'login' ? (_jsx(LoginForm, { onSuccess: onAuthenticated, onSwitchToRegister: () => setMode('register') })) : (_jsx(RegisterForm, { onSuccess: () => setMode('login'), onSwitchToLogin: () => setMode('login') }))] }) }));
};
//# sourceMappingURL=AuthView.js.map