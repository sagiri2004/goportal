import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { getParticipantDisplayName } from '../utils';
const SIDE_META = {
    upper: {
        title: 'Winners Bracket',
        cardClass: 'border-emerald-400/30 bg-emerald-500/[0.07]',
        lineClass: 'bg-emerald-300/45',
    },
    lower: {
        title: 'Losers Bracket',
        cardClass: 'border-rose-400/30 bg-rose-500/[0.07]',
        lineClass: 'bg-rose-300/45',
    },
    final: {
        title: 'Grand Final',
        cardClass: 'border-amber-300/35 bg-amber-500/[0.10]',
        lineClass: 'bg-amber-200/55',
    },
};
const MATCH_STATUS_META = {
    pending: {
        label: 'Cho ghep',
        className: 'border-zinc-500/40 bg-zinc-700/30 text-zinc-200',
    },
    ready: {
        label: 'San sang',
        className: 'border-sky-500/40 bg-sky-500/20 text-sky-100',
    },
    in_progress: {
        label: 'Dang dau',
        className: 'border-amber-500/40 bg-amber-500/20 text-amber-100',
    },
    completed: {
        label: 'Da xong',
        className: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100',
    },
    bye: {
        label: 'Bye',
        className: 'border-violet-500/40 bg-violet-500/20 text-violet-100',
    },
};
const getName = (participant) => participant ? getParticipantDisplayName(participant) : 'TBD';
const getAvatarUrl = (participant) => {
    if (!participant) {
        return 'https://api.dicebear.com/9.x/initials/svg?seed=TBD&backgroundColor=0f172a,164e63';
    }
    const directAvatar = participant.user?.avatar_url;
    if (directAvatar && directAvatar.trim().length > 0) {
        return directAvatar;
    }
    const seed = encodeURIComponent(getName(participant));
    return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=0f172a,14532d,7f1d1d`;
};
const scoreText = (value) => (typeof value === 'number' ? String(value) : '-');
const MatchNode = ({ match, lineClass, showLeftConnector, showRightConnector, myParticipant, onOpenMatch, codeLabel, flowLabel, }) => {
    const isMine = Boolean(myParticipant &&
        (match.participant1?.id === myParticipant.id || match.participant2?.id === myParticipant.id));
    return (_jsxs("div", { className: "relative", children: [showLeftConnector && _jsx("span", { className: `absolute -left-4 top-1/2 h-px w-4 ${lineClass}` }), showRightConnector && _jsx("span", { className: `absolute -right-4 top-1/2 h-px w-4 ${lineClass}` }), _jsxs("button", { type: "button", onClick: () => onOpenMatch(match), className: `w-full rounded-xl border p-3 text-left transition ${isMine
                    ? 'border-indigo-400/60 bg-indigo-500/10'
                    : 'border-white/10 bg-zinc-950/75 hover:border-cyan-300/40'}`, children: [_jsxs("div", { className: "mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.13em] text-zinc-400", children: [_jsx("span", { children: codeLabel }), _jsx("span", { className: `rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.11em] ${MATCH_STATUS_META[match.status].className}`, children: MATCH_STATUS_META[match.status].label })] }), _jsx("div", { className: "space-y-1.5", children: [match.participant1, match.participant2].map((participant, index) => {
                            const isWinner = Boolean(match.winner?.id) && participant?.id === match.winner?.id;
                            return (_jsxs("div", { className: `flex items-center justify-between rounded px-2 py-1 ${isWinner
                                    ? 'bg-emerald-500/20 text-emerald-100'
                                    : 'bg-white/[0.03] text-zinc-200'}`, children: [_jsxs("span", { className: "flex min-w-0 items-center gap-2", children: [_jsx("img", { src: getAvatarUrl(participant), alt: getName(participant), className: "h-5 w-5 rounded-full border border-white/20 bg-zinc-900 object-cover" }), _jsx("span", { className: "truncate", children: getName(participant) })] }), _jsx("span", { className: "font-semibold", children: index === 0 ? scoreText(match.score1) : scoreText(match.score2) })] }, `${match.id}-${index}`));
                        }) }), _jsxs("div", { className: "mt-2 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.12em]", children: [_jsxs("span", { className: "rounded border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-emerald-200", children: ['W -> ', flowLabel(match.next_match_id)] }), _jsxs("span", { className: "rounded border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-rose-200", children: ['L -> ', flowLabel(match.loser_next_match_id)] })] })] })] }));
};
export const DoubleEliminationTree = ({ matches, myParticipant, onOpenMatch }) => {
    const grouped = useMemo(() => {
        const map = new Map();
        ['upper', 'lower', 'final'].forEach((side) => {
            map.set(side, new Map());
        });
        matches.forEach((match) => {
            const side = match.bracket_side || 'upper';
            const normalizedSide = side === 'lower' || side === 'final' ? side : 'upper';
            const sideMap = map.get(normalizedSide) ?? new Map();
            const list = sideMap.get(match.round) ?? [];
            list.push(match);
            sideMap.set(match.round, list.sort((left, right) => left.match_number - right.match_number));
            map.set(normalizedSide, sideMap);
        });
        return ['upper', 'lower', 'final'].map((side) => {
            const sideMap = map.get(side) ?? new Map();
            return {
                side,
                rounds: [...sideMap.entries()]
                    .sort((a, b) => a[0] - b[0])
                    .map(([round, sideMatches]) => ({ round, matches: sideMatches })),
            };
        });
    }, [matches]);
    const codeById = useMemo(() => {
        const codeMap = new Map();
        matches.forEach((match) => {
            const side = match.bracket_side || 'upper';
            const prefix = side === 'lower' ? 'L' : side === 'final' ? 'GF' : 'W';
            codeMap.set(match.id, `${prefix}${match.round}.${match.match_number}`);
        });
        return codeMap;
    }, [matches]);
    const flowLabel = (matchId) => {
        if (!matchId)
            return 'Eliminated';
        return codeById.get(matchId) ?? `#${matchId.slice(-4)}`;
    };
    return (_jsx("div", { className: "space-y-3", children: grouped.map((section) => {
            const meta = SIDE_META[section.side];
            const roundCount = Math.max(1, section.rounds.length);
            return (_jsxs("section", { className: `rounded-xl border p-3 ${meta.cardClass}`, children: [_jsx("h4", { className: "mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-100", children: meta.title }), section.rounds.length === 0 ? (_jsx("div", { className: "rounded-md border border-dashed border-white/15 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400", children: "Chua co du lieu cho nhanh nay." })) : (_jsx("div", { className: "gp-scrollbar gp-scrollbar-thin overflow-auto", children: _jsx("div", { className: "flex min-w-max gap-6 pb-1", children: section.rounds.map((round, roundIndex) => (_jsxs("div", { className: "relative flex min-w-[280px] flex-col gap-3", style: { marginTop: `${roundIndex * 10}px` }, children: [_jsxs("p", { className: "text-[11px] uppercase tracking-[0.14em] text-zinc-300", children: ["Round ", round.round] }), round.matches.map((match) => (_jsx(MatchNode, { match: match, lineClass: meta.lineClass, showLeftConnector: roundIndex > 0, showRightConnector: roundIndex < roundCount - 1, myParticipant: myParticipant, onOpenMatch: onOpenMatch, codeLabel: codeById.get(match.id) ?? `Match ${match.match_number}`, flowLabel: flowLabel }, match.id)))] }, `${section.side}-${round.round}`))) }) }))] }, section.side));
        }) }));
};
export const SingleEliminationTree = ({ matches, myParticipant, onOpenMatch }) => {
    const rounds = useMemo(() => [...matches]
        .sort((left, right) => {
        if (left.round !== right.round)
            return left.round - right.round;
        return left.match_number - right.match_number;
    })
        .reduce((acc, match) => {
        const current = acc.find((item) => item.round === match.round);
        if (current) {
            current.matches.push(match);
        }
        else {
            acc.push({ round: match.round, matches: [match] });
        }
        return acc;
    }, []), [matches]);
    const codeById = useMemo(() => {
        const codeMap = new Map();
        matches.forEach((match) => {
            codeMap.set(match.id, `W${match.round}.${match.match_number}`);
        });
        return codeMap;
    }, [matches]);
    const flowLabel = (matchId) => {
        if (!matchId)
            return 'Eliminated';
        return codeById.get(matchId) ?? `#${matchId.slice(-4)}`;
    };
    return (_jsxs("section", { className: `rounded-xl border p-3 ${SIDE_META.upper.cardClass}`, children: [_jsx("h4", { className: "mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-100", children: "Knockout Bracket" }), rounds.length === 0 ? (_jsx("div", { className: "rounded-md border border-dashed border-white/15 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400", children: "Chua co du lieu bracket." })) : (_jsx("div", { className: "gp-scrollbar gp-scrollbar-thin overflow-auto", children: _jsx("div", { className: "flex min-w-max gap-6 pb-1", children: rounds.map((round, roundIndex) => (_jsxs("div", { className: "relative flex min-w-[280px] flex-col gap-3", style: { marginTop: `${roundIndex * 10}px` }, children: [_jsxs("p", { className: "text-[11px] uppercase tracking-[0.14em] text-zinc-300", children: ["Round ", round.round] }), round.matches.map((match) => (_jsx(MatchNode, { match: match, lineClass: SIDE_META.upper.lineClass, showLeftConnector: roundIndex > 0, showRightConnector: roundIndex < rounds.length - 1, myParticipant: myParticipant, onOpenMatch: onOpenMatch, codeLabel: codeById.get(match.id) ?? `Match ${match.match_number}`, flowLabel: flowLabel }, match.id)))] }, `single-${round.round}`))) }) }))] }));
};
//# sourceMappingURL=DoubleEliminationTree.js.map