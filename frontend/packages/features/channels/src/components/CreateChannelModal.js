import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Button, Input, Label, } from '@goportal/ui';
import { Hash, Volume2 } from 'lucide-react';
export const CreateChannelModal = ({ isOpen, onOpenChange, onCreate, }) => {
    const [channelType, setChannelType] = useState('TEXT');
    const [name, setName] = useState('');
    const [nameError, setNameError] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const placeholder = useMemo(() => (channelType === 'TEXT' ? 'text-channel' : 'voice-channel'), [channelType]);
    const normalizeName = (value) => value.toLowerCase().trim().replace(/\s+/g, '-');
    const resetState = () => {
        setName('');
        setChannelType('TEXT');
        setNameError(null);
        setSubmitError(null);
        setIsSubmitting(false);
    };
    const validate = (value) => {
        const trimmed = value.trim();
        if (!trimmed) {
            return 'Tên kênh là bắt buộc.';
        }
        if (trimmed.length < 2) {
            return 'Tên kênh phải có ít nhất 2 ký tự.';
        }
        if (trimmed.length > 100) {
            return 'Tên kênh không được vượt quá 100 ký tự.';
        }
        return null;
    };
    const handleOpenChange = (open) => {
        onOpenChange(open);
        if (!open) {
            resetState();
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);
        const normalized = normalizeName(name);
        const validationError = validate(normalized);
        if (validationError) {
            setNameError(validationError);
            return;
        }
        setNameError(null);
        const body = {
            name: normalized.trim(),
            type: channelType,
        };
        setIsSubmitting(true);
        try {
            await onCreate(body);
            handleOpenChange(false);
        }
        catch (error) {
            setSubmitError(error?.message ?? 'Không thể tạo kênh. Vui lòng thử lại.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx(Dialog, { open: isOpen, onOpenChange: handleOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "T\u1EA1o K\u00EAnh" }), _jsx(DialogDescription, { children: "T\u1EA1o k\u00EAnh v\u0103n b\u1EA3n ho\u1EB7c tho\u1EA1i cho server n\u00E0y." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "channel-name", children: "Lo\u1EA1i K\u00EAnh" }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("button", { type: "button", onClick: () => setChannelType('TEXT'), className: `flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${channelType === 'TEXT'
                                                ? 'border-indigo-500 bg-indigo-500/15 text-foreground'
                                                : 'border-border bg-background text-muted-foreground hover:text-foreground'}`, children: [_jsx(Hash, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-medium", children: "Text Channel" })] }), _jsxs("button", { type: "button", onClick: () => setChannelType('VOICE'), className: `flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${channelType === 'VOICE'
                                                ? 'border-indigo-500 bg-indigo-500/15 text-foreground'
                                                : 'border-border bg-background text-muted-foreground hover:text-foreground'}`, children: [_jsx(Volume2, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-medium", children: "Voice Channel" })] })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "channel-name", children: "T\u00EAn K\u00EAnh" }), _jsx(Input, { id: "channel-name", placeholder: placeholder, value: name, onChange: (e) => {
                                        const next = normalizeName(e.target.value).slice(0, 100);
                                        setName(next);
                                        setNameError(validate(next));
                                    }, disabled: isSubmitting, maxLength: 100, autoFocus: true }), nameError && _jsx("p", { className: "text-xs text-red-400", children: nameError })] }), submitError && _jsx("p", { className: "text-xs text-red-400", children: submitError }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => handleOpenChange(false), disabled: isSubmitting, children: "H\u1EE7y" }), _jsx(Button, { type: "submit", disabled: isSubmitting, children: isSubmitting ? 'Đang tạo...' : 'Tạo kênh' })] })] })] }) }));
};
//# sourceMappingURL=CreateChannelModal.js.map