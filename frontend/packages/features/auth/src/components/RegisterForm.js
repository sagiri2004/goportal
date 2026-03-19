import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * RegisterForm Component
 *
 * Form to register a new account with username and password.
 * Validates input, shows field errors, and handles API errors.
 */
import { useState } from 'react';
import { Button, Input, Label } from '@goportal/ui';
import { useRegister } from '../hooks/useRegister';
import { cn } from '@goportal/ui';
import { AUTH_ERROR_CODES } from '@goportal/types';
export const RegisterForm = ({ onSuccess, onSwitchToLogin }) => {
    const [form, setForm] = useState({ username: '', password: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const register = useRegister();
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
        register.mutate({ username: form.username.trim(), password: form.password }, {
            onSuccess: () => {
                // Clear form and switch to login
                setForm({ username: '', password: '' });
                setFieldErrors({});
                onSuccess();
            },
            onError: (err) => {
                const code = err?.response?.data?.code;
                if (code === AUTH_ERROR_CODES.USERNAME_EXISTS) {
                    setFieldErrors({ username: 'This username is already taken' });
                }
                else {
                    setFieldErrors({ username: 'An error occurred. Please try again.' });
                }
            },
        });
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "reg-username", className: "text-xs font-semibold uppercase tracking-wide", children: "Username" }), _jsx(Input, { id: "reg-username", value: form.username, onChange: (e) => {
                            setForm((f) => ({ ...f, username: e.target.value }));
                            setFieldErrors((e) => ({ ...e, username: undefined }));
                        }, placeholder: "Choose a username", autoComplete: "username", disabled: register.isPending, className: cn(fieldErrors.username && 'border-destructive focus-visible:ring-destructive') }), fieldErrors.username && _jsx("p", { className: "text-xs text-destructive", children: fieldErrors.username })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "reg-password", className: "text-xs font-semibold uppercase tracking-wide", children: "Password" }), _jsx(Input, { id: "reg-password", type: "password", value: form.password, onChange: (e) => {
                            setForm((f) => ({ ...f, password: e.target.value }));
                            setFieldErrors((e) => ({ ...e, password: undefined }));
                        }, placeholder: "Create a password", autoComplete: "new-password", disabled: register.isPending, className: cn(fieldErrors.password && 'border-destructive focus-visible:ring-destructive') }), fieldErrors.password && _jsx("p", { className: "text-xs text-destructive", children: fieldErrors.password })] }), _jsx(Button, { type: "submit", className: "w-full", disabled: register.isPending, children: register.isPending ? 'Creating account...' : 'Create Account' }), _jsxs("p", { className: "text-xs text-muted-foreground text-center", children: ["Already have an account?", ' ', _jsx("button", { type: "button", onClick: onSwitchToLogin, className: "text-primary hover:underline font-medium", children: "Log In" })] })] }));
};
//# sourceMappingURL=RegisterForm.js.map