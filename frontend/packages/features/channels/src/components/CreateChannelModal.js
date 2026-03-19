import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Button, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger, } from '@goportal/ui';
import { useCreateChannel } from '../hooks/useChannels';
export const CreateChannelModal = ({ serverId, isOpen, onOpenChange, onSuccess, }) => {
    const [channelType, setChannelType] = useState('TEXT');
    const [name, setName] = useState('');
    const [error, setError] = useState();
    const createChannel = useCreateChannel(serverId);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(undefined);
        if (!name.trim()) {
            setError('Channel name is required');
            return;
        }
        const body = {
            name: name.trim(),
            type: channelType,
        };
        createChannel.mutate(body, {
            onSuccess: () => {
                setName('');
                setChannelType('TEXT');
                onOpenChange(false);
                onSuccess?.();
            },
            onError: (err) => {
                setError(err?.message || 'Failed to create channel');
            },
        });
    };
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Create Channel" }), _jsx(DialogDescription, { children: "Create a new text or voice channel for this server" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs(Tabs, { value: channelType, onValueChange: (v) => setChannelType(v), children: [_jsxs(TabsList, { className: "grid w-full grid-cols-2", children: [_jsx(TabsTrigger, { value: "TEXT", children: "Text Channel" }), _jsx(TabsTrigger, { value: "VOICE", children: "Voice Channel" })] }), _jsx(TabsContent, { value: "TEXT", className: "mt-4", children: _jsx("p", { className: "text-xs text-muted-foreground mb-2", children: "For text-based conversations" }) }), _jsx(TabsContent, { value: "VOICE", className: "mt-4", children: _jsx("p", { className: "text-xs text-muted-foreground mb-2", children: "For voice conversations and streaming" }) })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs(Label, { htmlFor: "channel-name", children: ["Channel Name ", channelType === 'TEXT' && _jsx("span", { className: "text-muted-foreground ml-1", children: "#" })] }), _jsx(Input, { id: "channel-name", placeholder: channelType === 'TEXT' ? 'channel-name' : 'voice-channel', value: name, onChange: (e) => setName(e.target.value), disabled: createChannel.isPending, autoFocus: true })] }), error && (_jsx("p", { className: "text-xs text-destructive", children: error })), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), disabled: createChannel.isPending, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: createChannel.isPending, children: createChannel.isPending ? 'Creating...' : 'Create' })] })] })] }) }));
};
//# sourceMappingURL=CreateChannelModal.js.map