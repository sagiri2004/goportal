import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, Button, Input, Label, } from '@goportal/ui';
import { ArrowLeft, Camera, Loader2, Users, Globe } from 'lucide-react';
const parseInviteCode = (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
        return '';
    }
    try {
        const url = new URL(trimmed);
        const segments = url.pathname.split('/').filter(Boolean);
        const inviteIndex = segments.findIndex((segment) => segment.toLowerCase() === 'invite');
        if (inviteIndex >= 0 && segments[inviteIndex + 1]) {
            return segments[inviteIndex + 1];
        }
        return segments[segments.length - 1] ?? '';
    }
    catch {
        return trimmed.replace(/^.*\/invite\//i, '').split('?')[0].split('#')[0];
    }
};
export const CreateServerModal = ({ isOpen, onOpenChange, defaultServerName, onCreate, onResolveInvitePreview, onJoinByInvite, initialInviteCode, }) => {
    const [step, setStep] = useState('type');
    const [serverType, setServerType] = useState(null);
    const [form, setForm] = useState({
        name: defaultServerName,
        is_public: true,
    });
    const [iconPreviewUrl, setIconPreviewUrl] = useState(null);
    const [iconFile, setIconFile] = useState(null);
    const [nameError, setNameError] = useState();
    const [submitError, setSubmitError] = useState();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inviteInput, setInviteInput] = useState('');
    const [invitePreview, setInvitePreview] = useState(null);
    const [inviteError, setInviteError] = useState(null);
    const [isResolvingInvite, setIsResolvingInvite] = useState(false);
    const [isJoiningInvite, setIsJoiningInvite] = useState(false);
    const fileInputRef = useRef(null);
    const autoResolvedInviteCodeRef = useRef(null);
    useEffect(() => {
        if (!isOpen) {
            autoResolvedInviteCodeRef.current = null;
            return;
        }
        const prefilledInviteCode = initialInviteCode ? parseInviteCode(initialInviteCode) : '';
        setStep(prefilledInviteCode ? 'join-input' : 'type');
        setServerType(null);
        setForm({
            name: defaultServerName,
            is_public: true,
        });
        setIconPreviewUrl(null);
        setIconFile(null);
        setNameError(undefined);
        setSubmitError(undefined);
        setIsSubmitting(false);
        setInviteInput(prefilledInviteCode);
        setInvitePreview(null);
        setInviteError(null);
        setIsResolvingInvite(false);
        setIsJoiningInvite(false);
        autoResolvedInviteCodeRef.current = null;
    }, [defaultServerName, initialInviteCode, isOpen]);
    useEffect(() => {
        if (!isOpen || !onResolveInvitePreview || step !== 'join-input') {
            return;
        }
        const prefilledInviteCode = initialInviteCode ? parseInviteCode(initialInviteCode) : '';
        if (!prefilledInviteCode || autoResolvedInviteCodeRef.current === prefilledInviteCode) {
            return;
        }
        autoResolvedInviteCodeRef.current = prefilledInviteCode;
        let cancelled = false;
        setInviteError(null);
        setIsResolvingInvite(true);
        void onResolveInvitePreview(prefilledInviteCode)
            .then((preview) => {
            if (cancelled) {
                return;
            }
            setInvitePreview(preview);
            setStep('join-preview');
        })
            .catch((error) => {
            if (cancelled) {
                return;
            }
            setInviteError(error instanceof Error ? error.message : 'Mã mời không hợp lệ hoặc đã hết hạn');
        })
            .finally(() => {
            if (!cancelled) {
                setIsResolvingInvite(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [initialInviteCode, isOpen, onResolveInvitePreview, step]);
    useEffect(() => {
        return () => {
            if (iconPreviewUrl) {
                URL.revokeObjectURL(iconPreviewUrl);
            }
        };
    }, [iconPreviewUrl]);
    const handleChooseType = (type) => {
        setServerType(type);
        setForm((previous) => ({
            ...previous,
            is_public: type === 'community',
        }));
        setStep('details');
    };
    const validateName = (value) => {
        const trimmed = value.trim();
        if (!trimmed) {
            return 'Tên server là bắt buộc.';
        }
        if (trimmed.length < 2) {
            return 'Tên server phải có ít nhất 2 ký tự.';
        }
        if (trimmed.length > 100) {
            return 'Tên server tối đa 100 ký tự.';
        }
        return undefined;
    };
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        if (iconPreviewUrl) {
            URL.revokeObjectURL(iconPreviewUrl);
        }
        setIconFile(file);
        setIconPreviewUrl(URL.createObjectURL(file));
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitError(undefined);
        const error = validateName(form.name);
        setNameError(error);
        if (error) {
            return;
        }
        setIsSubmitting(true);
        try {
            await onCreate({
                name: form.name.trim(),
                is_public: form.is_public,
            }, iconFile);
            onOpenChange(false);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể tạo server. Vui lòng thử lại.';
            setSubmitError(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const resolveInvite = async () => {
        if (!onResolveInvitePreview) {
            setInviteError('Tính năng tham gia server chưa sẵn sàng.');
            return;
        }
        const code = parseInviteCode(inviteInput);
        if (!code) {
            setInviteError('Vui lòng nhập mã mời hoặc link hợp lệ.');
            return;
        }
        setInviteError(null);
        setIsResolvingInvite(true);
        try {
            const preview = await onResolveInvitePreview(code);
            autoResolvedInviteCodeRef.current = code;
            setInvitePreview(preview);
            setStep('join-preview');
        }
        catch (error) {
            setInviteError(error instanceof Error ? error.message : 'Mã mời không hợp lệ hoặc đã hết hạn');
        }
        finally {
            setIsResolvingInvite(false);
        }
    };
    const joinByInvite = async () => {
        if (!onJoinByInvite || !invitePreview) {
            setInviteError('Không thể tham gia server lúc này.');
            return;
        }
        setInviteError(null);
        setIsJoiningInvite(true);
        try {
            await onJoinByInvite(invitePreview.code);
            onOpenChange(false);
        }
        catch (error) {
            setInviteError(error instanceof Error ? error.message : 'Không thể tham gia server.');
        }
        finally {
            setIsJoiningInvite(false);
        }
    };
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onOpenChange, children: _jsx(DialogContent, { className: "max-w-md p-0 overflow-hidden", children: _jsxs("div", { className: "relative min-h-[420px]", children: [_jsx("section", { className: [
                            'absolute inset-0 p-6 transition-opacity duration-200',
                            step === 'type' ? 'opacity-100' : 'opacity-0 pointer-events-none',
                        ].join(' '), "aria-hidden": step !== 'type', children: _jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-xl font-semibold text-foreground", children: "T\u1EA1o server c\u1EE7a b\u1EA1n" }), _jsx("div", { className: "h-px bg-border" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Server c\u1EE7a b\u1EA1n d\u00E0nh cho ai?" }), _jsx("button", { type: "button", onClick: () => handleChooseType('friends'), className: "w-full text-left rounded-md border border-border px-4 py-3 hover:bg-accent transition-colors", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Users, { className: "w-5 h-5 mt-0.5 text-muted-foreground" }), _jsx("div", { children: _jsx("p", { className: "text-sm font-medium text-foreground", children: "D\u00E0nh cho t\u00F4i v\u00E0 b\u1EA1n b\u00E8" }) })] }) }), _jsx("button", { type: "button", onClick: () => handleChooseType('community'), className: "w-full text-left rounded-md border border-border px-4 py-3 hover:bg-accent transition-colors", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Globe, { className: "w-5 h-5 mt-0.5 text-muted-foreground" }), _jsx("div", { children: _jsx("p", { className: "text-sm font-medium text-foreground", children: "D\u00E0nh cho c\u00E2u l\u1EA1c b\u1ED9 ho\u1EB7c c\u1ED9ng \u0111\u1ED3ng" }) })] }) }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["\u0110\u00E3 c\u00F3 l\u1EDDi m\u1EDDi?", ' ', _jsx("button", { type: "button", onClick: () => setStep('join-input'), className: "text-foreground underline-offset-2 hover:underline", children: "Tham gia Server" })] })] }) }), _jsx("section", { className: [
                            'absolute inset-0 p-6 transition-opacity duration-200',
                            step === 'join-input' ? 'opacity-100' : 'opacity-0 pointer-events-none',
                        ].join(' '), "aria-hidden": step !== 'join-input', children: _jsxs("div", { className: "h-full flex flex-col", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs(Button, { type: "button", variant: "ghost", className: "px-2", onClick: () => setStep('type'), children: [_jsx(ArrowLeft, { className: "w-4 h-4 mr-1" }), "Quay l\u1EA1i"] }) }), _jsx("div", { className: "mt-3 h-px bg-border" }), _jsxs("div", { className: "mt-4 flex-1 space-y-3", children: [_jsx("h2", { className: "text-xl font-semibold text-foreground", children: "Tham gia Server" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Nh\u1EADp m\u00E3 m\u1EDDi ho\u1EB7c link l\u1EDDi m\u1EDDi." }), _jsx(Input, { value: inviteInput, onChange: (event) => {
                                                setInviteInput(event.target.value);
                                                setInviteError(null);
                                            }, placeholder: "https://goportal.app/invite/abc123 ho\u1EB7c abc123" }), inviteError && _jsx("p", { className: "text-sm text-red-400", children: inviteError })] }), _jsxs("div", { className: "mt-6 flex items-center justify-between gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Hu\u1EF7" }), _jsxs(Button, { type: "button", onClick: () => void resolveInvite(), disabled: isResolvingInvite, children: [isResolvingInvite ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : null, isResolvingInvite ? 'Đang kiểm tra...' : 'Tiếp tục'] })] })] }) }), _jsx("section", { className: [
                            'absolute inset-0 p-6 transition-opacity duration-200',
                            step === 'join-preview' ? 'opacity-100' : 'opacity-0 pointer-events-none',
                        ].join(' '), "aria-hidden": step !== 'join-preview', children: _jsxs("div", { className: "h-full flex flex-col", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs(Button, { type: "button", variant: "ghost", className: "px-2", onClick: () => setStep('join-input'), children: [_jsx(ArrowLeft, { className: "w-4 h-4 mr-1" }), "Quay l\u1EA1i"] }) }), _jsx("div", { className: "mt-3 h-px bg-border" }), _jsxs("div", { className: "mt-4 flex-1 space-y-4", children: [_jsx("h2", { className: "text-xl font-semibold text-foreground", children: "X\u00E1c nh\u1EADn tham gia" }), _jsx("div", { className: "rounded-md border border-border bg-[hsl(240,6%,11%)] p-4", children: _jsxs("div", { className: "flex items-center gap-3", children: [invitePreview?.server.iconUrl ? (_jsx("img", { src: invitePreview.server.iconUrl, alt: invitePreview.server.name, className: "h-12 w-12 rounded-md object-cover" })) : (_jsx("div", { className: "h-12 w-12 rounded-md bg-accent" })), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-semibold text-foreground", children: invitePreview?.server.name }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [invitePreview?.server.memberCount ?? 0, " th\u00E0nh vi\u00EAn"] })] })] }) }), inviteError && _jsx("p", { className: "text-sm text-red-400", children: inviteError })] }), _jsxs("div", { className: "mt-6 flex items-center justify-between gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Hu\u1EF7" }), _jsxs(Button, { type: "button", className: "bg-indigo-600 text-white hover:bg-indigo-700", onClick: () => void joinByInvite(), disabled: isJoiningInvite, children: [isJoiningInvite ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : null, isJoiningInvite ? 'Đang tham gia...' : 'Tham gia Server'] })] })] }) }), _jsx("section", { className: [
                            'absolute inset-0 p-6 transition-opacity duration-200',
                            step === 'details' ? 'opacity-100' : 'opacity-0 pointer-events-none',
                        ].join(' '), "aria-hidden": step !== 'details', children: _jsxs("form", { onSubmit: handleSubmit, className: "h-full flex flex-col", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs(Button, { type: "button", variant: "ghost", className: "px-2", onClick: () => setStep('type'), disabled: isSubmitting, children: [_jsx(ArrowLeft, { className: "w-4 h-4 mr-1" }), "Quay l\u1EA1i"] }) }), _jsx("div", { className: "mt-3 h-px bg-border" }), _jsxs("div", { className: "mt-4 flex-1 space-y-4", children: [_jsx("h2", { className: "text-xl font-semibold text-foreground", children: "Tu\u1EF3 ch\u1EC9nh server c\u1EE7a b\u1EA1n" }), _jsxs("div", { className: "flex justify-center", children: [_jsx("button", { type: "button", onClick: handleUploadClick, className: "w-24 h-24 rounded-full border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:bg-accent transition-colors", disabled: isSubmitting, children: iconPreviewUrl ? (_jsx("img", { src: iconPreviewUrl, alt: "Server icon preview", className: "w-full h-full rounded-full object-cover" })) : (_jsxs(_Fragment, { children: [_jsx(Camera, { className: "w-5 h-5 text-muted-foreground" }), _jsx("span", { className: "text-[11px] text-muted-foreground", children: "T\u1EA3i \u1EA3nh l\u00EAn" })] })) }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", className: "hidden", onChange: handleFileChange, disabled: isSubmitting })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "server-name", className: "text-xs uppercase tracking-wide", children: "T\u00EAn Server" }), _jsx(Input, { id: "server-name", value: form.name, onChange: (event) => {
                                                        const value = event.target.value;
                                                        setForm((previous) => ({ ...previous, name: value }));
                                                        if (nameError) {
                                                            setNameError(validateName(value));
                                                        }
                                                    }, autoFocus: true, disabled: isSubmitting }), nameError && _jsx("p", { className: "text-xs text-destructive", children: nameError })] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "B\u1EB1ng c\u00E1ch t\u1EA1o server, b\u1EA1n \u0111\u1ED3ng \u00FD v\u1EDBi \u0110i\u1EC1u kho\u1EA3n d\u1ECBch v\u1EE5 c\u1EE7a ch\u00FAng t\u00F4i." }), submitError && _jsx("p", { className: "text-sm text-red-400", children: submitError }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Ch\u1EBF \u0111\u1ED9: ", serverType === 'community' ? 'Cộng đồng (public)' : 'Bạn bè (private)'] })] }), _jsxs("div", { className: "mt-6 flex items-center justify-between gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), disabled: isSubmitting, children: "Hu\u1EF7" }), _jsxs(Button, { type: "submit", disabled: isSubmitting, children: [isSubmitting ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : null, isSubmitting ? 'Đang tạo...' : 'Tạo Server'] })] })] }) })] }) }) }));
};
//# sourceMappingURL=CreateServerModal.js.map