import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@goportal/ui'
import type {
  TournamentDetailDTO,
  TournamentMatchDTO,
  TournamentMatchStatusDTO,
  TournamentParticipantDTO,
  TournamentStatusDTO,
} from '@goportal/types'
import {
  ArrowLeft,
  Check,
  Crown,
  Loader2,
  Pencil,
  Play,
  Swords,
  Trophy,
} from 'lucide-react'
import { useAuthStore } from '@goportal/store'
import {
  cancelTournamentRegistration,
  checkInTournamentParticipant,
  getTournamentBracket,
  getTournamentDetail,
  getTournamentStandings,
  listTournamentMatches,
  overrideTournamentMatchResult,
  registerTournamentParticipant,
  reportTournamentMatchResult,
  updateTournamentStatus,
} from '../services'
import { TournamentCreateEditDialog } from './TournamentCreateEditDialog'
import { DoubleEliminationTree, SingleEliminationTree } from './components/DoubleEliminationTree'
import {
  formatDateTime,
  getParticipantDisplayName,
  PARTICIPANT_STATUS_META,
  TOURNAMENT_FORMAT_META,
  TOURNAMENT_STATUS_META,
} from './utils'

type TabKey = 'info' | 'participants' | 'bracket' | 'history'

type ShellContext = {
  canManageTournaments?: boolean
  pushToast?: (message: string) => void
  refreshActiveServerTournaments?: () => void
}

const cardCls =
  'rounded-xl border border-cyan-500/20 bg-[linear-gradient(140deg,rgba(8,10,18,0.96),rgba(13,19,30,0.9))] shadow-[0_18px_40px_rgba(0,0,0,0.35)]'

const sectionTitleCls =
  "font-['Rajdhani','Segoe_UI',sans-serif] text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80"

const scoreText = (value?: number | null) => (typeof value === 'number' ? String(value) : '-')

const getName = (participant?: TournamentParticipantDTO | null) =>
  participant ? getParticipantDisplayName(participant) : 'TBD'

const getAvatarUrl = (participant?: TournamentParticipantDTO | null) => {
  if (!participant) {
    return 'https://api.dicebear.com/9.x/initials/svg?seed=TBD&backgroundColor=0f172a,164e63'
  }
  const directAvatar = participant.user?.avatar_url
  if (directAvatar && directAvatar.trim().length > 0) {
    return directAvatar
  }
  const seed = encodeURIComponent(getName(participant))
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=0f172a,14532d,7f1d1d`
}

const MATCH_STATUS_META: Record<TournamentMatchStatusDTO, { label: string; className: string }> = {
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
}

type SwissLane = 'win' | 'loss' | 'mixed'

type SwissRoundLane = {
  title: string
  lane: SwissLane
  matches: TournamentMatchDTO[]
}

type SwissRoundStage = {
  round: number
  lanes: SwissRoundLane[]
}

const getParticipantId = (participant?: TournamentParticipantDTO | null) => participant?.id ?? ''

const getSwissLane = (
  match: TournamentMatchDTO,
  roundRecord: Map<string, { wins: number; losses: number }>,
): SwissLane => {
  const participant1 = roundRecord.get(getParticipantId(match.participant1)) ?? { wins: 0, losses: 0 }
  const participant2 = roundRecord.get(getParticipantId(match.participant2)) ?? { wins: 0, losses: 0 }
  const score1 = participant1.wins - participant1.losses
  const score2 = participant2.wins - participant2.losses
  const average = (score1 + score2) / 2
  if (average > 0) return 'win'
  if (average < 0) return 'loss'
  return 'mixed'
}

const getBoLabel = (round: number, totalRounds: number) => {
  if (round === totalRounds && round >= 3) return 'BO3'
  return 'BO1'
}

const laneMeta: Record<SwissLane, { title: string; cardClass: string; lineClass: string; textClass: string }> = {
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
}

const SwissBracketBoard: React.FC<{
  rounds: Array<{ round: number; matches: TournamentMatchDTO[] }>
  standings: TournamentParticipantDTO[]
  tournamentStatus: TournamentStatusDTO
  onOpenMatch: (match: TournamentMatchDTO) => void
}> = ({ rounds, standings, tournamentStatus, onOpenMatch }) => {
  const stages = useMemo<SwissRoundStage[]>(() => {
    const participantRecord = new Map<string, { wins: number; losses: number }>()
    const output: SwissRoundStage[] = []

    rounds.forEach(({ round, matches }) => {
      const lanes: Record<SwissLane, TournamentMatchDTO[]> = {
        win: [],
        loss: [],
        mixed: [],
      }

      const sortedMatches = [...matches].sort((left, right) => {
        const leftTime = left.scheduled_at ?? left.created_at
        const rightTime = right.scheduled_at ?? right.created_at
        if (leftTime !== rightTime) return leftTime - rightTime
        return left.match_number - right.match_number
      })

      sortedMatches.forEach((match) => {
        const lane = round === 1 ? 'mixed' : getSwissLane(match, participantRecord)
        lanes[lane].push(match)
      })

      const roundLanes: SwissRoundLane[] = []
      if (round === 1) {
        if (lanes.mixed.length > 0) {
          roundLanes.push({
            title: `Round ${round} (Khởi động)`,
            lane: 'mixed',
            matches: lanes.mixed,
          })
        }
      } else {
        if (lanes.win.length > 0) {
          roundLanes.push({
            title: `Round ${round} (Thắng)`,
            lane: 'win',
            matches: lanes.win,
          })
        }
        if (lanes.loss.length > 0) {
          roundLanes.push({
            title: `Round ${round} (Thua)`,
            lane: 'loss',
            matches: lanes.loss,
          })
        }
        if (lanes.mixed.length > 0) {
          roundLanes.push({
            title: `Round ${round} (Trung gian)`,
            lane: 'mixed',
            matches: lanes.mixed,
          })
        }
      }

      if (roundLanes.length === 0 && sortedMatches.length > 0) {
        roundLanes.push({
          title: `Round ${round}`,
          lane: 'mixed',
          matches: sortedMatches,
        })
      }
      output.push({ round, lanes: roundLanes })

      sortedMatches.forEach((match) => {
        if (match.status !== 'completed' || !match.winner?.id) return
        const winnerId = match.winner.id
        const participant1Id = getParticipantId(match.participant1)
        const participant2Id = getParticipantId(match.participant2)
        const loserId = participant1Id === winnerId ? participant2Id : participant1Id

        if (winnerId) {
          const current = participantRecord.get(winnerId) ?? { wins: 0, losses: 0 }
          participantRecord.set(winnerId, { wins: current.wins + 1, losses: current.losses })
        }
        if (loserId) {
          const current = participantRecord.get(loserId) ?? { wins: 0, losses: 0 }
          participantRecord.set(loserId, { wins: current.wins, losses: current.losses + 1 })
        }
      })
    })

    return output
  }, [rounds])

  const champion = useMemo(
    () =>
      standings.find((item) => item.status === 'winner') ??
      standings.find((item) => item.final_rank === 1) ??
      standings[0] ??
      null,
    [standings],
  )

  return (
    <div className="space-y-3">
      {tournamentStatus === 'completed' && champion && (
        <div className="rounded-2xl border border-amber-300/40 bg-[linear-gradient(145deg,rgba(120,53,15,0.32),rgba(146,64,14,0.22),rgba(30,41,59,0.7))] p-3 shadow-[0_16px_35px_rgba(113,63,18,0.28)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-amber-200/90">Nhà vô địch</p>
          <div className="mt-2 flex items-center gap-3">
            <img
              src={getAvatarUrl(champion)}
              alt={getName(champion)}
              className="h-10 w-10 rounded-full border border-amber-200/50 bg-zinc-900 object-cover"
            />
            <div>
              <p className="text-base font-semibold text-amber-50">{getName(champion)}</p>
              <p className="text-xs text-amber-100/85">Đồng hạng #1 - Kết thúc giải đấu</p>
            </div>
          </div>
        </div>
      )}

      <div className="gp-scrollbar gp-scrollbar-thin overflow-auto rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_35%),linear-gradient(130deg,rgba(4,10,20,0.95),rgba(9,16,30,0.9))] p-4 shadow-[0_16px_40px_rgba(2,6,23,0.55)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-[0.14em] text-cyan-200">Swiss System Bracket</div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-400" />Nhánh thắng</span>
            <span className="inline-flex items-center gap-1.5 text-rose-200"><span className="h-2 w-2 rounded-full bg-rose-400" />Nhánh thua</span>
          </div>
        </div>

        <div className="flex min-w-[1240px] gap-4">
          {stages.map((stage, stageIndex) => (
            <div key={stage.round} className="relative min-w-[340px] flex-1">
              {stageIndex < stages.length - 1 && (
                <div className="pointer-events-none absolute right-[-8px] top-4 bottom-4 border-r border-dashed border-cyan-400/20" />
              )}
              <div className="mb-3 rounded-xl border border-cyan-300/25 bg-[linear-gradient(160deg,rgba(8,47,73,0.55),rgba(2,6,23,0.85))] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100 shadow-[inset_0_1px_0_rgba(103,232,249,0.2)]">
                Round {stage.round}
              </div>
              <div className="space-y-3">
                {stage.lanes.map((lane) => {
                  const meta = laneMeta[lane.lane]
                  return (
                    <div key={lane.title} className={`rounded-xl border p-3 ${meta.cardClass} shadow-[0_10px_28px_rgba(2,6,23,0.3)]`}>
                      <p className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${meta.textClass}`}>
                        {lane.title}
                      </p>
                      {lane.matches.length === 0 ? (
                        <div className="rounded border border-dashed border-white/15 bg-zinc-950/50 px-2 py-2 text-xs text-zinc-400">
                          Chưa có trận phù hợp cho nhánh này.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {lane.matches.map((match) => {
                            const boLabel = getBoLabel(stage.round, stages.length)
                            const winnerId = match.winner?.id ?? ''
                            const p1Win = winnerId && match.participant1?.id === winnerId
                            const p2Win = winnerId && match.participant2?.id === winnerId
                            return (
                              <button
                                key={match.id}
                                type="button"
                                onClick={() => onOpenMatch(match)}
                                className="w-full rounded-lg border border-white/10 bg-[linear-gradient(150deg,rgba(9,9,11,0.9),rgba(15,23,42,0.72))] p-2 text-left transition duration-150 hover:-translate-y-[1px] hover:border-cyan-300/40 hover:shadow-[0_10px_24px_rgba(8,145,178,0.22)]"
                              >
                                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.13em] text-zinc-400">
                                  <span>Match {match.match_number}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span>{boLabel}</span>
                                    <span
                                      className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.11em] ${
                                        MATCH_STATUS_META[match.status].className
                                      }`}
                                    >
                                      {MATCH_STATUS_META[match.status].label}
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <div className={`flex items-center justify-between rounded px-2 py-1 ${p1Win ? 'bg-emerald-500/20 text-emerald-100' : winnerId ? 'bg-rose-500/12 text-rose-100' : 'bg-white/[0.03] text-zinc-200'}`}>
                                    <span className="flex min-w-0 items-center gap-2">
                                      <img
                                        src={getAvatarUrl(match.participant1)}
                                        alt={getName(match.participant1)}
                                        className="h-5 w-5 rounded-full border border-white/20 bg-zinc-900 object-cover"
                                      />
                                      <span className="truncate">{getName(match.participant1)}</span>
                                    </span>
                                    <span className="font-semibold">{scoreText(match.score1)}</span>
                                  </div>
                                  <div className={`flex items-center justify-between rounded px-2 py-1 ${p2Win ? 'bg-emerald-500/20 text-emerald-100' : winnerId ? 'bg-rose-500/12 text-rose-100' : 'bg-white/[0.03] text-zinc-200'}`}>
                                    <span className="flex min-w-0 items-center gap-2">
                                      <img
                                        src={getAvatarUrl(match.participant2)}
                                        alt={getName(match.participant2)}
                                        className="h-5 w-5 rounded-full border border-white/20 bg-zinc-900 object-cover"
                                      />
                                      <span className="truncate">{getName(match.participant2)}</span>
                                    </span>
                                    <span className="font-semibold">{scoreText(match.score2)}</span>
                                  </div>
                                </div>
                                <div className={`mt-2 border-t border-dashed pt-1 text-[10px] uppercase tracking-[0.12em] ${meta.textClass} ${meta.lineClass}`}>
                                  {meta.title}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const TournamentDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { serverId = '', tournamentId = '' } = useParams<{ serverId: string; tournamentId: string }>()
  const { canManageTournaments, pushToast, refreshActiveServerTournaments } = useOutletContext<ShellContext>()
  const currentUser = useAuthStore((state: any) => state.user)

  const [activeTab, setActiveTab] = useState<TabKey>('info')
  const [detail, setDetail] = useState<TournamentDetailDTO | null>(null)
  const [bracket, setBracket] = useState<TournamentMatchDTO[]>([])
  const [history, setHistory] = useState<TournamentMatchDTO[]>([])
  const [standings, setStandings] = useState<TournamentParticipantDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const [matchModalOpen, setMatchModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatchDTO | null>(null)
  const [winnerId, setWinnerId] = useState('')
  const [score1, setScore1] = useState('0')
  const [score2, setScore2] = useState('0')
  const [overrideReason, setOverrideReason] = useState('')
  const [matchSubmitError, setMatchSubmitError] = useState<string | null>(null)

  const tournament = detail?.tournament ?? null
  const participants = detail?.participants ?? []

  const isHost = useMemo(() => {
    if (!tournament || !currentUser) return false
    return tournament.created_by === currentUser.id || Boolean(currentUser.is_admin)
  }, [currentUser, tournament])

  const canManage = Boolean(canManageTournaments || isHost)

  const myParticipant = useMemo(
    () => participants.find((item) => item.user?.id === currentUser?.id) ?? null,
    [participants, currentUser?.id],
  )

  const rounds = useMemo(() => {
    const map = new Map<number, TournamentMatchDTO[]>()
    bracket.forEach((match) => {
      const current = map.get(match.round) ?? []
      current.push(match)
      map.set(match.round, current)
    })
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, matches]) => ({ round, matches: matches.sort((a, b) => a.match_number - b.match_number) }))
  }, [bracket])

  const reload = useCallback(async () => {
    if (!tournamentId) return
    setLoading(true)
    setInlineError(null)
    try {
      const [d, b, h, s] = await Promise.all([
        getTournamentDetail(tournamentId),
        getTournamentBracket(tournamentId),
        listTournamentMatches(tournamentId, { status: 'completed' }),
        getTournamentStandings(tournamentId),
      ])
      setDetail(d)
      setBracket(b)
      setHistory(h)
      setStandings(s)
      setError(null)
    } catch (loadError: any) {
      setError(loadError?.message ?? 'Không thể tải dữ liệu giải đấu.')
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    void reload()
  }, [reload])

  const runStatus = async (status: TournamentStatusDTO) => {
    if (!tournament) return
    if (status === 'in_progress') {
      const checkedIn = participants.filter((item) => item.status === 'checked_in').length
      if (checkedIn < 2) {
        setInlineError('Cần ít nhất 2 người check-in trước khi bắt đầu giải.')
        return
      }
    }
    setIsActionLoading(true)
    setInlineError(null)
    try {
      await updateTournamentStatus(tournament.id, status)
      pushToast?.('Đã cập nhật trạng thái giải đấu.')
      await reload()
      refreshActiveServerTournaments?.()
    } catch (statusError: any) {
      setInlineError(statusError?.message ?? 'Không thể cập nhật trạng thái.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const toggleRegister = async () => {
    if (!tournament || !currentUser) return
    if (currentUser.id === tournament.created_by) {
      setInlineError('Host không thể tự tham gia giải đấu.')
      return
    }
    setIsActionLoading(true)
    setInlineError(null)
    try {
      if (myParticipant) {
        await cancelTournamentRegistration(tournament.id)
        pushToast?.('Đã huỷ đăng ký.')
      } else {
        await registerTournamentParticipant(tournament.id)
        pushToast?.('Đăng ký thành công.')
      }
      await reload()
    } catch (registerError: any) {
      setInlineError(registerError?.message ?? 'Không thể cập nhật đăng ký.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const checkIn = async () => {
    if (!tournament || !myParticipant) return
    setIsActionLoading(true)
    setInlineError(null)
    try {
      await checkInTournamentParticipant(tournament.id, myParticipant.id)
      pushToast?.('Check-in thành công.')
      await reload()
    } catch (checkinError: any) {
      setInlineError(checkinError?.message ?? 'Không thể check-in.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const openMatch = (match: TournamentMatchDTO) => {
    setSelectedMatch(match)
    setWinnerId(match.winner?.id ?? '')
    setScore1(String(match.score1 ?? 0))
    setScore2(String(match.score2 ?? 0))
    setOverrideReason('')
    setMatchSubmitError(null)
    setMatchModalOpen(true)
  }

  const submitMatch = async (override = false) => {
    if (!tournament || !selectedMatch || !winnerId) return
    try {
      if (override) {
        await overrideTournamentMatchResult(tournament.id, selectedMatch.id, {
          winner_id: winnerId,
          score1: Number(score1) || 0,
          score2: Number(score2) || 0,
          reason: overrideReason.trim() || 'Host override',
        })
      } else {
        await reportTournamentMatchResult(tournament.id, selectedMatch.id, {
          winner_id: winnerId,
          score1: Number(score1) || 0,
          score2: Number(score2) || 0,
        })
      }
      pushToast?.(override ? 'Đã override kết quả.' : 'Đã báo cáo kết quả.')
      setMatchModalOpen(false)
      await reload()
    } catch (submitError: any) {
      setMatchSubmitError(submitError?.message ?? 'Không thể gửi kết quả.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-16 animate-pulse rounded-xl bg-zinc-800/70" />
        <div className="h-[520px] animate-pulse rounded-xl bg-zinc-900/70" />
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error ?? 'Không tìm thấy giải đấu.'}
        </div>
      </div>
    )
  }

  const statusMeta = TOURNAMENT_STATUS_META[tournament.status]
  const formatMeta = TOURNAMENT_FORMAT_META[tournament.format]

  const canReport = Boolean(
    selectedMatch &&
    myParticipant &&
    selectedMatch.status === 'in_progress' &&
    (selectedMatch.participant1?.id === myParticipant.id || selectedMatch.participant2?.id === myParticipant.id),
  )

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,0.16),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_44%),#06080f]">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-cyan-400/15 px-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <button type="button" onClick={() => navigate(`/app/servers/${serverId}/tournaments`)} className="rounded-md border border-white/10 p-1 text-zinc-300 hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Badge variant="outline">{tournament.game}</Badge>
            <Badge variant="outline">{formatMeta.label}</Badge>
            <Badge variant="outline" className={statusMeta.className}>{statusMeta.label}</Badge>
          </div>
          <h1 className="truncate font-['Orbitron','Rajdhani','Segoe_UI',sans-serif] text-lg font-semibold tracking-[0.03em] text-white">{tournament.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!canManage && tournament.status === 'registration' && (
            <Button type="button" size="sm" onClick={() => void toggleRegister()} disabled={isActionLoading || currentUser?.id === tournament.created_by}>
              {myParticipant ? 'Huỷ đăng ký' : 'Đăng ký tham gia'}
            </Button>
          )}
          {!canManage && tournament.status === 'check_in' && myParticipant && (
            <Button type="button" size="sm" onClick={() => void checkIn()} disabled={isActionLoading}><Check className="mr-2 h-4 w-4" />Check-in</Button>
          )}
          {canManage && tournament.status === 'draft' && (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setIsEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Chỉnh sửa</Button>
              <Button type="button" size="sm" onClick={() => void runStatus('registration')} disabled={isActionLoading}>Mở đăng ký</Button>
            </>
          )}
          {canManage && tournament.status === 'registration' && (
            <Button type="button" size="sm" onClick={() => void runStatus('check_in')} disabled={isActionLoading}>Chuyển sang Check-in</Button>
          )}
          {canManage && tournament.status === 'check_in' && (
            <Button type="button" size="sm" onClick={() => void runStatus('in_progress')} disabled={isActionLoading}><Play className="mr-2 h-4 w-4" />Bắt đầu giải</Button>
          )}
          {canManage && tournament.status === 'in_progress' && (
            <Button type="button" size="sm" variant="outline" onClick={() => void runStatus('completed')} disabled={isActionLoading}><Trophy className="mr-2 h-4 w-4" />Kết thúc giải</Button>
          )}
        </div>
      </header>

      <div className="gp-scrollbar min-h-0 flex-1 overflow-auto p-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
          <TabsList className="grid w-full max-w-[640px] grid-cols-4 border border-white/10 bg-zinc-900/70">
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="participants">Người tham gia</TabsTrigger>
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
            <TabsTrigger value="history">Lịch sử trận</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-3">
            <div className="grid grid-cols-2 gap-4">
              <section className={`${cardCls} p-4`}><h3 className={sectionTitleCls}>Mô tả</h3><p className="mt-2 text-sm text-zinc-200/90">{tournament.description?.trim() || 'Chưa cập nhật mô tả.'}</p></section>
              <section className={`${cardCls} p-4`}><h3 className={sectionTitleCls}>Luật chơi</h3><p className="mt-2 text-sm text-zinc-200/90">{tournament.rules?.trim() || 'Chưa cập nhật luật chơi.'}</p></section>
              <section className={`${cardCls} p-4`}><h3 className={sectionTitleCls}>Giải thưởng</h3><p className="mt-2 text-sm text-zinc-200/90">{tournament.prize_pool?.trim() || 'Chưa cập nhật giải thưởng.'}</p></section>
              <section className={`${cardCls} p-4`}>
                <h3 className={sectionTitleCls}>Thông số</h3>
                <div className="mt-2 space-y-1.5 text-sm text-zinc-200">
                  <p className="flex justify-between"><span className="text-zinc-400">Format</span><span>{formatMeta.label}</span></p>
                  <p className="flex justify-between"><span className="text-zinc-400">Đăng ký</span><span>{participants.length}/{tournament.max_participants}</span></p>
                  <p className="flex justify-between"><span className="text-zinc-400">Hạn đăng ký</span><span>{formatDateTime(tournament.registration_deadline)}</span></p>
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="participants" className="mt-3">
            <section className={`${cardCls} p-4`}>
              <h3 className={sectionTitleCls}>Participants</h3>
              <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-zinc-900/80 text-left text-xs uppercase tracking-[0.14em] text-zinc-400"><tr><th className="px-3 py-2">Seed</th><th className="px-3 py-2">Tên</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Đăng ký</th></tr></thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr key={p.id} className="border-t border-white/10 text-zinc-200">
                        <td className="px-3 py-2">{p.seed ?? '-'}</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-2">
                            <img
                              src={getAvatarUrl(p)}
                              alt={getName(p)}
                              className="h-6 w-6 rounded-full border border-white/20 bg-zinc-900 object-cover"
                            />
                            <span>{getName(p)}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2"><Badge variant="outline" className={PARTICIPANT_STATUS_META[p.status].className}>{PARTICIPANT_STATUS_META[p.status].label}</Badge></td>
                        <td className="px-3 py-2 text-zinc-400">{formatDateTime(p.registered_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="bracket" className="mt-3">
            <section className={`${cardCls} p-4`}>
              <div className="mb-3 flex items-center justify-between"><h3 className={sectionTitleCls}>Bracket trực quan</h3><Button type="button" size="sm" variant="outline" onClick={() => void reload()}><Loader2 className="mr-2 h-4 w-4" />Refresh</Button></div>
              {bracket.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-sm text-zinc-400">Chưa có dữ liệu bracket.</div>
              ) : tournament.format === 'round_robin' ? (
                <div className="grid grid-cols-[1fr_280px] gap-4">
                  <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-3 text-sm text-zinc-300">Round Robin matrix đang dùng dữ liệu trận để hiển thị trực tiếp theo tab lịch sử.</div>
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3"><p className="mb-2 text-xs uppercase tracking-[0.15em] text-cyan-200">Standings</p>{standings.map((p, i) => <div key={p.id} className="mb-1 rounded border border-white/10 bg-zinc-900/70 px-2 py-1 text-sm text-zinc-200">#{i + 1} {getName(p)}</div>)}</div>
                </div>
              ) : tournament.format === 'double_elimination' ? (
                <DoubleEliminationTree
                  matches={bracket}
                  myParticipant={myParticipant}
                  onOpenMatch={openMatch}
                />
              ) : tournament.format === 'swiss' ? (
                <SwissBracketBoard
                  rounds={rounds}
                  standings={standings}
                  tournamentStatus={tournament.status}
                  onOpenMatch={openMatch}
                />
              ) : (
                <SingleEliminationTree
                  matches={bracket}
                  myParticipant={myParticipant}
                  onOpenMatch={openMatch}
                />
              )}
            </section>
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            <section className={`${cardCls} p-4`}>
              <h3 className={sectionTitleCls}>Lịch sử trận</h3>
              <div className="mt-3 overflow-hidden rounded-lg border border-white/10"><table className="w-full border-collapse text-sm"><thead className="bg-zinc-900/80 text-left text-xs uppercase tracking-[0.14em] text-zinc-400"><tr><th className="px-3 py-2">Round</th><th className="px-3 py-2">Cặp đấu</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Thời gian</th></tr></thead><tbody>{history.map((m) => <tr key={m.id} className="border-t border-white/10 text-zinc-200"><td className="px-3 py-2">{m.round}</td><td className="px-3 py-2">{getName(m.participant1)} vs {getName(m.participant2)}</td><td className="px-3 py-2">{scoreText(m.score1)} - {scoreText(m.score2)}</td><td className="px-3 py-2 text-zinc-400">{formatDateTime(m.completed_at ?? m.created_at)}</td></tr>)}</tbody></table></div>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {inlineError && <div className="border-t border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{inlineError}</div>}

      <TournamentCreateEditDialog open={isEditOpen} onOpenChange={setIsEditOpen} serverId={serverId} tournament={tournament} onSuccess={() => { void reload(); refreshActiveServerTournaments?.() }} />

      <Dialog open={matchModalOpen} onOpenChange={setMatchModalOpen}>
        <DialogContent className="max-w-xl border-cyan-500/20 bg-[linear-gradient(140deg,#090c14,#111826)] text-zinc-100">
          <DialogHeader>
            <DialogTitle>Chi tiết trận</DialogTitle>
            <DialogDescription>{selectedMatch ? `Round ${selectedMatch.round} - Match ${selectedMatch.match_number}` : 'Không có dữ liệu'}</DialogDescription>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-400">{selectedMatch.status}</p>
                <div className="space-y-1.5">
                  {[selectedMatch.participant1, selectedMatch.participant2].map((p, i) => (
                    <div key={`${selectedMatch.id}-${i}`} className="flex items-center justify-between rounded-md border border-white/10 bg-zinc-950/70 px-3 py-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <img
                          src={getAvatarUrl(p)}
                          alt={getName(p)}
                          className="h-6 w-6 rounded-full border border-white/20 bg-zinc-900 object-cover"
                        />
                        <span className="truncate">{getName(p)}</span>
                      </span>
                      <span className="font-semibold">{i === 0 ? scoreText(selectedMatch.score1) : scoreText(selectedMatch.score2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {(canReport || canManage) && (
                <div className="space-y-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3">
                  <Label>Winner</Label>
                  <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-zinc-900/80 px-3 text-sm">
                    <option value="">Chọn winner</option>
                    {selectedMatch.participant1 && <option value={selectedMatch.participant1.id}>{getName(selectedMatch.participant1)}</option>}
                    {selectedMatch.participant2 && <option value={selectedMatch.participant2.id}>{getName(selectedMatch.participant2)}</option>}
                  </select>
                  <div className="grid grid-cols-2 gap-2"><Input type="number" value={score1} onChange={(e) => setScore1(e.target.value)} /><Input type="number" value={score2} onChange={(e) => setScore2(e.target.value)} /></div>
                  {canManage && <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Lý do override" />}
                  {matchSubmitError && <p className="text-sm text-rose-300">{matchSubmitError}</p>}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {(canReport || canManage) && <Button type="button" onClick={() => void submitMatch(false)}><Swords className="mr-2 h-4 w-4" />Báo cáo kết quả</Button>}
            {canManage && <Button type="button" variant="outline" onClick={() => void submitMatch(true)}><Crown className="mr-2 h-4 w-4" />Override</Button>}
            <Button type="button" variant="ghost" onClick={() => setMatchModalOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
