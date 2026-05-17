import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Badge, Button } from '@goportal/ui';
import { Eye, Plus } from 'lucide-react';
import { listTournamentsByServer } from '../services';
import { formatDateTime, formatRelativeCountdown, TOURNAMENT_FORMAT_META, TOURNAMENT_STATUS_META, } from './utils';
const TournamentCardSkeleton = () => (_jsxs("div", { className: "animate-pulse rounded-xl border border-border/60 bg-[hsl(240,8%,14%)] p-4", children: [_jsx("div", { className: "mb-4 h-5 w-1/2 rounded bg-muted/30" }), _jsx("div", { className: "mb-3 h-4 w-2/3 rounded bg-muted/20" }), _jsx("div", { className: "mb-2 h-4 w-1/3 rounded bg-muted/20" }), _jsx("div", { className: "h-4 w-1/2 rounded bg-muted/20" })] }));
const TournamentCard = ({ tournament, onOpen }) => {
    const statusMeta = TOURNAMENT_STATUS_META[tournament.status];
    const formatMeta = TOURNAMENT_FORMAT_META[tournament.format];
    return (_jsxs("article", { className: "rounded-xl border border-border/70 bg-[hsl(240,8%,14%)] p-4", children: [_jsxs("div", { className: "mb-2 flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-base font-semibold text-foreground", children: tournament.name }), _jsx("p", { className: "text-sm text-muted-foreground", children: tournament.game })] }), _jsx(Badge, { variant: "outline", className: statusMeta.className, children: statusMeta.label })] }), _jsxs("div", { className: "mb-3 flex items-center gap-2", children: [_jsx(Badge, { variant: "outline", children: formatMeta.label }), _jsx("span", { className: "text-xs text-muted-foreground", children: formatMeta.shortDescription })] }), _jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [_jsxs("p", { children: ["\u0110\u0103ng k\u00FD: ", _jsxs("span", { className: "text-foreground", children: ["0/", tournament.max_participants] })] }), _jsxs("p", { children: ["H\u1EA1n \u0111\u0103ng k\u00FD:", ' ', _jsxs("span", { className: "text-foreground", children: [formatDateTime(tournament.registration_deadline), " (", formatRelativeCountdown(tournament.registration_deadline), ")"] })] })] }), _jsxs(Button, { type: "button", variant: "outline", className: "mt-4 w-full", onClick: onOpen, children: [_jsx(Eye, { className: "mr-2 h-4 w-4" }), "Xem chi ti\u1EBFt"] })] }));
};
export const TournamentListPage = () => {
    const navigate = useNavigate();
    const { serverId = '' } = useParams();
    const { canManageTournaments, openTournamentCreateDialog } = useOutletContext();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [items, setItems] = useState([]);
    const load = useCallback(async () => {
        if (!serverId) {
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await listTournamentsByServer(serverId, { limit: 100 });
            setItems(response.items ?? []);
        }
        catch (loadError) {
            setError(loadError?.message ?? 'Không thể tải danh sách giải đấu.');
        }
        finally {
            setIsLoading(false);
        }
    }, [serverId]);
    useEffect(() => {
        void load();
    }, [load]);
    const sortedItems = useMemo(() => [...items].sort((left, right) => right.created_at - left.created_at), [items]);
    return (_jsxs("div", { className: "flex h-full min-h-0 min-w-0 w-full flex-col bg-[hsl(240,10%,7%)]", children: [_jsxs("header", { className: "flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4", children: [_jsx("div", { className: "min-w-0", children: _jsx("h1", { className: "truncate text-sm font-semibold text-foreground", children: "Gi\u1EA3i \u0111\u1EA5u" }) }), canManageTournaments && (_jsxs(Button, { type: "button", size: "sm", onClick: () => openTournamentCreateDialog?.(), children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "T\u1EA1o gi\u1EA3i \u0111\u1EA5u"] }))] }), _jsxs("section", { className: "min-h-0 flex-1 overflow-auto p-4", children: [error && (_jsx("div", { className: "mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300", children: error })), isLoading ? (_jsx("div", { className: "grid grid-cols-3 gap-4", children: [0, 1, 2, 3, 4, 5].map((index) => (_jsx(TournamentCardSkeleton, {}, index))) })) : sortedItems.length === 0 ? (_jsx("div", { className: "rounded-lg border border-border/50 bg-[hsl(240,8%,12%)] p-6 text-sm text-muted-foreground", children: "Ch\u01B0a c\u00F3 gi\u1EA3i \u0111\u1EA5u n\u00E0o trong server n\u00E0y." })) : (_jsx("div", { className: "grid grid-cols-3 gap-4", children: sortedItems.map((tournament) => (_jsx(TournamentCard, { tournament: tournament, onOpen: () => navigate(`/app/servers/${serverId}/tournaments/${tournament.id}`) }, tournament.id))) }))] })] }));
};
//# sourceMappingURL=TournamentListPage.js.map