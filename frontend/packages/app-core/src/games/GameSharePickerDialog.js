import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@goportal/ui';
import { getChannels, getServers } from '../services';
const actionLabelMap = {
    shareGame: 'Share game card',
    shareScore: 'Share score',
    shareAchievement: 'Share achievement',
    shareSessionStart: 'Share now playing',
};
export const GameSharePickerDialog = ({ open, action, loading = false, preferredChannelId, onCancel, onConfirm, }) => {
    const [servers, setServers] = React.useState([]);
    const [selectedServerId, setSelectedServerId] = React.useState('');
    const [channels, setChannels] = React.useState([]);
    const [selectedChannelId, setSelectedChannelId] = React.useState('');
    const [isFetchingServers, setIsFetchingServers] = React.useState(false);
    const [isFetchingChannels, setIsFetchingChannels] = React.useState(false);
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;
        setIsFetchingServers(true);
        setError(null);
        void getServers()
            .then((items) => {
            if (cancelled)
                return;
            setServers(items);
            const firstServerId = items[0]?.id ?? '';
            setSelectedServerId(firstServerId);
        })
            .catch((err) => {
            if (cancelled)
                return;
            setError(err instanceof Error ? err.message : 'Unable to load servers');
        })
            .finally(() => {
            if (cancelled)
                return;
            setIsFetchingServers(false);
        });
        return () => {
            cancelled = true;
        };
    }, [open]);
    React.useEffect(() => {
        if (!open || !selectedServerId) {
            setChannels([]);
            setSelectedChannelId('');
            return;
        }
        let cancelled = false;
        setIsFetchingChannels(true);
        setError(null);
        void getChannels(selectedServerId)
            .then((result) => {
            if (cancelled)
                return;
            const textChannels = result.categories.flatMap((category) => category.channels).filter((item) => item.type === 'text');
            setChannels(textChannels);
            const preferred = preferredChannelId && textChannels.some((item) => item.id === preferredChannelId) ? preferredChannelId : '';
            setSelectedChannelId(preferred || textChannels[0]?.id || '');
        })
            .catch((err) => {
            if (cancelled)
                return;
            setError(err instanceof Error ? err.message : 'Unable to load channels');
        })
            .finally(() => {
            if (cancelled)
                return;
            setIsFetchingChannels(false);
        });
        return () => {
            cancelled = true;
        };
    }, [open, preferredChannelId, selectedServerId]);
    const canSubmit = Boolean(selectedServerId && selectedChannelId) && !loading && !isFetchingServers && !isFetchingChannels;
    const actionLabel = action ? actionLabelMap[action] : 'Share';
    return (_jsx(Dialog, { open: open, onOpenChange: (next) => (next ? undefined : onCancel()), children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Choose share destination" }), _jsx(DialogDescription, { children: "Select server and text channel for game share actions." })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground", children: ["Action: ", _jsx("span", { className: "font-medium text-foreground", children: actionLabel })] }), _jsxs("label", { className: "block space-y-1", children: [_jsx("span", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: "Server" }), _jsxs("select", { value: selectedServerId, onChange: (event) => setSelectedServerId(event.target.value), className: "h-10 w-full rounded-md border border-border bg-background px-3 text-sm", disabled: loading || isFetchingServers, children: [servers.length === 0 ? _jsx("option", { value: "", children: "No server available" }) : null, servers.map((server) => (_jsx("option", { value: server.id, children: server.name }, server.id)))] })] }), _jsxs("label", { className: "block space-y-1", children: [_jsx("span", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: "Channel" }), _jsxs("select", { value: selectedChannelId, onChange: (event) => setSelectedChannelId(event.target.value), className: "h-10 w-full rounded-md border border-border bg-background px-3 text-sm", disabled: loading || isFetchingChannels || !selectedServerId, children: [channels.length === 0 ? _jsx("option", { value: "", children: "No text channel available" }) : null, channels.map((channel) => (_jsxs("option", { value: channel.id, children: ["#", channel.name] }, channel.id)))] })] }), error ? _jsx("div", { className: "rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300", children: error }) : null] }), _jsxs("div", { className: "mt-2 flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: onCancel, disabled: loading, className: "rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-60", children: "Cancel" }), _jsx("button", { type: "button", disabled: !canSubmit, onClick: () => onConfirm({ serverId: selectedServerId, channelId: selectedChannelId }), className: "rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60", children: loading ? 'Sharing...' : 'Share' })] })] }) }));
};
//# sourceMappingURL=GameSharePickerDialog.js.map