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

const MatchCard: React.FC<{
  match: TournamentMatchDTO
  isMine: boolean
  onOpen: () => void
}> = ({ match, isMine, onOpen }) => {
  const winnerId = match.winner?.id
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-[250px] rounded-xl border text-left ${
        isMine
          ? 'border-indigo-400/70 bg-indigo-500/10'
          : 'border-white/10 bg-white/[0.03] hover:border-cyan-400/40'
      }`}
    >
      <div className="border-b border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-zinc-400">
        Round {match.round} • Match {match.match_number}
      </div>
      <div className="space-y-1 px-3 py-2">
        {[match.participant1, match.participant2].map((participant, index) => {
          const isWinner = Boolean(participant?.id && winnerId && participant.id === winnerId)
          return (
            <div
              key={`${match.id}-${index}`}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
                isWinner ? 'bg-emerald-500/15 text-emerald-200' : 'text-zinc-200'
              }`}
            >
              <span className="truncate text-sm font-medium">{getName(participant)}</span>
              <span className="font-semibold">{index === 0 ? scoreText(match.score1) : scoreText(match.score2)}</span>
            </div>
          )
        })}
      </div>
    </button>
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
      setError(loadError?.message ?? 'Không th? t?i d? li?u gi?i d?u.')
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
        setInlineError('C?n ít nh?t 2 ngu?i checked-in tru?c khi b?t d?u gi?i.')
        return
      }
    }
    setIsActionLoading(true)
    setInlineError(null)
    try {
      await updateTournamentStatus(tournament.id, status)
      pushToast?.('Ðã c?p nh?t tr?ng thái gi?i d?u.')
      await reload()
      refreshActiveServerTournaments?.()
    } catch (statusError: any) {
      setInlineError(statusError?.message ?? 'Không th? c?p nh?t tr?ng thái.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const toggleRegister = async () => {
    if (!tournament || !currentUser) return
    if (currentUser.id === tournament.created_by) {
      setInlineError('Host không th? t? tham gia gi?i d?u.')
      return
    }
    setIsActionLoading(true)
    setInlineError(null)
    try {
      if (myParticipant) {
        await cancelTournamentRegistration(tournament.id)
        pushToast?.('Ðã hu? dang ký.')
      } else {
        await registerTournamentParticipant(tournament.id)
        pushToast?.('Ðang ký thành công.')
      }
      await reload()
    } catch (registerError: any) {
      setInlineError(registerError?.message ?? 'Không th? c?p nh?t dang ký.')
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
      setInlineError(checkinError?.message ?? 'Không th? check-in.')
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
      pushToast?.(override ? 'Ðã override k?t qu?.' : 'Ðã báo cáo k?t qu?.')
      setMatchModalOpen(false)
      await reload()
    } catch (submitError: any) {
      setMatchSubmitError(submitError?.message ?? 'Không th? g?i k?t qu?.')
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
          {error ?? 'Không tìm th?y gi?i d?u.'}
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
              {myParticipant ? 'Hu? dang ký' : 'Ðang ký tham gia'}
            </Button>
          )}
          {!canManage && tournament.status === 'check_in' && myParticipant && (
            <Button type="button" size="sm" onClick={() => void checkIn()} disabled={isActionLoading}><Check className="mr-2 h-4 w-4" />Check-in</Button>
          )}
          {canManage && tournament.status === 'draft' && (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setIsEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Ch?nh s?a</Button>
              <Button type="button" size="sm" onClick={() => void runStatus('registration')} disabled={isActionLoading}>M? dang ký</Button>
            </>
          )}
          {canManage && tournament.status === 'registration' && (
            <Button type="button" size="sm" onClick={() => void runStatus('check_in')} disabled={isActionLoading}>Chuy?n sang Check-in</Button>
          )}
          {canManage && tournament.status === 'check_in' && (
            <Button type="button" size="sm" onClick={() => void runStatus('in_progress')} disabled={isActionLoading}><Play className="mr-2 h-4 w-4" />B?t d?u gi?i</Button>
          )}
          {canManage && tournament.status === 'in_progress' && (
            <Button type="button" size="sm" variant="outline" onClick={() => void runStatus('completed')} disabled={isActionLoading}><Trophy className="mr-2 h-4 w-4" />K?t thúc gi?i</Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
          <TabsList className="grid w-full max-w-[640px] grid-cols-4 border border-white/10 bg-zinc-900/70">
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="participants">Ngu?i tham gia</TabsTrigger>
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
            <TabsTrigger value="history">L?ch s? tr?n</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-3">
            <div className="grid grid-cols-2 gap-4">
              <section className={`${cardCls} p-4`}><h3 className={sectionTitleCls}>Mô t?</h3><p className="mt-2 text-sm text-zinc-200/90">{tournament.description?.trim() || 'Chua c?p nh?t mô t?.'}</p></section>
              <section className={`${cardCls} p-4`}><h3 className={sectionTitleCls}>Lu?t choi</h3><p className="mt-2 text-sm text-zinc-200/90">{tournament.rules?.trim() || 'Chua c?p nh?t lu?t choi.'}</p></section>
              <section className={`${cardCls} p-4`}><h3 className={sectionTitleCls}>Gi?i thu?ng</h3><p className="mt-2 text-sm text-zinc-200/90">{tournament.prize_pool?.trim() || 'Chua c?p nh?t gi?i thu?ng.'}</p></section>
              <section className={`${cardCls} p-4`}>
                <h3 className={sectionTitleCls}>Thông s?</h3>
                <div className="mt-2 space-y-1.5 text-sm text-zinc-200">
                  <p className="flex justify-between"><span className="text-zinc-400">Format</span><span>{formatMeta.label}</span></p>
                  <p className="flex justify-between"><span className="text-zinc-400">Ðang ký</span><span>{participants.length}/{tournament.max_participants}</span></p>
                  <p className="flex justify-between"><span className="text-zinc-400">H?n dang ký</span><span>{formatDateTime(tournament.registration_deadline)}</span></p>
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="participants" className="mt-3">
            <section className={`${cardCls} p-4`}>
              <h3 className={sectionTitleCls}>Participants</h3>
              <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-zinc-900/80 text-left text-xs uppercase tracking-[0.14em] text-zinc-400"><tr><th className="px-3 py-2">Seed</th><th className="px-3 py-2">Tên</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Ðang ký</th></tr></thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr key={p.id} className="border-t border-white/10 text-zinc-200">
                        <td className="px-3 py-2">{p.seed ?? '-'}</td>
                        <td className="px-3 py-2">{getName(p)}</td>
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
              <div className="mb-3 flex items-center justify-between"><h3 className={sectionTitleCls}>Bracket tr?c quan</h3><Button type="button" size="sm" variant="outline" onClick={() => void reload()}><Loader2 className="mr-2 h-4 w-4" />Refresh</Button></div>
              {bracket.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-sm text-zinc-400">Chua có d? li?u bracket.</div>
              ) : tournament.format === 'round_robin' ? (
                <div className="grid grid-cols-[1fr_280px] gap-4">
                  <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-3 text-sm text-zinc-300">Round Robin matrix dang dùng d? li?u tr?n d? hi?n th? tr?c ti?p theo tab l?ch s?.</div>
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3"><p className="mb-2 text-xs uppercase tracking-[0.15em] text-cyan-200">Standings</p>{standings.map((p, i) => <div key={p.id} className="mb-1 rounded border border-white/10 bg-zinc-900/70 px-2 py-1 text-sm text-zinc-200">#{i + 1} {getName(p)}</div>)}</div>
                </div>
              ) : tournament.format === 'swiss' ? (
                <div className="grid grid-cols-[1fr_280px] gap-4">
                  <div className="space-y-3">{rounds.map((r) => <div key={r.round} className="rounded-lg border border-white/10 bg-zinc-900/70 p-3"><p className="mb-2 text-xs uppercase tracking-[0.15em] text-cyan-200">Round {r.round}</p><div className="grid grid-cols-2 gap-2">{r.matches.map((m) => <button key={m.id} type="button" onClick={() => openMatch(m)} className="rounded border border-white/10 bg-zinc-950/70 px-2 py-1.5 text-left text-sm text-zinc-200 hover:border-cyan-400/40">{getName(m.participant1)} vs {getName(m.participant2)} <span className="text-zinc-400">{scoreText(m.score1)}-{scoreText(m.score2)}</span></button>)}</div></div>)}</div>
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3"><p className="mb-2 text-xs uppercase tracking-[0.15em] text-cyan-200">Leaderboard</p>{standings.map((p, i) => <div key={p.id} className="mb-1 rounded border border-white/10 bg-zinc-900/70 px-2 py-1 text-sm text-zinc-200">#{i + 1} {getName(p)}</div>)}</div>
                </div>
              ) : (
                <div className="overflow-auto"><div className="flex min-w-max gap-5">{rounds.map((r) => <div key={r.round} className="flex min-w-[270px] flex-col gap-3"><h4 className="text-[11px] uppercase tracking-[0.15em] text-cyan-200">Round {r.round}</h4>{r.matches.map((m) => <MatchCard key={m.id} match={m} isMine={Boolean(myParticipant && (m.participant1?.id === myParticipant.id || m.participant2?.id === myParticipant.id))} onOpen={() => openMatch(m)} />)}</div>)}</div></div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            <section className={`${cardCls} p-4`}>
              <h3 className={sectionTitleCls}>L?ch s? tr?n</h3>
              <div className="mt-3 overflow-hidden rounded-lg border border-white/10"><table className="w-full border-collapse text-sm"><thead className="bg-zinc-900/80 text-left text-xs uppercase tracking-[0.14em] text-zinc-400"><tr><th className="px-3 py-2">Round</th><th className="px-3 py-2">C?p d?u</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Th?i gian</th></tr></thead><tbody>{history.map((m) => <tr key={m.id} className="border-t border-white/10 text-zinc-200"><td className="px-3 py-2">{m.round}</td><td className="px-3 py-2">{getName(m.participant1)} vs {getName(m.participant2)}</td><td className="px-3 py-2">{scoreText(m.score1)} - {scoreText(m.score2)}</td><td className="px-3 py-2 text-zinc-400">{formatDateTime(m.completed_at ?? m.created_at)}</td></tr>)}</tbody></table></div>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {inlineError && <div className="border-t border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{inlineError}</div>}

      <TournamentCreateEditDialog open={isEditOpen} onOpenChange={setIsEditOpen} serverId={serverId} tournament={tournament} onSuccess={() => { void reload(); refreshActiveServerTournaments?.() }} />

      <Dialog open={matchModalOpen} onOpenChange={setMatchModalOpen}>
        <DialogContent className="max-w-xl border-cyan-500/20 bg-[linear-gradient(140deg,#090c14,#111826)] text-zinc-100">
          <DialogHeader>
            <DialogTitle>Chi ti?t tr?n</DialogTitle>
            <DialogDescription>{selectedMatch ? `Round ${selectedMatch.round} • Match ${selectedMatch.match_number}` : 'Không có d? li?u'}</DialogDescription>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-400">{selectedMatch.status}</p>
                <div className="space-y-1.5">
                  {[selectedMatch.participant1, selectedMatch.participant2].map((p, i) => (
                    <div key={`${selectedMatch.id}-${i}`} className="flex items-center justify-between rounded-md border border-white/10 bg-zinc-950/70 px-3 py-2">
                      <span>{getName(p)}</span>
                      <span className="font-semibold">{i === 0 ? scoreText(selectedMatch.score1) : scoreText(selectedMatch.score2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {(canReport || canManage) && (
                <div className="space-y-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3">
                  <Label>Winner</Label>
                  <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-zinc-900/80 px-3 text-sm">
                    <option value="">Ch?n winner</option>
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
            {(canReport || canManage) && <Button type="button" onClick={() => void submitMatch(false)}><Swords className="mr-2 h-4 w-4" />Báo cáo k?t qu?</Button>}
            {canManage && <Button type="button" variant="outline" onClick={() => void submitMatch(true)}><Crown className="mr-2 h-4 w-4" />Override</Button>}
            <Button type="button" variant="ghost" onClick={() => setMatchModalOpen(false)}>Ðóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
