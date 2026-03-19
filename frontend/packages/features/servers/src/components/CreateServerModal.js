import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Button, Input, Label, } from '@goportal/ui';
import { useCreateServer } from '../hooks/useServers';
export const CreateServerModal = ({ isOpen, onOpenChange, onSuccess, }) => {
    const [form, setForm] = useState({
        name: '',
        is_public: true,
    });
    const [error, setError] = useState();
    const createServer = useCreateServer();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(undefined);
        if (!form.name.trim()) {
            setError('Server name is required');
            return;
        }
        createServer.mutate(form, {
            onSuccess: () => {
                setForm({ name: '', is_public: true });
                onOpenChange(false);
                onSuccess?.();
            },
            onError: (err) => {
                setError(err?.message || 'Failed to create server');
            },
        });
    };
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Create Server" }), _jsx(DialogDescription, { children: "Create a new server to organize your community" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "server-name", children: "Server Name" }), _jsx(Input, { id: "server-name", placeholder: "My Awesome Server", value: form.name, onChange: (e) => setForm(f => ({ ...f, name: e.target.value })), disabled: createServer.isPending, autoFocus: true })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: "public", checked: form.is_public, onChange: (e) => setForm(f => ({ ...f, is_public: e.target.checked })), disabled: createServer.isPending, className: "w-4 h-4 rounded border-input" }), _jsx(Label, { htmlFor: "public", className: "!mt-0 cursor-pointer", children: "Make this server public" })] }), error && (_jsx("p", { className: "text-xs text-destructive", children: error })), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), disabled: createServer.isPending, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: createServer.isPending, children: createServer.isPending ? 'Creating...' : 'Create' })] })] })] }) }));
};
//# sourceMappingURL=CreateServerModal.js.map