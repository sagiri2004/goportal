import React, { useMemo } from 'react'
import type { TournamentMatchDTO, TournamentMatchStatusDTO, TournamentParticipantDTO } from '@goportal/types'
import { getParticipantDisplayName } from '../utils'

type EliminationBracketSide = 'upper' | 'lower' | 'final'

type Props = {
  matches: TournamentMatchDTO[]
  myParticipant: TournamentParticipantDTO | null
  onOpenMatch: (match: TournamentMatchDTO) => void
}

type SingleProps = {
  matches: TournamentMatchDTO[]
  myParticipant: TournamentParticipantDTO | null
  onOpenMatch: (match: TournamentMatchDTO) => void
}

const SIDE_META: Record<EliminationBracketSide, { title: string; cardClass: string; lineClass: string }> = {
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
}

const MATCH_STATUS_META: Record<TournamentMatchStatusDTO, { label: string; className: string }> = {
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
}

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

const scoreText = (value?: number | null) => (typeof value === 'number' ? String(value) : '-')

type MatchNodeProps = {
  match: TournamentMatchDTO
  lineClass: string
  showLeftConnector: boolean
  showRightConnector: boolean
  myParticipant: TournamentParticipantDTO | null
  onOpenMatch: (match: TournamentMatchDTO) => void
  codeLabel: string
  flowLabel: (matchId?: string | null) => string
}

const MatchNode: React.FC<MatchNodeProps> = ({
  match,
  lineClass,
  showLeftConnector,
  showRightConnector,
  myParticipant,
  onOpenMatch,
  codeLabel,
  flowLabel,
}) => {
  const isMine = Boolean(
    myParticipant &&
      (match.participant1?.id === myParticipant.id || match.participant2?.id === myParticipant.id),
  )

  return (
    <div className="relative">
      {showLeftConnector && <span className={`absolute -left-4 top-1/2 h-px w-4 ${lineClass}`} />}
      {showRightConnector && <span className={`absolute -right-4 top-1/2 h-px w-4 ${lineClass}`} />}

      <button
        type="button"
        onClick={() => onOpenMatch(match)}
        className={`w-full rounded-xl border p-3 text-left transition ${
          isMine
            ? 'border-indigo-400/60 bg-indigo-500/10'
            : 'border-white/10 bg-zinc-950/75 hover:border-cyan-300/40'
        }`}
      >
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.13em] text-zinc-400">
          <span>{codeLabel}</span>
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.11em] ${
              MATCH_STATUS_META[match.status].className
            }`}
          >
            {MATCH_STATUS_META[match.status].label}
          </span>
        </div>

        <div className="space-y-1.5">
          {[match.participant1, match.participant2].map((participant, index) => {
            const isWinner = Boolean(match.winner?.id) && participant?.id === match.winner?.id
            return (
              <div
                key={`${match.id}-${index}`}
                className={`flex items-center justify-between rounded px-2 py-1 ${
                  isWinner
                    ? 'bg-emerald-500/20 text-emerald-100'
                    : 'bg-white/[0.03] text-zinc-200'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <img
                    src={getAvatarUrl(participant)}
                    alt={getName(participant)}
                    className="h-5 w-5 rounded-full border border-white/20 bg-zinc-900 object-cover"
                  />
                  <span className="truncate">{getName(participant)}</span>
                </span>
                <span className="font-semibold">
                  {index === 0 ? scoreText(match.score1) : scoreText(match.score2)}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.12em]">
          <span className="rounded border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-emerald-200">
            {'W -> '}
            {flowLabel(match.next_match_id)}
          </span>
          <span className="rounded border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-rose-200">
            {'L -> '}
            {flowLabel(match.loser_next_match_id)}
          </span>
        </div>
      </button>
    </div>
  )
}

export const DoubleEliminationTree: React.FC<Props> = ({ matches, myParticipant, onOpenMatch }) => {
  const grouped = useMemo(() => {
    const map = new Map<EliminationBracketSide, Map<number, TournamentMatchDTO[]>>()
    ;(['upper', 'lower', 'final'] as EliminationBracketSide[]).forEach((side) => {
      map.set(side, new Map())
    })

    matches.forEach((match) => {
      const side = (match.bracket_side as EliminationBracketSide) || 'upper'
      const normalizedSide: EliminationBracketSide =
        side === 'lower' || side === 'final' ? side : 'upper'
      const sideMap = map.get(normalizedSide) ?? new Map<number, TournamentMatchDTO[]>()
      const list = sideMap.get(match.round) ?? []
      list.push(match)
      sideMap.set(match.round, list.sort((left, right) => left.match_number - right.match_number))
      map.set(normalizedSide, sideMap)
    })

    return (['upper', 'lower', 'final'] as EliminationBracketSide[]).map((side) => {
      const sideMap = map.get(side) ?? new Map<number, TournamentMatchDTO[]>()
      return {
        side,
        rounds: [...sideMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([round, sideMatches]) => ({ round, matches: sideMatches })),
      }
    })
  }, [matches])

  const codeById = useMemo(() => {
    const codeMap = new Map<string, string>()
    matches.forEach((match) => {
      const side = (match.bracket_side as EliminationBracketSide) || 'upper'
      const prefix = side === 'lower' ? 'L' : side === 'final' ? 'GF' : 'W'
      codeMap.set(match.id, `${prefix}${match.round}.${match.match_number}`)
    })
    return codeMap
  }, [matches])

  const flowLabel = (matchId?: string | null) => {
    if (!matchId) return 'Eliminated'
    return codeById.get(matchId) ?? `#${matchId.slice(-4)}`
  }

  return (
    <div className="space-y-3">
      {grouped.map((section) => {
        const meta = SIDE_META[section.side]
        const roundCount = Math.max(1, section.rounds.length)
        return (
          <section key={section.side} className={`rounded-xl border p-3 ${meta.cardClass}`}>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-100">
              {meta.title}
            </h4>

            {section.rounds.length === 0 ? (
              <div className="rounded-md border border-dashed border-white/15 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
                Chua co du lieu cho nhanh nay.
              </div>
            ) : (
              <div className="gp-scrollbar gp-scrollbar-thin overflow-auto">
                <div className="flex min-w-max gap-6 pb-1">
                  {section.rounds.map((round, roundIndex) => (
                    <div
                      key={`${section.side}-${round.round}`}
                      className="relative flex min-w-[280px] flex-col gap-3"
                      style={{ marginTop: `${roundIndex * 10}px` }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-300">
                        Round {round.round}
                      </p>

                      {round.matches.map((match) => (
                        <MatchNode
                          key={match.id}
                          match={match}
                          lineClass={meta.lineClass}
                          showLeftConnector={roundIndex > 0}
                          showRightConnector={roundIndex < roundCount - 1}
                          myParticipant={myParticipant}
                          onOpenMatch={onOpenMatch}
                          codeLabel={codeById.get(match.id) ?? `Match ${match.match_number}`}
                          flowLabel={flowLabel}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export const SingleEliminationTree: React.FC<SingleProps> = ({ matches, myParticipant, onOpenMatch }) => {
  const rounds = useMemo(
    () =>
      [...matches]
        .sort((left, right) => {
          if (left.round !== right.round) return left.round - right.round
          return left.match_number - right.match_number
        })
        .reduce<Array<{ round: number; matches: TournamentMatchDTO[] }>>((acc, match) => {
          const current = acc.find((item) => item.round === match.round)
          if (current) {
            current.matches.push(match)
          } else {
            acc.push({ round: match.round, matches: [match] })
          }
          return acc
        }, []),
    [matches],
  )

  const codeById = useMemo(() => {
    const codeMap = new Map<string, string>()
    matches.forEach((match) => {
      codeMap.set(match.id, `W${match.round}.${match.match_number}`)
    })
    return codeMap
  }, [matches])

  const flowLabel = (matchId?: string | null) => {
    if (!matchId) return 'Eliminated'
    return codeById.get(matchId) ?? `#${matchId.slice(-4)}`
  }

  return (
    <section className={`rounded-xl border p-3 ${SIDE_META.upper.cardClass}`}>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-100">
        Knockout Bracket
      </h4>
      {rounds.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/15 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
          Chua co du lieu bracket.
        </div>
      ) : (
        <div className="gp-scrollbar gp-scrollbar-thin overflow-auto">
          <div className="flex min-w-max gap-6 pb-1">
            {rounds.map((round, roundIndex) => (
              <div
                key={`single-${round.round}`}
                className="relative flex min-w-[280px] flex-col gap-3"
                style={{ marginTop: `${roundIndex * 10}px` }}
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-300">
                  Round {round.round}
                </p>
                {round.matches.map((match) => (
                  <MatchNode
                    key={match.id}
                    match={match}
                    lineClass={SIDE_META.upper.lineClass}
                    showLeftConnector={roundIndex > 0}
                    showRightConnector={roundIndex < rounds.length - 1}
                    myParticipant={myParticipant}
                    onOpenMatch={onOpenMatch}
                    codeLabel={codeById.get(match.id) ?? `Match ${match.match_number}`}
                    flowLabel={flowLabel}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
