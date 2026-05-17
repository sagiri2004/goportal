import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, } from '@goportal/ui';
import { Brackets, CircleDashed, GitBranchPlus, Swords, Users, UserRound, } from 'lucide-react';
import { createTournament, updateTournament } from '../services';
import { fromDateTimeLocalValue, toDateTimeLocalValue, TOURNAMENT_FORMAT_META, } from './utils';
const formatOptions = [
    { value: 'single_elimination', icon: Brackets },
    { value: 'double_elimination', icon: GitBranchPlus },
    { value: 'round_robin', icon: CircleDashed },
    { value: 'swiss', icon: Swords },
];
const participantTypeOptions = [
    { value: 'solo', title: 'Solo', icon: UserRound },
    { value: 'team', title: 'Team', icon: Users },
];
const getDefaultState = (tournament) => ({
    name: tournament?.name ?? '',
    game: tournament?.game ?? '',
    description: tournament?.description ?? '',
    rules: tournament?.rules ?? '',
    prize_pool: tournament?.prize_pool ?? '',
    format: tournament?.format ?? 'single_elimination',
    participant_type: tournament?.participant_type ?? 'solo',
    team_size: tournament?.team_size ? String(tournament.team_size) : '',
    max_participants: tournament?.max_participants ? String(tournament.max_participants) : '',
    registration_deadline: toDateTimeLocalValue(tournament?.registration_deadline),
    check_in_duration_minutes: String(tournament?.check_in_duration_minutes ?? 15),
});
export const TournamentCreateEditDialog = ({ open, onOpenChange, serverId, tournament, onSuccess, }) => {
    const isEdit = Boolean(tournament);
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(getDefaultState(tournament ?? undefined));
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    useEffect(() => {
        if (!open) {
            return;
        }
        setStep(1);
        setError(null);
        setIsSubmitting(false);
        setForm(getDefaultState(tournament ?? undefined));
    }, [open, tournament]);
    const canGoNext = useMemo(() => {
        if (step === 1) {
            return form.name.trim().length > 0 && form.game.trim().length > 0;
        }
        if (step === 2) {
            const max = Number(form.max_participants);
            if (!Number.isFinite(max) || max <= 1) {
                return false;
            }
            if (form.participant_type === 'team') {
                const teamSize = Number(form.team_size);
                return Number.isFinite(teamSize) && teamSize > 1;
            }
            return true;
        }
        return true;
    }, [form, step]);
    const submit = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            if (isEdit && tournament) {
                const updated = await updateTournament(tournament.id, {
                    name: form.name.trim(),
                    description: form.description.trim() || null,
                    rules: form.rules.trim() || null,
                    prize_pool: form.prize_pool.trim() || null,
                    max_participants: Number(form.max_participants),
                    registration_deadline: fromDateTimeLocalValue(form.registration_deadline),
                });
                onSuccess?.(updated);
                onOpenChange(false);
                return;
            }
            const created = await createTournament(serverId, {
                name: form.name.trim(),
                game: form.game.trim(),
                description: form.description.trim() || null,
                rules: form.rules.trim() || null,
                prize_pool: form.prize_pool.trim() || null,
                format: form.format,
                participant_type: form.participant_type,
                team_size: form.participant_type === 'team' && form.team_size
                    ? Number(form.team_size)
                    : null,
                max_participants: Number(form.max_participants),
                registration_deadline: fromDateTimeLocalValue(form.registration_deadline),
                check_in_duration_minutes: Number(form.check_in_duration_minutes) || 15,
            });
            onSuccess?.(created);
            onOpenChange(false);
        }
        catch (submitError) {
            setError(submitError?.message ?? 'Không thể lưu giải đấu.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const isLastStep = step === 3 || isEdit;
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-3xl", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: isEdit ? 'Chỉnh sửa giải đấu' : 'Tạo giải đấu' }), _jsx(DialogDescription, { children: isEdit ? 'Cập nhật thông tin giải đấu hiện tại.' : `Bước ${step}/3` })] }), !isEdit && (_jsx("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [1, 2, 3].map((index) => (_jsxs(Badge, { variant: "outline", className: index === step ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-300' : '', children: ["B\u01B0\u1EDBc ", index] }, index))) })), (step === 1 || isEdit) && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "tournament-name", children: "T\u00EAn gi\u1EA3i" }), _jsx(Input, { id: "tournament-name", value: form.name, onChange: (event) => setForm((prev) => ({ ...prev, name: event.target.value })) })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "tournament-game", children: "Game" }), _jsx(Input, { id: "tournament-game", value: form.game, onChange: (event) => setForm((prev) => ({ ...prev, game: event.target.value })), disabled: isEdit })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "tournament-description", children: "M\u00F4 t\u1EA3" }), _jsx("textarea", { id: "tournament-description", value: form.description, onChange: (event) => setForm((prev) => ({ ...prev, description: event.target.value })), className: "flex min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "tournament-rules", children: "Lu\u1EADt ch\u01A1i" }), _jsx("textarea", { id: "tournament-rules", value: form.rules, onChange: (event) => setForm((prev) => ({ ...prev, rules: event.target.value })), className: "flex min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "tournament-prize", children: "Gi\u1EA3i th\u01B0\u1EDFng" }), _jsx("textarea", { id: "tournament-prize", value: form.prize_pool, onChange: (event) => setForm((prev) => ({ ...prev, prize_pool: event.target.value })), className: "flex min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" })] })] })), !isEdit && step === 2 && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm font-medium", children: "Format" }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: formatOptions.map(({ value, icon: Icon }) => (_jsxs("button", { type: "button", onClick: () => setForm((prev) => ({ ...prev, format: value })), className: `rounded-lg border p-3 text-left transition-colors ${form.format === value
                                            ? 'border-indigo-400/40 bg-indigo-500/10'
                                            : 'border-border hover:bg-accent'}`, children: [_jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx(Icon, { className: "h-4 w-4" }), _jsx("p", { className: "text-sm font-medium", children: TOURNAMENT_FORMAT_META[value].label })] }), _jsx("p", { className: "text-xs text-muted-foreground", children: TOURNAMENT_FORMAT_META[value].shortDescription })] }, value))) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm font-medium", children: "Participant type" }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: participantTypeOptions.map(({ value, title, icon: Icon }) => (_jsx("button", { type: "button", onClick: () => setForm((prev) => ({ ...prev, participant_type: value })), className: `rounded-lg border p-3 text-left transition-colors ${form.participant_type === value
                                            ? 'border-indigo-400/40 bg-indigo-500/10'
                                            : 'border-border hover:bg-accent'}`, children: _jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx(Icon, { className: "h-4 w-4" }), _jsx("p", { className: "text-sm font-medium", children: title })] }) }, value))) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [form.participant_type === 'team' && (_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "tournament-team-size", children: "Team size" }), _jsx(Input, { id: "tournament-team-size", type: "number", min: 2, value: form.team_size, onChange: (event) => setForm((prev) => ({ ...prev, team_size: event.target.value })) })] })), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "tournament-max-participants", children: "S\u1ED1 ng\u01B0\u1EDDi t\u1ED1i \u0111a" }), _jsx(Input, { id: "tournament-max-participants", type: "number", min: 2, value: form.max_participants, onChange: (event) => setForm((prev) => ({ ...prev, max_participants: event.target.value })) })] })] })] })), !isEdit && step === 3 && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "tournament-registration-deadline", children: "Th\u1EDDi h\u1EA1n \u0111\u0103ng k\u00FD" }), _jsx(Input, { id: "tournament-registration-deadline", type: "datetime-local", value: form.registration_deadline, onChange: (event) => setForm((prev) => ({ ...prev, registration_deadline: event.target.value })) })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "tournament-checkin-duration", children: "Th\u1EDDi gian check-in (ph\u00FAt)" }), _jsx(Input, { id: "tournament-checkin-duration", type: "number", min: 1, value: form.check_in_duration_minutes, onChange: (event) => setForm((prev) => ({ ...prev, check_in_duration_minutes: event.target.value })) })] })] })), error && _jsx("p", { className: "text-sm text-red-400", children: error }), _jsxs(DialogFooter, { children: [!isEdit && step > 1 && (_jsx(Button, { type: "button", variant: "outline", onClick: () => setStep((prev) => Math.max(1, prev - 1)), children: "Quay l\u1EA1i" })), !isLastStep ? (_jsx(Button, { type: "button", disabled: !canGoNext, onClick: () => setStep((prev) => Math.min(3, prev + 1)), children: "Ti\u1EBFp t\u1EE5c" })) : (_jsx(Button, { type: "button", disabled: isSubmitting || !canGoNext, onClick: () => void submit(), children: isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo giải đấu' }))] })] }) }));
};
//# sourceMappingURL=TournamentCreateEditDialog.js.map