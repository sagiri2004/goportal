import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * LoginForm Component
 *
 * Form to log in with username and password.
 * Validates input, shows field errors, and handles API errors.
 */
import { useState } from 'react';
import { Button, Input, Label } from '@goportal/ui';
import { useLogin } from '../hooks/useLogin';
import { cn } from '@goportal/ui';
import { AUTH_ERROR_CODES } from '@goportal/types';
export const LoginForm = ({ onSuccess, onSwitchToRegister }) => {
    const [form, setForm] = useState({ username: '', password: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const login = useLogin();
    const validate = () => {
        const errors = {};
        if (form.username.trim().length < 3) {
            errors.username = 'Username must be at least 3 characters';
        }
        if (form.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }
        return errors;
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        const errors = validate();
        if (Object.keys(errors).length) {
            setFieldErrors(errors);
            return;
        }
        login.mutate({ username: form.username.trim(), password: form.password }, {
            onSuccess,
            onError: (err) => {
                const code = err?.response?.data?.code;
                if (code === AUTH_ERROR_CODES.BAD_CREDENTIALS) {
                    setFieldErrors({ password: 'Invalid username or password' });
                }
                else {
                    setFieldErrors({ password: 'An error occurred. Please try again.' });
                }
            },
        });
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "username", className: "text-xs font-semibold uppercase tracking-wide", children: "Username" }), _jsx(Input, { id: "username", value: form.username, onChange: (e) => {
                            setForm((f) => ({ ...f, username: e.target.value }));
                            setFieldErrors((e) => ({ ...e, username: undefined }));
                        }, placeholder: "Enter your username", autoComplete: "username", disabled: login.isPending, className: cn(fieldErrors.username && 'border-destructive focus-visible:ring-destructive') }), fieldErrors.username && _jsx("p", { className: "text-xs text-destructive", children: fieldErrors.username })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "password", className: "text-xs font-semibold uppercase tracking-wide", children: "Password" }), _jsx(Input, { id: "password", type: "password", value: form.password, onChange: (e) => {
                            setForm((f) => ({ ...f, password: e.target.value }));
                            setFieldErrors((e) => ({ ...e, password: undefined }));
                        }, placeholder: "Enter your password", autoComplete: "current-password", disabled: login.isPending, className: cn(fieldErrors.password && 'border-destructive focus-visible:ring-destructive') }), fieldErrors.password && _jsx("p", { className: "text-xs text-destructive", children: fieldErrors.password })] }), _jsx(Button, { type: "submit", className: "w-full", disabled: login.isPending, children: login.isPending ? 'Logging in...' : 'Log In' }), _jsxs("p", { className: "text-xs text-muted-foreground text-center", children: ["Need an account?", ' ', _jsx("button", { type: "button", onClick: onSwitchToRegister, className: "text-primary hover:underline font-medium", children: "Register" })] })] }));
};
//# sourceMappingURL=LoginForm.js.map