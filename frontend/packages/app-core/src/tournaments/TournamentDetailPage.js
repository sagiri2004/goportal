import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger, } from '@goportal/ui';
import { ArrowLeft, Check, Crown, Loader2, Pencil, Play, Swords, Trophy, } from 'lucide-react';
import { useAuthStore } from '@goportal/store';
import { cancelTournamentRegistration, checkInTournamentParticipant, getTournamentBracket, getTournamentDetail, getTournamentStandings, ensureTournamentRoles, listTournamentRoleBindings, listTournamentMatchWorkspaces, listTournamentMatches, provisionTournamentMatchWorkspace, startTournamentMatch, overrideTournamentMatchResult, registerTournamentParticipant, reportTournamentMatchResult, bindTournamentRole, unbindTournamentRole, updateTournamentStatus, } from '../services';
import { TournamentCreateEditDialog } from './TournamentCreateEditDialog';
import { DoubleEliminationTree, SingleEliminationTree } from './components/DoubleEliminationTree';
import { formatDateTime, getParticipantDisplayName, PARTICIPANT_STATUS_META, TOURNAMENT_FORMAT_META, TOURNAMENT_STATUS_META, } from './utils';
const cardCls = 'rounded-xl border border-cyan-500/20 bg-[linear-gradient(140deg,rgba(8,10,18,0.96),rgba(13,19,30,0.9))] shadow-[0_18px_40px_rgba(0,0,0,0.35)]';
const sectionTitleCls = "font-['Rajdhani','Segoe_UI',sans-serif] text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80";
const scoreText = (value) => (typeof value === 'number' ? String(value) : '-');
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
const MATCH_STATUS_META = {
    pending: {
        label: 'Chờ ghép',
        className: 'border-zinc-500/40 bg-zinc-700/30 text-zinc-200',
    },
    ready: {
        label: 'Sẵn sàng',
        className: 'border-sky-500/40 bg-sky-500/20 text-sky-100',
    },
    in_progress: {
        label: 'Đang đấu',
        className: 'border-amber-500/40 bg-amber-500/20 text-amber-100',
    },
    completed: {
        label: 'Đã xong',
        className: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100',
    },
    bye: {
        label: 'Bye',
        className: 'border-violet-500/40 bg-violet-500/20 text-violet-100',
    },
};
const getParticipantId = (participant) => participant?.id ?? '';
const getSwissLane = (match, roundRecord) => {
    const participant1 = roundRecord.get(getParticipantId(match.participant1)) ?? { wins: 0, losses: 0 };
    const participant2 = roundRecord.get(getParticipantId(match.participant2)) ?? { wins: 0, losses: 0 };
    const score1 = participant1.wins - participant1.losses;
    const score2 = participant2.wins - participant2.losses;
    const average = (score1 + score2) / 2;
    if (average > 0)
        return 'win';
    if (average < 0)
        return 'loss';
    return 'mixed';
};
const getBoLabel = (round, totalRounds) => {
    if (round === totalRounds && round >= 3)
        return 'BO3';
    return 'BO1';
};
const laneMeta = {
    win: {
        title: 'Nhánh Thắng',
        cardClass: 'border-emerald-400/40 bg-emerald-500/10',
        lineClass: 'border-emerald-400/40',
        textClass: 'text-emerald-200',
    },
    loss: {
        title: 'Nhánh Thua',
        cardClass: 'border-rose-400/40 bg-rose-500/10',
        lineClass: 'border-rose-400/40',
        textClass: 'text-rose-200',
    },
    mixed: {
        title: 'Nhánh Trung Gian',
        cardClass: 'border-cyan-400/35 bg-cyan-500/10',
        lineClass: 'border-cyan-400/35',
        textClass: 'text-cyan-100',
    },
};
const SwissBracketBoard = ({ rounds, standings, tournamentStatus, onOpenMatch }) => {
    const stages = useMemo(() => {
        const participantRecord = new Map();
        const output = [];
        rounds.forEach(({ round, matches }) => {
            const lanes = {
                win: [],
                loss: [],
                mixed: [],
            };
            const sortedMatches = [...matches].sort((left, right) => {
                const leftTime = left.scheduled_at ?? left.created_at;
                const rightTime = right.scheduled_at ?? right.created_at;
                if (leftTime !== rightTime)
                    return leftTime - rightTime;
                return left.match_number - right.match_number;
            });
            sortedMatches.forEach((match) => {
                const lane = round === 1 ? 'mixed' : getSwissLane(match, participantRecord);
                lanes[lane].push(match);
            });
            const roundLanes = [];
            if (round === 1) {
                if (lanes.mixed.length > 0) {
                    roundLanes.push({
                        title: `Round ${round} (Khởi động)`,
                        lane: 'mixed',
                        matches: lanes.mixed,
                    });
                }
            }
            else {
                if (lanes.win.length > 0) {
                    roundLanes.push({
                        title: `Round ${round} (Thắng)`,
                        lane: 'win',
                        matches: lanes.win,
                    });
                }
                if (lanes.loss.length > 0) {
                    roundLanes.push({
                        title: `Round ${round} (Thua)`,
                        lane: 'loss',
                        matches: lanes.loss,
                    });
                }
                if (lanes.mixed.length > 0) {
                    roundLanes.push({
                        title: `Round ${round} (Trung gian)`,
                        lane: 'mixed',
                        matches: lanes.mixed,
                    });
                }
            }
            if (roundLanes.length === 0 && sortedMatches.length > 0) {
                roundLanes.push({
                    title: `Round ${round}`,
                    lane: 'mixed',
                    matches: sortedMatches,
                });
            }
            output.push({ round, lanes: roundLanes });
            sortedMatches.forEach((match) => {
                if (match.status !== 'completed' || !match.winner?.id)
                    return;
                const winnerId = match.winner.id;
                const participant1Id = getParticipantId(match.participant1);
                const participant2Id = getParticipantId(match.participant2);
                const loserId = participant1Id === winnerId ? participant2Id : participant1Id;
                if (winnerId) {
                    const current = participantRecord.get(winnerId) ?? { wins: 0, losses: 0 };
                    participantRecord.set(winnerId, { wins: current.wins + 1, losses: current.losses });
                }
                if (loserId) {
                    const current = participantRecord.get(loserId) ?? { wins: 0, losses: 0 };
                    participantRecord.set(loserId, { wins: current.wins, losses: current.losses + 1 });
                }
            });
        });
        return output;
    }, [rounds]);
    const champion = useMemo(() => standings.find((item) => item.status === 'winner') ??
        standings.find((item) => item.final_rank === 1) ??
        standings[0] ??
        null, [standings]);
    return (_jsxs("div", { className: "space-y-3", children: [tournamentStatus === 'completed' && champion && (_jsxs("div", { className: "rounded-2xl border border-amber-300/40 bg-[linear-gradient(145deg,rgba(120,53,15,0.32),rgba(146,64,14,0.22),rgba(30,41,59,0.7))] p-3 shadow-[0_16px_35px_rgba(113,63,18,0.28)]", children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.16em] text-amber-200/90", children: "Nh\u00E0 v\u00F4 \u0111\u1ECBch" }), _jsxs("div", { className: "mt-2 flex items-center gap-3", children: [_jsx("img", { src: getAvatarUrl(champion), alt: getName(champion), className: "h-10 w-10 rounded-full border border-amber-200/50 bg-zinc-900 object-cover" }), _jsxs("div", { children: [_jsx("p", { className: "text-base font-semibold text-amber-50", children: getName(champion) }), _jsx("p", { className: "text-xs text-amber-100/85", children: "\u0110\u1ED3ng h\u1EA1ng #1 - K\u1EBFt th\u00FAc gi\u1EA3i \u0111\u1EA5u" })] })] })] })), _jsxs("div", { className: "gp-scrollbar gp-scrollbar-thin overflow-auto rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_35%),linear-gradient(130deg,rgba(4,10,20,0.95),rgba(9,16,30,0.9))] p-4 shadow-[0_16px_40px_rgba(2,6,23,0.55)]", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-2", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.14em] text-cyan-200", children: "Swiss System Bracket" }), _jsxs("div", { className: "flex items-center gap-3 text-[11px]", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5 text-emerald-200", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-emerald-400" }), "Nh\u00E1nh th\u1EAFng"] }), _jsxs("span", { className: "inline-flex items-center gap-1.5 text-rose-200", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-rose-400" }), "Nh\u00E1nh thua"] })] })] }), _jsx("div", { className: "flex min-w-[1240px] gap-4", children: stages.map((stage, stageIndex) => (_jsxs("div", { className: "relative min-w-[340px] flex-1", children: [stageIndex < stages.length - 1 && (_jsx("div", { className: "pointer-events-none absolute right-[-8px] top-4 bottom-4 border-r border-dashed border-cyan-400/20" })), _jsxs("div", { className: "mb-3 rounded-xl border border-cyan-300/25 bg-[linear-gradient(160deg,rgba(8,47,73,0.55),rgba(2,6,23,0.85))] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100 shadow-[inset_0_1px_0_rgba(103,232,249,0.2)]", children: ["Round ", stage.round] }), _jsx("div", { className: "space-y-3", children: stage.lanes.map((lane) => {
                                        const meta = laneMeta[lane.lane];
                                        return (_jsxs("div", { className: `rounded-xl border p-3 ${meta.cardClass} shadow-[0_10px_28px_rgba(2,6,23,0.3)]`, children: [_jsx("p", { className: `mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${meta.textClass}`, children: lane.title }), lane.matches.length === 0 ? (_jsx("div", { className: "rounded border border-dashed border-white/15 bg-zinc-950/50 px-2 py-2 text-xs text-zinc-400", children: "Ch\u01B0a c\u00F3 tr\u1EADn ph\u00F9 h\u1EE3p cho nh\u00E1nh n\u00E0y." })) : (_jsx("div", { className: "space-y-2", children: lane.matches.map((match) => {
                                                        const boLabel = getBoLabel(stage.round, stages.length);
                                                        const winnerId = match.winner?.id ?? '';
                                                        const p1Win = winnerId && match.participant1?.id === winnerId;
                                                        const p2Win = winnerId && match.participant2?.id === winnerId;
                                                        return (_jsxs("button", { type: "button", onClick: () => onOpenMatch(match), className: "w-full rounded-lg border border-white/10 bg-[linear-gradient(150deg,rgba(9,9,11,0.9),rgba(15,23,42,0.72))] p-2 text-left transition duration-150 hover:-translate-y-[1px] hover:border-cyan-300/40 hover:shadow-[0_10px_24px_rgba(8,145,178,0.22)]", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.13em] text-zinc-400", children: [_jsxs("span", { children: ["Match ", match.match_number] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { children: boLabel }), _jsx("span", { className: `rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.11em] ${MATCH_STATUS_META[match.status].className}`, children: MATCH_STATUS_META[match.status].label })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: `flex items-center justify-between rounded px-2 py-1 ${p1Win ? 'bg-emerald-500/20 text-emerald-100' : winnerId ? 'bg-rose-500/12 text-rose-100' : 'bg-white/[0.03] text-zinc-200'}`, children: [_jsxs("span", { className: "flex min-w-0 items-center gap-2", children: [_jsx("img", { src: getAvatarUrl(match.participant1), alt: getName(match.participant1), className: "h-5 w-5 rounded-full border border-white/20 bg-zinc-900 object-cover" }), _jsx("span", { className: "truncate", children: getName(match.participant1) })] }), _jsx("span", { className: "font-semibold", children: scoreText(match.score1) })] }), _jsxs("div", { className: `flex items-center justify-between rounded px-2 py-1 ${p2Win ? 'bg-emerald-500/20 text-emerald-100' : winnerId ? 'bg-rose-500/12 text-rose-100' : 'bg-white/[0.03] text-zinc-200'}`, children: [_jsxs("span", { className: "flex min-w-0 items-center gap-2", children: [_jsx("img", { src: getAvatarUrl(match.participant2), alt: getName(match.participant2), className: "h-5 w-5 rounded-full border border-white/20 bg-zinc-900 object-cover" }), _jsx("span", { className: "truncate", children: getName(match.participant2) })] }), _jsx("span", { className: "font-semibold", children: scoreText(match.score2) })] })] }), _jsx("div", { className: `mt-2 border-t border-dashed pt-1 text-[10px] uppercase tracking-[0.12em] ${meta.textClass} ${meta.lineClass}`, children: meta.title })] }, match.id));
                                                    }) }))] }, lane.title));
                                    }) })] }, stage.round))) })] })] }));
};
export const TournamentDetailPage = () => {
    const navigate = useNavigate();
    const { serverId = '', tournamentId = '' } = useParams();
    const { canManageTournaments, pushToast, refreshActiveServerTournaments, membersByServer } = useOutletContext();
    const currentUser = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState('info');
    const [detail, setDetail] = useState(null);
    const [bracket, setBracket] = useState([]);
    const [history, setHistory] = useState([]);
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [inlineError, setInlineError] = useState(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [matchModalOpen, setMatchModalOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [winnerId, setWinnerId] = useState('');
    const [score1, setScore1] = useState('0');
    const [score2, setScore2] = useState('0');
    const [overrideReason, setOverrideReason] = useState('');
    const [matchSubmitError, setMatchSubmitError] = useState(null);
    const [startMatchNote, setStartMatchNote] = useState(null);
    const [roles, setRoles] = useState([]);
    const [roleBindings, setRoleBindings] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    const [bindRoleCode, setBindRoleCode] = useState('caster');
    const [bindUserId, setBindUserId] = useState('');
    const [bindUserQuery, setBindUserQuery] = useState('');
    const [bindingRoleFilter, setBindingRoleFilter] = useState('all');
    const tournament = detail?.tournament ?? null;
    const participants = detail?.participants ?? [];
    const isHost = useMemo(() => {
        if (!tournament || !currentUser)
            return false;
        return tournament.created_by === currentUser.id || Boolean(currentUser.is_admin);
    }, [currentUser, tournament]);
    const canManage = Boolean(canManageTournaments || isHost);
    const serverMembers = useMemo(() => membersByServer?.[serverId] ?? [], [membersByServer, serverId]);
    const memberNameById = useMemo(() => {
        const map = new Map();
        serverMembers.forEach((m) => map.set(m.id, m.name));
        return map;
    }, [serverMembers]);
    const roleById = useMemo(() => {
        const map = new Map();
        roles.forEach((role) => map.set(role.id, role));
        return map;
    }, [roles]);
    const myParticipant = useMemo(() => participants.find((item) => item.user?.id === currentUser?.id) ?? null, [participants, currentUser?.id]);
    const rounds = useMemo(() => {
        const map = new Map();
        bracket.forEach((match) => {
            const current = map.get(match.round) ?? [];
            current.push(match);
            map.set(match.round, current);
        });
        return [...map.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([round, matches]) => ({ round, matches: matches.sort((a, b) => a.match_number - b.match_number) }));
    }, [bracket]);
    const reload = useCallback(async () => {
        if (!tournamentId)
            return;
        setLoading(true);
        setInlineError(null);
        try {
            const [d, b, h, s] = await Promise.all([
                getTournamentDetail(tournamentId),
                getTournamentBracket(tournamentId),
                listTournamentMatches(tournamentId, { status: 'completed' }),
                getTournamentStandings(tournamentId),
            ]);
            setDetail(d);
            setBracket(b);
            setHistory(h);
            setStandings(s);
            setRoles([]);
            setRoleBindings([]);
            setWorkspaces([]);
            setError(null);
        }
        catch (loadError) {
            setError(loadError?.message ?? 'Không thể tải dữ liệu giải đấu.');
        }
        finally {
            setLoading(false);
        }
    }, [tournamentId]);
    useEffect(() => {
        void reload();
    }, [reload]);
    useEffect(() => {
        if (!tournamentId || !canManage) {
            setRoles([]);
            setRoleBindings([]);
            setWorkspaces([]);
            return;
        }
        let cancelled = false;
        const loadOps = async () => {
            try {
                const [r, rb, ws] = await Promise.all([
                    ensureTournamentRoles(tournamentId),
                    listTournamentRoleBindings(tournamentId),
                    listTournamentMatchWorkspaces(tournamentId),
                ]);
                if (cancelled)
                    return;
                setRoles(r);
                setRoleBindings(rb);
                setWorkspaces(ws);
            }
            catch {
                if (cancelled)
                    return;
                setRoles([]);
                setRoleBindings([]);
                setWorkspaces([]);
            }
        };
        void loadOps();
        return () => {
            cancelled = true;
        };
    }, [tournamentId, canManage]);
    useEffect(() => {
        if (roles.length === 0)
            return;
        if (!roles.some((role) => role.code === bindRoleCode)) {
            setBindRoleCode(roles[0].code);
        }
    }, [roles, bindRoleCode]);
    const runStatus = async (status) => {
        if (!tournament)
            return;
        if (status === 'in_progress') {
            const checkedIn = participants.filter((item) => item.status === 'checked_in').length;
            if (checkedIn < 2) {
                setInlineError('Cần ít nhất 2 người check-in trước khi bắt đầu giải.');
                return;
            }
        }
        setIsActionLoading(true);
        setInlineError(null);
        try {
            await updateTournamentStatus(tournament.id, status);
            pushToast?.('Đã cập nhật trạng thái giải đấu.');
            await reload();
            refreshActiveServerTournaments?.();
        }
        catch (statusError) {
            setInlineError(statusError?.message ?? 'Không thể cập nhật trạng thái.');
        }
        finally {
            setIsActionLoading(false);
        }
    };
    const toggleRegister = async () => {
        if (!tournament || !currentUser)
            return;
        if (currentUser.id === tournament.created_by) {
            setInlineError('Host không thể tự tham gia giải đấu.');
            return;
        }
        setIsActionLoading(true);
        setInlineError(null);
        try {
            if (myParticipant) {
                await cancelTournamentRegistration(tournament.id);
                pushToast?.('Đã huỷ đăng ký.');
            }
            else {
                await registerTournamentParticipant(tournament.id);
                pushToast?.('Đăng ký thành công.');
            }
            await reload();
        }
        catch (registerError) {
            setInlineError(registerError?.message ?? 'Không thể cập nhật đăng ký.');
        }
        finally {
            setIsActionLoading(false);
        }
    };
    const checkIn = async () => {
        if (!tournament || !myParticipant)
            return;
        setIsActionLoading(true);
        setInlineError(null);
        try {
            await checkInTournamentParticipant(tournament.id, myParticipant.id);
            pushToast?.('Check-in thành công.');
            await reload();
        }
        catch (checkinError) {
            setInlineError(checkinError?.message ?? 'Không thể check-in.');
        }
        finally {
            setIsActionLoading(false);
        }
    };
    const openMatch = (match) => {
        setSelectedMatch(match);
        setWinnerId(match.winner?.id ?? '');
        setScore1(String(match.score1 ?? 0));
        setScore2(String(match.score2 ?? 0));
        setOverrideReason('');
        setMatchSubmitError(null);
        setStartMatchNote(null);
        setMatchModalOpen(true);
    };
    const submitMatch = async (override = false) => {
        if (!tournament || !selectedMatch || !winnerId)
            return;
        const roleCodeById = new Map(roles.map((role) => [role.id, role.code]));
        const actorRoleCodes = new Set(roleBindings
            .filter((binding) => binding.user_id === currentUser?.id)
            .map((binding) => roleCodeById.get(binding.role_id))
            .filter((code) => Boolean(code)));
        const canJudge = selectedMatch.status === 'in_progress' &&
            (canManage || actorRoleCodes.has('admin') || actorRoleCodes.has('referee'));
        if (!canJudge && !override) {
            setMatchSubmitError('Bạn không có quyền báo cáo kết quả trận này.');
            return;
        }
        try {
            if (override) {
                await overrideTournamentMatchResult(tournament.id, selectedMatch.id, {
                    winner_id: winnerId,
                    score1: Number(score1) || 0,
                    score2: Number(score2) || 0,
                    reason: overrideReason.trim() || 'Host override',
                });
            }
            else {
                await reportTournamentMatchResult(tournament.id, selectedMatch.id, {
                    winner_id: winnerId,
                    score1: Number(score1) || 0,
                    score2: Number(score2) || 0,
                });
            }
            pushToast?.(override ? 'Đã override kết quả.' : 'Đã báo cáo kết quả.');
            setMatchModalOpen(false);
            await reload();
        }
        catch (submitError) {
            setMatchSubmitError(submitError?.message ?? 'Không thể gửi kết quả.');
        }
    };
    const handleStartMatch = async () => {
        if (!tournament || !selectedMatch || !canManage)
            return;
        setIsActionLoading(true);
        setMatchSubmitError(null);
        try {
            const result = await startTournamentMatch(tournament.id, selectedMatch.id);
            setStartMatchNote(`Đã tạo channels trận. Team A: ${result.workspace.team_a_channel_id} | Team B: ${result.workspace.team_b_channel_id}. Tuyển thủ bắt buộc share màn hình trong channel đội.`);
            await reload();
            pushToast?.('Đã bắt đầu trận và tạo workspace.');
        }
        catch (err) {
            setMatchSubmitError(err?.message ?? 'Không thể bắt đầu trận.');
        }
        finally {
            setIsActionLoading(false);
        }
    };
    const handleBindRole = async () => {
        if (!tournament || !bindRoleCode.trim() || !bindUserId.trim())
            return;
        if (!roles.some((role) => role.code === bindRoleCode.trim())) {
            setInlineError('Role không hợp lệ hoặc chưa load xong. Vui lòng chọn lại role.');
            return;
        }
        setIsActionLoading(true);
        try {
            await bindTournamentRole(tournament.id, { role_code: bindRoleCode.trim(), user_id: bindUserId.trim() });
            setBindUserId('');
            setBindUserQuery('');
            await reload();
            pushToast?.('Đã gán role giải đấu.');
        }
        catch (err) {
            setInlineError(err?.message ?? 'Không thể gán role.');
        }
        finally {
            setIsActionLoading(false);
        }
    };
    const handleUnbindRole = async (roleCode, userId) => {
        if (!tournament)
            return;
        setIsActionLoading(true);
        try {
            await unbindTournamentRole(tournament.id, roleCode, userId);
            await reload();
            pushToast?.('Đã gỡ role giải đấu.');
        }
        catch (err) {
            setInlineError(err?.message ?? 'Không thể gỡ role.');
        }
        finally {
            setIsActionLoading(false);
        }
    };
    const handleProvisionWorkspace = async (matchId) => {
        if (!tournament)
            return;
        setIsActionLoading(true);
        try {
            await provisionTournamentMatchWorkspace(tournament.id, matchId);
            await reload();
            pushToast?.('Đã tạo workspace trận đấu.');
        }
        catch (err) {
            setInlineError(err?.message ?? 'Không thể tạo workspace.');
        }
        finally {
            setIsActionLoading(false);
        }
    };
    useEffect(() => {
        if (!canManage || !tournament || roles.length === 0 || serverMembers.length === 0)
            return;
        const run = async () => {
            const participantUserIds = new Set(participants.map((p) => p.user?.id).filter((id) => Boolean(id)));
            const allMemberIds = serverMembers.map((m) => m.id);
            const roleByCode = new Map(roles.map((r) => [r.code, r]));
            const playerRole = roleByCode.get('player');
            const spectatorRole = roleByCode.get('spectator');
            if (!playerRole || !spectatorRole)
                return;
            const bindingsByRole = new Map();
            roleBindings.forEach((b) => {
                const set = bindingsByRole.get(b.role_id) ?? new Set();
                set.add(b.user_id);
                bindingsByRole.set(b.role_id, set);
            });
            const playerBound = bindingsByRole.get(playerRole.id) ?? new Set();
            const spectatorBound = bindingsByRole.get(spectatorRole.id) ?? new Set();
            const missingPlayer = allMemberIds.filter((id) => participantUserIds.has(id) && !playerBound.has(id));
            const missingSpectator = allMemberIds.filter((id) => !participantUserIds.has(id) && !spectatorBound.has(id));
            const wrongSpectator = allMemberIds.filter((id) => participantUserIds.has(id) && spectatorBound.has(id));
            if (missingPlayer.length === 0 && missingSpectator.length === 0 && wrongSpectator.length === 0)
                return;
            for (const id of missingPlayer) {
                await bindTournamentRole(tournament.id, { role_code: 'player', user_id: id });
            }
            for (const id of missingSpectator) {
                await bindTournamentRole(tournament.id, { role_code: 'spectator', user_id: id });
            }
            for (const id of wrongSpectator) {
                await unbindTournamentRole(tournament.id, 'spectator', id);
            }
            await reload();
        };
        void run();
    }, [canManage, participants, roleBindings, roles, serverMembers, tournament, reload]);
    const participantUserIds = useMemo(() => new Set(participants.map((p) => p.user?.id).filter((id) => Boolean(id))), [participants]);
    const bindCandidates = useMemo(() => {
        const keyword = bindUserQuery.trim().toLowerCase();
        return serverMembers.filter((member) => {
            const memberName = member.name ?? '';
            if (keyword && !memberName.toLowerCase().includes(keyword))
                return false;
            if (bindRoleCode === 'player')
                return participantUserIds.has(member.id);
            if (bindRoleCode === 'spectator')
                return !participantUserIds.has(member.id);
            return true;
        });
    }, [bindRoleCode, bindUserQuery, participantUserIds, serverMembers]);
    const filteredBindings = useMemo(() => {
        if (bindingRoleFilter === 'all')
            return roleBindings;
        const role = roles.find((item) => item.code === bindingRoleFilter);
        if (!role)
            return roleBindings;
        return roleBindings.filter((item) => item.role_id === role.id);
    }, [bindingRoleFilter, roleBindings, roles]);
    const roleCodeById = useMemo(() => {
        const map = new Map();
        roles.forEach((role) => map.set(role.id, role.code));
        return map;
    }, [roles]);
    const currentUserTournamentRoleCodes = useMemo(() => {
        if (!currentUser?.id)
            return new Set();
        const set = new Set();
        roleBindings.forEach((binding) => {
            if (binding.user_id !== currentUser.id)
                return;
            const code = roleCodeById.get(binding.role_id);
            if (code)
                set.add(code);
        });
        return set;
    }, [currentUser?.id, roleBindings, roleCodeById]);
    if (loading) {
        return (_jsxs("div", { className: "space-y-4 p-4", children: [_jsx("div", { className: "h-16 animate-pulse rounded-xl bg-zinc-800/70" }), _jsx("div", { className: "h-[520px] animate-pulse rounded-xl bg-zinc-900/70" })] }));
    }
    if (error || !tournament) {
        return (_jsx("div", { className: "flex h-full items-center justify-center p-6", children: _jsx("div", { className: "rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200", children: error ?? 'Không tìm thấy giải đấu.' }) }));
    }
    const statusMeta = TOURNAMENT_STATUS_META[tournament.status];
    const formatMeta = TOURNAMENT_FORMAT_META[tournament.format];
    const canJudgeMatchResult = Boolean(selectedMatch &&
        selectedMatch.status === 'in_progress' &&
        (canManage ||
            currentUserTournamentRoleCodes.has('admin') ||
            currentUserTournamentRoleCodes.has('referee')));
    return (_jsxs("div", { className: "flex h-full min-h-0 w-full min-w-0 flex-col bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,0.16),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_44%),#06080f]", children: [_jsxs("header", { className: "flex h-16 shrink-0 items-center justify-between border-b border-cyan-400/15 px-4", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => navigate(`/app/servers/${serverId}/tournaments`), className: "rounded-md border border-white/10 p-1 text-zinc-300 hover:bg-white/10", children: _jsx(ArrowLeft, { className: "h-4 w-4" }) }), _jsx(Badge, { variant: "outline", children: tournament.game }), _jsx(Badge, { variant: "outline", children: formatMeta.label }), _jsx(Badge, { variant: "outline", className: statusMeta.className, children: statusMeta.label })] }), _jsx("h1", { className: "truncate font-['Orbitron','Rajdhani','Segoe_UI',sans-serif] text-lg font-semibold tracking-[0.03em] text-white", children: tournament.name })] }), _jsxs("div", { className: "flex items-center gap-2", children: [!canManage && tournament.status === 'registration' && (_jsx(Button, { type: "button", size: "sm", onClick: () => void toggleRegister(), disabled: isActionLoading || currentUser?.id === tournament.created_by, children: myParticipant ? 'Huỷ đăng ký' : 'Đăng ký tham gia' })), !canManage && tournament.status === 'check_in' && myParticipant && (_jsxs(Button, { type: "button", size: "sm", onClick: () => void checkIn(), disabled: isActionLoading, children: [_jsx(Check, { className: "mr-2 h-4 w-4" }), "Check-in"] })), canManage && tournament.status === 'draft' && (_jsxs(_Fragment, { children: [_jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: () => setIsEditOpen(true), children: [_jsx(Pencil, { className: "mr-2 h-4 w-4" }), "Ch\u1EC9nh s\u1EEDa"] }), _jsx(Button, { type: "button", size: "sm", onClick: () => void runStatus('registration'), disabled: isActionLoading, children: "M\u1EDF \u0111\u0103ng k\u00FD" })] })), canManage && tournament.status === 'registration' && (_jsx(Button, { type: "button", size: "sm", onClick: () => void runStatus('check_in'), disabled: isActionLoading, children: "Chuy\u1EC3n sang Check-in" })), canManage && tournament.status === 'check_in' && (_jsxs(Button, { type: "button", size: "sm", onClick: () => void runStatus('in_progress'), disabled: isActionLoading, children: [_jsx(Play, { className: "mr-2 h-4 w-4" }), "B\u1EAFt \u0111\u1EA7u gi\u1EA3i"] })), canManage && tournament.status === 'in_progress' && (_jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: () => void runStatus('completed'), disabled: isActionLoading, children: [_jsx(Trophy, { className: "mr-2 h-4 w-4" }), "K\u1EBFt th\u00FAc gi\u1EA3i"] }))] })] }), _jsx("div", { className: "gp-scrollbar min-h-0 flex-1 overflow-auto p-4", children: _jsxs(Tabs, { value: activeTab, onValueChange: (value) => setActiveTab(value), children: [_jsxs(TabsList, { className: "grid w-full max-w-[780px] grid-cols-5 border border-white/10 bg-zinc-900/70", children: [_jsx(TabsTrigger, { value: "info", children: "Th\u00F4ng tin" }), _jsx(TabsTrigger, { value: "participants", children: "Ng\u01B0\u1EDDi tham gia" }), _jsx(TabsTrigger, { value: "bracket", children: "Bracket" }), _jsx(TabsTrigger, { value: "history", children: "L\u1ECBch s\u1EED tr\u1EADn" }), _jsx(TabsTrigger, { value: "ops", children: "Ops" })] }), _jsx(TabsContent, { value: "info", className: "mt-3", children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("section", { className: `${cardCls} p-4`, children: [_jsx("h3", { className: sectionTitleCls, children: "M\u00F4 t\u1EA3" }), _jsx("p", { className: "mt-2 text-sm text-zinc-200/90", children: tournament.description?.trim() || 'Chưa cập nhật mô tả.' })] }), _jsxs("section", { className: `${cardCls} p-4`, children: [_jsx("h3", { className: sectionTitleCls, children: "Lu\u1EADt ch\u01A1i" }), _jsx("p", { className: "mt-2 text-sm text-zinc-200/90", children: tournament.rules?.trim() || 'Chưa cập nhật luật chơi.' })] }), _jsxs("section", { className: `${cardCls} p-4`, children: [_jsx("h3", { className: sectionTitleCls, children: "Gi\u1EA3i th\u01B0\u1EDFng" }), _jsx("p", { className: "mt-2 text-sm text-zinc-200/90", children: tournament.prize_pool?.trim() || 'Chưa cập nhật giải thưởng.' })] }), _jsxs("section", { className: `${cardCls} p-4`, children: [_jsx("h3", { className: sectionTitleCls, children: "Th\u00F4ng s\u1ED1" }), _jsxs("div", { className: "mt-2 space-y-1.5 text-sm text-zinc-200", children: [_jsxs("p", { className: "flex justify-between", children: [_jsx("span", { className: "text-zinc-400", children: "Format" }), _jsx("span", { children: formatMeta.label })] }), _jsxs("p", { className: "flex justify-between", children: [_jsx("span", { className: "text-zinc-400", children: "\u0110\u0103ng k\u00FD" }), _jsxs("span", { children: [participants.length, "/", tournament.max_participants] })] }), _jsxs("p", { className: "flex justify-between", children: [_jsx("span", { className: "text-zinc-400", children: "H\u1EA1n \u0111\u0103ng k\u00FD" }), _jsx("span", { children: formatDateTime(tournament.registration_deadline) })] })] })] })] }) }), _jsx(TabsContent, { value: "participants", className: "mt-3", children: _jsxs("section", { className: `${cardCls} p-4`, children: [_jsx("h3", { className: sectionTitleCls, children: "Participants" }), _jsx("div", { className: "mt-3 overflow-hidden rounded-lg border border-white/10", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "bg-zinc-900/80 text-left text-xs uppercase tracking-[0.14em] text-zinc-400", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Seed" }), _jsx("th", { className: "px-3 py-2", children: "T\u00EAn" }), _jsx("th", { className: "px-3 py-2", children: "Status" }), _jsx("th", { className: "px-3 py-2", children: "\u0110\u0103ng k\u00FD" })] }) }), _jsx("tbody", { children: participants.map((p) => (_jsxs("tr", { className: "border-t border-white/10 text-zinc-200", children: [_jsx("td", { className: "px-3 py-2", children: p.seed ?? '-' }), _jsx("td", { className: "px-3 py-2", children: _jsxs("span", { className: "flex items-center gap-2", children: [_jsx("img", { src: getAvatarUrl(p), alt: getName(p), className: "h-6 w-6 rounded-full border border-white/20 bg-zinc-900 object-cover" }), _jsx("span", { children: getName(p) })] }) }), _jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: "outline", className: PARTICIPANT_STATUS_META[p.status].className, children: PARTICIPANT_STATUS_META[p.status].label }) }), _jsx("td", { className: "px-3 py-2 text-zinc-400", children: formatDateTime(p.registered_at) })] }, p.id))) })] }) })] }) }), _jsx(TabsContent, { value: "bracket", className: "mt-3", children: _jsxs("section", { className: `${cardCls} p-4`, children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h3", { className: sectionTitleCls, children: "Bracket tr\u1EF1c quan" }), _jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: () => void reload(), children: [_jsx(Loader2, { className: "mr-2 h-4 w-4" }), "Refresh"] })] }), bracket.length === 0 ? (_jsx("div", { className: "rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-sm text-zinc-400", children: "Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u bracket." })) : tournament.format === 'round_robin' ? (_jsxs("div", { className: "grid grid-cols-[1fr_280px] gap-4", children: [_jsx("div", { className: "rounded-lg border border-white/10 bg-zinc-950/70 p-3 text-sm text-zinc-300", children: "Round Robin matrix \u0111ang d\u00F9ng d\u1EEF li\u1EC7u tr\u1EADn \u0111\u1EC3 hi\u1EC3n th\u1ECB tr\u1EF1c ti\u1EBFp theo tab l\u1ECBch s\u1EED." }), _jsxs("div", { className: "rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3", children: [_jsx("p", { className: "mb-2 text-xs uppercase tracking-[0.15em] text-cyan-200", children: "Standings" }), standings.map((p, i) => _jsxs("div", { className: "mb-1 rounded border border-white/10 bg-zinc-900/70 px-2 py-1 text-sm text-zinc-200", children: ["#", i + 1, " ", getName(p)] }, p.id))] })] })) : tournament.format === 'double_elimination' ? (_jsx(DoubleEliminationTree, { matches: bracket, myParticipant: myParticipant, onOpenMatch: openMatch })) : tournament.format === 'swiss' ? (_jsx(SwissBracketBoard, { rounds: rounds, standings: standings, tournamentStatus: tournament.status, onOpenMatch: openMatch })) : (_jsx(SingleEliminationTree, { matches: bracket, myParticipant: myParticipant, onOpenMatch: openMatch }))] }) }), _jsx(TabsContent, { value: "history", className: "mt-3", children: _jsxs("section", { className: `${cardCls} p-4`, children: [_jsx("h3", { className: sectionTitleCls, children: "L\u1ECBch s\u1EED tr\u1EADn" }), _jsx("div", { className: "mt-3 overflow-hidden rounded-lg border border-white/10", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "bg-zinc-900/80 text-left text-xs uppercase tracking-[0.14em] text-zinc-400", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Round" }), _jsx("th", { className: "px-3 py-2", children: "C\u1EB7p \u0111\u1EA5u" }), _jsx("th", { className: "px-3 py-2", children: "Score" }), _jsx("th", { className: "px-3 py-2", children: "Th\u1EDDi gian" })] }) }), _jsx("tbody", { children: history.map((m) => _jsxs("tr", { className: "border-t border-white/10 text-zinc-200", children: [_jsx("td", { className: "px-3 py-2", children: m.round }), _jsxs("td", { className: "px-3 py-2", children: [getName(m.participant1), " vs ", getName(m.participant2)] }), _jsxs("td", { className: "px-3 py-2", children: [scoreText(m.score1), " - ", scoreText(m.score2)] }), _jsx("td", { className: "px-3 py-2 text-zinc-400", children: formatDateTime(m.completed_at ?? m.created_at) })] }, m.id)) })] }) })] }) }), _jsx(TabsContent, { value: "ops", className: "mt-3", children: _jsxs("section", { className: `${cardCls} p-4`, children: [_jsx("h3", { className: sectionTitleCls, children: "Tournament Ops" }), !canManage ? (_jsx("div", { className: "mt-3 rounded-lg border border-white/10 bg-zinc-900/70 p-3 text-sm text-zinc-300", children: "Ch\u1EC9 admin/host m\u1EDBi c\u00F3 quy\u1EC1n qu\u1EA3n tr\u1ECB role/workspace." })) : (_jsxs("div", { className: "mt-3 grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-3 rounded-lg border border-white/10 bg-zinc-900/70 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.14em] text-zinc-400", children: "Role Binding" }), _jsxs("div", { className: "grid grid-cols-[160px_1fr_auto] gap-2", children: [_jsx("select", { value: bindRoleCode, onChange: (e) => setBindRoleCode(e.target.value), className: "h-10 rounded-md border border-white/10 bg-zinc-900/80 px-3 text-sm", children: roles.map((role) => (_jsx("option", { value: role.code, children: role.code }, role.id))) }), _jsx(Input, { value: bindUserQuery, onChange: (e) => {
                                                                    setBindUserQuery(e.target.value);
                                                                    setBindUserId('');
                                                                }, placeholder: "T\u00ECm user trong server..." }), _jsx(Button, { type: "button", size: "sm", onClick: () => void handleBindRole(), disabled: isActionLoading || !bindUserId, children: "Bind" })] }), bindCandidates.length > 0 && (_jsx("div", { className: "max-h-40 overflow-auto rounded border border-white/10 bg-zinc-950/70", children: bindCandidates
                                                            .slice(0, 12)
                                                            .map((m) => (_jsxs("button", { type: "button", className: "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5", onClick: () => {
                                                                setBindUserId(m.id);
                                                                setBindUserQuery(m.name);
                                                            }, children: [_jsx("span", { children: m.name }), _jsx("span", { className: "text-xs text-zinc-500", children: m.id.slice(0, 8) })] }, m.id))) })), _jsxs("div", { className: "grid grid-cols-[160px_1fr] gap-2", children: [_jsxs("select", { value: bindingRoleFilter, onChange: (e) => setBindingRoleFilter(e.target.value), className: "h-9 rounded-md border border-white/10 bg-zinc-900/80 px-3 text-xs", children: [_jsx("option", { value: "all", children: "all roles" }), roles.map((role) => (_jsx("option", { value: role.code, children: role.code }, `filter-${role.id}`)))] }), _jsx("p", { className: "self-center text-xs text-zinc-400", children: "Filter binding theo role" })] }), _jsx("div", { className: "space-y-2", children: filteredBindings.map((item) => {
                                                            const role = roleById.get(item.role_id);
                                                            return (_jsxs("div", { className: "flex items-center justify-between rounded border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm", children: [_jsxs("span", { className: "text-zinc-200", children: [role?.code ?? item.role_id, " \u2192 ", memberNameById.get(item.user_id) ?? item.user_id] }), _jsx(Button, { type: "button", size: "sm", variant: "outline", onClick: () => {
                                                                            if (!role)
                                                                                return;
                                                                            void handleUnbindRole(role.code, item.user_id);
                                                                        }, children: "Unbind" })] }, item.id));
                                                        }) }), _jsxs("div", { className: "rounded border border-white/10 bg-zinc-950/70 p-2", children: [_jsx("p", { className: "mb-1 text-xs uppercase tracking-[0.12em] text-zinc-500", children: "Players (auto)" }), _jsx("div", { className: "space-y-1", children: participants
                                                                    .filter((p) => Boolean(p.user?.id))
                                                                    .map((p) => (_jsx("div", { className: "text-sm text-zinc-200", children: p.user?.username ?? p.id }, p.id))) })] }), _jsx("div", { className: "rounded border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-200", children: "Auto role sync: tuy\u1EC3n th\u1EE7 = `player`, th\u00E0nh vi\u00EAn c\u00F2n l\u1EA1i trong server = `spectator`." })] }), _jsxs("div", { className: "space-y-3 rounded-lg border border-white/10 bg-zinc-900/70 p-3", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.14em] text-zinc-400", children: "Match Workspace" }), _jsx("div", { className: "space-y-2", children: bracket.map((match) => {
                                                            const workspace = workspaces.find((w) => w.match_id === match.id);
                                                            return (_jsxs("div", { className: "rounded border border-white/10 bg-zinc-950/70 p-2 text-sm", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("span", { className: "text-zinc-200", children: ["R", match.round, " M", match.match_number, ": ", getName(match.participant1), " vs ", getName(match.participant2)] }), workspace ? (_jsx(Badge, { variant: "outline", className: "border-emerald-500/40 bg-emerald-500/20 text-emerald-100", children: "Ready" })) : (_jsx(Button, { type: "button", size: "sm", variant: "outline", onClick: () => void handleProvisionWorkspace(match.id), disabled: isActionLoading, children: "Provision" }))] }), workspace && (_jsxs("div", { className: "mt-2 text-xs text-zinc-400", children: ["cat:", workspace.category_channel_id, " | A:", workspace.team_a_channel_id, " | B:", workspace.team_b_channel_id] }))] }, match.id));
                                                        }) }), _jsx("div", { className: "rounded border border-cyan-500/25 bg-cyan-500/[0.06] px-3 py-2 text-xs text-cyan-100", children: "Bridge policy: `admin/referee` \u0111\u01B0\u1EE3c c\u1EA5p quy\u1EC1n v\u00E0o c\u1EA3 `team-a` + `team-b` voice \u0111\u1EC3 theo d\u00F5i m\u00E0n h\u00ECnh tuy\u1EC3n th\u1EE7 tr\u1EF1c ti\u1EBFp." })] })] }))] }) })] }) }), inlineError && _jsx("div", { className: "border-t border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200", children: inlineError }), _jsx(TournamentCreateEditDialog, { open: isEditOpen, onOpenChange: setIsEditOpen, serverId: serverId, tournament: tournament, onSuccess: () => { void reload(); refreshActiveServerTournaments?.(); } }), _jsx(Dialog, { open: matchModalOpen, onOpenChange: setMatchModalOpen, children: _jsxs(DialogContent, { className: "max-w-xl border-cyan-500/20 bg-[linear-gradient(140deg,#090c14,#111826)] text-zinc-100", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Chi ti\u1EBFt tr\u1EADn" }), _jsx(DialogDescription, { children: selectedMatch ? `Round ${selectedMatch.round} - Match ${selectedMatch.match_number}` : 'Không có dữ liệu' })] }), selectedMatch && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "rounded-lg border border-white/10 bg-zinc-900/70 p-3", children: [_jsx("p", { className: "mb-2 text-xs uppercase tracking-[0.14em] text-zinc-400", children: selectedMatch.status }), _jsx("div", { className: "space-y-1.5", children: [selectedMatch.participant1, selectedMatch.participant2].map((p, i) => (_jsxs("div", { className: "flex items-center justify-between rounded-md border border-white/10 bg-zinc-950/70 px-3 py-2", children: [_jsxs("span", { className: "flex min-w-0 items-center gap-2", children: [_jsx("img", { src: getAvatarUrl(p), alt: getName(p), className: "h-6 w-6 rounded-full border border-white/20 bg-zinc-900 object-cover" }), _jsx("span", { className: "truncate", children: getName(p) })] }), _jsx("span", { className: "font-semibold", children: i === 0 ? scoreText(selectedMatch.score1) : scoreText(selectedMatch.score2) })] }, `${selectedMatch.id}-${i}`))) })] }), canJudgeMatchResult && (_jsxs("div", { className: "space-y-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3", children: [_jsx(Label, { children: "Winner" }), _jsxs("select", { value: winnerId, onChange: (e) => setWinnerId(e.target.value), className: "h-10 w-full rounded-md border border-white/10 bg-zinc-900/80 px-3 text-sm", children: [_jsx("option", { value: "", children: "Ch\u1ECDn winner" }), selectedMatch.participant1 && _jsx("option", { value: selectedMatch.participant1.id, children: getName(selectedMatch.participant1) }), selectedMatch.participant2 && _jsx("option", { value: selectedMatch.participant2.id, children: getName(selectedMatch.participant2) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(Input, { type: "number", value: score1, onChange: (e) => setScore1(e.target.value) }), _jsx(Input, { type: "number", value: score2, onChange: (e) => setScore2(e.target.value) })] }), canManage && selectedMatch?.status === 'completed' && (_jsx(Input, { value: overrideReason, onChange: (e) => setOverrideReason(e.target.value), placeholder: "L\u00FD do override" })), matchSubmitError && _jsx("p", { className: "text-sm text-rose-300", children: matchSubmitError }), startMatchNote && _jsx("p", { className: "text-sm text-emerald-300", children: startMatchNote })] }))] })), _jsxs(DialogFooter, { children: [canManage && selectedMatch && selectedMatch.status !== 'in_progress' && selectedMatch.status !== 'completed' && (_jsxs(Button, { type: "button", variant: "outline", onClick: () => void handleStartMatch(), disabled: isActionLoading, children: [_jsx(Play, { className: "mr-2 h-4 w-4" }), "Start Match"] })), canJudgeMatchResult && (_jsxs(Button, { type: "button", onClick: () => void submitMatch(false), children: [_jsx(Swords, { className: "mr-2 h-4 w-4" }), canManage ? 'Cập nhật kết quả' : 'Báo cáo kết quả'] })), canManage && selectedMatch && selectedMatch.status === 'completed' && (_jsxs(Button, { type: "button", variant: "outline", onClick: () => void submitMatch(true), children: [_jsx(Crown, { className: "mr-2 h-4 w-4" }), "Override k\u1EBFt qu\u1EA3"] })), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setMatchModalOpen(false), children: "\u0110\u00F3ng" })] })] }) })] }));
};
//# sourceMappingURL=TournamentDetailPage.js.map