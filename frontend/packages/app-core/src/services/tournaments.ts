import type {
  CreateTournamentRequest,
  TournamentDetailDTO,
  TournamentListDTO,
  TournamentMatchDTO,
  TournamentMatchReportDTO,
  TournamentStatusDTO,
  TournamentTeamDTO,
  TournamentParticipantDTO,
  TournamentDTO,
  UpdateTournamentRequest,
} from '@goportal/types'
import { useAuthStore } from '@goportal/store'

type ListTournamentsParams = {
  status?: TournamentStatusDTO
  page?: number
  limit?: number
}

type DemoTournamentRecord = {
  tournament: TournamentDTO
  participants: TournamentParticipantDTO[]
  matches: TournamentMatchDTO[]
  teams: TournamentTeamDTO[]
  reports: TournamentMatchReportDTO[]
}

const DEMO_HOST_ID = 'host-demo'

let idCounter = 1000
const byServer = new Map<string, string[]>()
const byTournament = new Map<string, DemoTournamentRecord>()

const nowSec = () => Math.floor(Date.now() / 1000)
const delay = async () => Promise.resolve()

const nextId = (prefix: string) => {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

const sortByCreatedDesc = (items: TournamentDTO[]) =>
  [...items].sort((left, right) => right.created_at - left.created_at)

const getCurrentUser = () => useAuthStore.getState().user

const ensureServerBucket = (serverId: string) => {
  if (!byServer.has(serverId)) {
    byServer.set(serverId, [])
  }
}

const addRecord = (serverId: string, record: DemoTournamentRecord) => {
  ensureServerBucket(serverId)
  byTournament.set(record.tournament.id, record)
  const ids = byServer.get(serverId) ?? []
  ids.push(record.tournament.id)
  byServer.set(serverId, ids)
}

const seedParticipant = (
  id: string,
  username: string,
  status: TournamentParticipantDTO['status'],
  seed: number,
  registeredAt: number,
): TournamentParticipantDTO => ({
  id,
  user: {
    id: `user-${id}`,
    username,
    is_admin: false,
    avatar_url: null,
  },
  team: null,
  seed,
  status,
  final_rank: null,
  registered_at: registeredAt,
  checked_in_at: status === 'checked_in' || status === 'winner' ? registeredAt + 300 : null,
})

const seedTeamParticipant = (
  id: string,
  teamId: string,
  teamName: string,
  captainId: string,
  seed: number,
  status: TournamentParticipantDTO['status'],
  registeredAt: number,
): TournamentParticipantDTO => ({
  id,
  user: null,
  team: {
    id: teamId,
    name: teamName,
    captain_id: captainId,
  },
  seed,
  status,
  final_rank: null,
  registered_at: registeredAt,
  checked_in_at: status === 'checked_in' || status === 'winner' ? registeredAt + 300 : null,
})

const makeMatch = (
  tournamentId: string,
  round: number,
  matchNumber: number,
  participant1: TournamentParticipantDTO | null,
  participant2: TournamentParticipantDTO | null,
  status: TournamentMatchDTO['status'],
  score1?: number | null,
  score2?: number | null,
  winner?: TournamentParticipantDTO | null,
  bracketSide: TournamentMatchDTO['bracket_side'] = 'upper',
): TournamentMatchDTO => ({
  id: nextId('match'),
  tournament_id: tournamentId,
  round,
  match_number: matchNumber,
  bracket_side: bracketSide,
  participant1,
  participant2,
  score1: score1 ?? null,
  score2: score2 ?? null,
  winner: winner ?? null,
  status,
  next_match_id: null,
  loser_next_match_id: null,
  scheduled_at: nowSec() - 3600 + round * 900 + matchNumber * 120,
  completed_at: status === 'completed' ? nowSec() - 1200 + round * 100 : null,
  created_at: nowSec() - 7200 + round * 90 + matchNumber * 20,
})

const cloneTournament = (tournament: TournamentDTO): TournamentDTO => ({ ...tournament })
const cloneParticipant = (participant: TournamentParticipantDTO): TournamentParticipantDTO => ({
  ...participant,
  user: participant.user ? { ...participant.user } : null,
  team: participant.team ? { ...participant.team } : null,
})
const cloneMatch = (match: TournamentMatchDTO): TournamentMatchDTO => ({
  ...match,
  participant1: match.participant1 ? cloneParticipant(match.participant1) : null,
  participant2: match.participant2 ? cloneParticipant(match.participant2) : null,
  winner: match.winner ? cloneParticipant(match.winner) : null,
})
const cloneReport = (report: TournamentMatchReportDTO): TournamentMatchReportDTO => ({ ...report })
const cloneTeam = (team: TournamentTeamDTO): TournamentTeamDTO => ({
  ...team,
  members: team.members.map((member) => ({ ...member })),
})

const linkMatchFlow = (
  match: TournamentMatchDTO,
  flow: {
    winnerTo?: TournamentMatchDTO | null
    loserTo?: TournamentMatchDTO | null
  },
) => {
  match.next_match_id = flow.winnerTo?.id ?? null
  match.loser_next_match_id = flow.loserTo?.id ?? null
}

const makeTournament = (
  serverId: string,
  input: {
    id: string
    name: string
    game: string
    format: TournamentDTO['format']
    status: TournamentDTO['status']
    participantType: TournamentDTO['participant_type']
    maxParticipants: number
    createdOffset: number
    description: string
    rules: string
    prizePool: string
    teamSize?: number
  },
): TournamentDTO => {
  const createdAt = nowSec() - input.createdOffset
  return {
    id: input.id,
    server_id: serverId,
    name: input.name,
    description: input.description,
    game: input.game,
    format: input.format,
    status: input.status,
    max_participants: input.maxParticipants,
    participant_type: input.participantType,
    team_size: input.teamSize ?? null,
    registration_deadline: createdAt + 86400,
    check_in_duration_minutes: 15,
    prize_pool: input.prizePool,
    rules: input.rules,
    created_by: DEMO_HOST_ID,
    started_at: input.status === 'in_progress' || input.status === 'completed' ? createdAt + 90000 : null,
    completed_at: input.status === 'completed' ? createdAt + 180000 : null,
    created_at: createdAt,
    updated_at: nowSec(),
  }
}

const computeStandings = (participants: TournamentParticipantDTO[], matches: TournamentMatchDTO[]) => {
  const winsById = new Map<string, number>()
  const lossesById = new Map<string, number>()

  matches.forEach((match) => {
    if (match.status !== 'completed' || !match.winner?.id) {
      return
    }
    winsById.set(match.winner.id, (winsById.get(match.winner.id) ?? 0) + 1)
    const loserId =
      match.participant1?.id === match.winner.id ? match.participant2?.id : match.participant1?.id
    if (loserId) {
      lossesById.set(loserId, (lossesById.get(loserId) ?? 0) + 1)
    }
  })

  return [...participants]
    .map((participant) => {
      const wins = winsById.get(participant.id) ?? 0
      const losses = lossesById.get(participant.id) ?? 0
      return { participant, wins, losses }
    })
    .sort((left, right) => {
      if (left.wins !== right.wins) return right.wins - left.wins
      if (left.losses !== right.losses) return left.losses - right.losses
      return (left.participant.seed ?? 999) - (right.participant.seed ?? 999)
    })
    .map((item, index) => ({
      ...item.participant,
      final_rank: index + 1,
    }))
}

const getSwissEliminationLossLimit = (rules?: string | null) => {
  const raw = rules ?? ''
  const matched = raw.match(/(?:eliminate_after_losses|swiss_elimination_losses|losses_to_eliminate)\s*[:=]\s*(\d+)/i)
  if (!matched) {
    return 2
  }
  const parsed = Number(matched[1])
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 2
  }
  return Math.floor(parsed)
}

const buildSwissStats = (
  participants: TournamentParticipantDTO[],
  matches: TournamentMatchDTO[],
) => {
  const stats = new Map<string, { wins: number; losses: number }>()

  participants.forEach((participant) => {
    stats.set(participant.id, { wins: 0, losses: 0 })
  })

  matches.forEach((match) => {
    if (match.status !== 'completed' || !match.winner?.id) {
      return
    }
    const winnerId = match.winner.id
    const p1Id = match.participant1?.id
    const p2Id = match.participant2?.id
    const loserId = p1Id === winnerId ? p2Id : p1Id

    if (winnerId) {
      const current = stats.get(winnerId) ?? { wins: 0, losses: 0 }
      stats.set(winnerId, { wins: current.wins + 1, losses: current.losses })
    }
    if (loserId) {
      const current = stats.get(loserId) ?? { wins: 0, losses: 0 }
      stats.set(loserId, { wins: current.wins, losses: current.losses + 1 })
    }
  })

  return stats
}

const finalizeSwissTournament = (
  record: DemoTournamentRecord,
  stats: Map<string, { wins: number; losses: number }>,
) => {
  const ordered = [...record.participants].sort((left, right) => {
    const leftStats = stats.get(left.id) ?? { wins: 0, losses: 0 }
    const rightStats = stats.get(right.id) ?? { wins: 0, losses: 0 }
    if (leftStats.wins !== rightStats.wins) return rightStats.wins - leftStats.wins
    if (leftStats.losses !== rightStats.losses) return leftStats.losses - rightStats.losses
    return (left.seed ?? 999) - (right.seed ?? 999)
  })

  ordered.forEach((participant, index) => {
    participant.final_rank = index + 1
    if (index === 0) {
      participant.status = 'winner'
    } else if (participant.status !== 'disqualified') {
      participant.status = 'eliminated'
    }
  })

  record.tournament.status = 'completed'
  record.tournament.completed_at = nowSec()
  record.tournament.updated_at = nowSec()
}

const advanceSwissTournament = (record: DemoTournamentRecord) => {
  if (record.tournament.format !== 'swiss' || record.tournament.status !== 'in_progress') {
    return
  }

  const currentRound = Math.max(0, ...record.matches.map((match) => match.round))
  if (currentRound > 0) {
    const hasPendingInCurrentRound = record.matches.some(
      (match) => match.round === currentRound && match.status !== 'completed' && match.status !== 'bye',
    )
    if (hasPendingInCurrentRound) {
      return
    }
  }

  const eliminationLossLimit = getSwissEliminationLossLimit(record.tournament.rules)
  const stats = buildSwissStats(record.participants, record.matches)

  record.participants.forEach((participant) => {
    if (participant.status === 'disqualified' || participant.status === 'winner') {
      return
    }
    const participantStats = stats.get(participant.id) ?? { wins: 0, losses: 0 }
    if (participantStats.losses >= eliminationLossLimit) {
      participant.status = 'eliminated'
    }
  })

  const hasCheckedInParticipants = record.participants.some(
    (participant) => participant.status === 'checked_in' || participant.status === 'winner',
  )

  const activeParticipants = record.participants
    .filter((participant) => {
      if (participant.status === 'eliminated' || participant.status === 'disqualified') {
        return false
      }
      if (!hasCheckedInParticipants) {
        return participant.status === 'registered' || participant.status === 'checked_in' || participant.status === 'winner'
      }
      return participant.status === 'checked_in' || participant.status === 'winner'
    })
    .sort((left, right) => {
      const leftStats = stats.get(left.id) ?? { wins: 0, losses: 0 }
      const rightStats = stats.get(right.id) ?? { wins: 0, losses: 0 }
      if (leftStats.wins !== rightStats.wins) return rightStats.wins - leftStats.wins
      if (leftStats.losses !== rightStats.losses) return leftStats.losses - rightStats.losses
      return (left.seed ?? 999) - (right.seed ?? 999)
    })

  if (activeParticipants.length <= 1) {
    finalizeSwissTournament(record, stats)
    return
  }

  const nextRound = currentRound + 1

  const grouped = new Map<string, TournamentParticipantDTO[]>()
  activeParticipants.forEach((participant) => {
    const participantStats = stats.get(participant.id) ?? { wins: 0, losses: 0 }
    const key = `${participantStats.wins}-${participantStats.losses}`
    const current = grouped.get(key) ?? []
    current.push(participant)
    grouped.set(key, current)
  })

  const groups = [...grouped.entries()]
    .map(([key, participants]) => {
      const [wins, losses] = key.split('-').map((value) => Number(value) || 0)
      return {
        wins,
        losses,
        participants: participants.sort((left, right) => (left.seed ?? 999) - (right.seed ?? 999)),
      }
    })
    .sort((left, right) => {
      if (left.wins !== right.wins) return right.wins - left.wins
      return left.losses - right.losses
    })

  const nextPairs: Array<[TournamentParticipantDTO, TournamentParticipantDTO]> = []

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index]
    while (group.participants.length >= 2) {
      const participant1 = group.participants.shift()
      const participant2 = group.participants.shift()
      if (participant1 && participant2) {
        nextPairs.push([participant1, participant2])
      }
    }

    if (group.participants.length === 1) {
      const leftover = group.participants.shift()
      if (!leftover) {
        continue
      }
      const nextLowerGroup = groups[index + 1]
      if (nextLowerGroup) {
        nextLowerGroup.participants.unshift(leftover)
      } else {
        leftover.status = 'eliminated'
      }
    }
  }

  if (nextPairs.length === 0) {
    const refreshedStats = buildSwissStats(record.participants, record.matches)
    finalizeSwissTournament(record, refreshedStats)
    return
  }

  nextPairs.forEach(([participant1, participant2], matchIndex) => {
    record.matches.push(
      makeMatch(
        record.tournament.id,
        nextRound,
        matchIndex + 1,
        participant1,
        participant2,
        'ready',
        null,
        null,
        null,
      ),
    )
  })

  record.tournament.updated_at = nowSec()
}

const ensureDemoData = (serverId: string) => {
  ensureServerBucket(serverId)
  if ((byServer.get(serverId) ?? []).length > 0) {
    return
  }

  const draft = makeTournament(serverId, {
    id: nextId('tour'),
    name: 'Valorant Campus Draft Cup',
    game: 'Valorant',
    format: 'single_elimination',
    status: 'draft',
    participantType: 'solo',
    maxParticipants: 16,
    createdOffset: 3600 * 48,
    description: 'Giai draft de test luong tao/chinh sua.',
    rules: 'Bo3 o ban ket, bo5 o chung ket.',
    prizePool: '10.000.000 VND',
  })
  addRecord(serverId, { tournament: draft, participants: [], matches: [], teams: [], reports: [] })

  const registration = makeTournament(serverId, {
    id: nextId('tour'),
    name: 'CS2 Weekend Open',
    game: 'Counter-Strike 2',
    format: 'single_elimination',
    status: 'registration',
    participantType: 'solo',
    maxParticipants: 8,
    createdOffset: 3600 * 36,
    description: 'Giai dau mo dang ky voi bracket single elimination.',
    rules: 'MR12, map veto BO1.',
    prizePool: '5.000.000 VND + skin',
  })
  const registrationParticipants = [
    seedParticipant(nextId('p'), 'Rin', 'registered', 1, nowSec() - 10000),
    seedParticipant(nextId('p'), 'Kaze', 'registered', 2, nowSec() - 9500),
    seedParticipant(nextId('p'), 'Neko', 'registered', 3, nowSec() - 9000),
    seedParticipant(nextId('p'), 'Milo', 'registered', 4, nowSec() - 8600),
  ]
  addRecord(serverId, {
    tournament: registration,
    participants: registrationParticipants,
    matches: [],
    teams: [],
    reports: [],
  })

  const checkIn = makeTournament(serverId, {
    id: nextId('tour'),
    name: 'LoL Clash Qualifier',
    game: 'League of Legends',
    format: 'double_elimination',
    status: 'check_in',
    participantType: 'team',
    maxParticipants: 8,
    teamSize: 5,
    createdOffset: 3600 * 24,
    description: 'Double elimination danh cho team 5 nguoi.',
    rules: 'BO1 nhanh, cam pick theo Fearless draft.',
    prizePool: '15.000.000 VND',
  })
  const checkInTeams: TournamentTeamDTO[] = [
    {
      id: nextId('team'),
      name: 'Blue Phoenix',
      captain_id: 'u-bp-cpt',
      created_at: nowSec() - 20000,
      members: [
        { id: 'u-bp-1', username: 'BP Top', is_admin: false, avatar_url: null },
        { id: 'u-bp-2', username: 'BP Jungle', is_admin: false, avatar_url: null },
        { id: 'u-bp-3', username: 'BP Mid', is_admin: false, avatar_url: null },
        { id: 'u-bp-4', username: 'BP ADC', is_admin: false, avatar_url: null },
        { id: 'u-bp-5', username: 'BP Sup', is_admin: false, avatar_url: null },
      ],
    },
    {
      id: nextId('team'),
      name: 'Night Owls',
      captain_id: 'u-no-cpt',
      created_at: nowSec() - 19600,
      members: [
        { id: 'u-no-1', username: 'NO Top', is_admin: false, avatar_url: null },
        { id: 'u-no-2', username: 'NO Jungle', is_admin: false, avatar_url: null },
        { id: 'u-no-3', username: 'NO Mid', is_admin: false, avatar_url: null },
        { id: 'u-no-4', username: 'NO ADC', is_admin: false, avatar_url: null },
        { id: 'u-no-5', username: 'NO Sup', is_admin: false, avatar_url: null },
      ],
    },
  ]
  const checkInParticipants = [
    seedTeamParticipant(nextId('p'), checkInTeams[0].id, checkInTeams[0].name, checkInTeams[0].captain_id, 1, 'checked_in', nowSec() - 11000),
    seedTeamParticipant(nextId('p'), checkInTeams[1].id, checkInTeams[1].name, checkInTeams[1].captain_id, 2, 'registered', nowSec() - 10800),
  ]
  addRecord(serverId, {
    tournament: checkIn,
    participants: checkInParticipants,
    matches: [],
    teams: checkInTeams,
    reports: [],
  })

  const doubleElimLive = makeTournament(serverId, {
    id: nextId('tour'),
    name: 'Dota 2 Masters Double Elim',
    game: 'Dota 2',
    format: 'double_elimination',
    status: 'in_progress',
    participantType: 'solo',
    maxParticipants: 8,
    createdOffset: 3600 * 20,
    description: 'Mock data cho giao dien bracket double elimination.',
    rules: 'BO1 vong dau, BO3 grand final.',
    prizePool: '20.000.000 VND',
  })
  const deParticipants = [
    seedParticipant(nextId('p'), 'Blaze', 'checked_in', 1, nowSec() - 18000),
    seedParticipant(nextId('p'), 'Orion', 'checked_in', 2, nowSec() - 17800),
    seedParticipant(nextId('p'), 'Nyx', 'checked_in', 3, nowSec() - 17600),
    seedParticipant(nextId('p'), 'Rook', 'checked_in', 4, nowSec() - 17400),
    seedParticipant(nextId('p'), 'Astra', 'checked_in', 5, nowSec() - 17200),
    seedParticipant(nextId('p'), 'Kiro', 'checked_in', 6, nowSec() - 17000),
    seedParticipant(nextId('p'), 'Mochi', 'checked_in', 7, nowSec() - 16800),
    seedParticipant(nextId('p'), 'Zeph', 'checked_in', 8, nowSec() - 16600),
  ]
  const mW1 = makeMatch(doubleElimLive.id, 1, 1, deParticipants[0], deParticipants[1], 'completed', 2, 1, deParticipants[0], 'upper')
  const mW2 = makeMatch(doubleElimLive.id, 1, 2, deParticipants[2], deParticipants[3], 'completed', 0, 2, deParticipants[3], 'upper')
  const mW3 = makeMatch(doubleElimLive.id, 1, 3, deParticipants[4], deParticipants[5], 'completed', 2, 0, deParticipants[4], 'upper')
  const mW4 = makeMatch(doubleElimLive.id, 1, 4, deParticipants[6], deParticipants[7], 'completed', 1, 2, deParticipants[7], 'upper')
  const mW5 = makeMatch(doubleElimLive.id, 2, 1, deParticipants[0], deParticipants[3], 'in_progress', 1, 1, null, 'upper')
  const mW6 = makeMatch(doubleElimLive.id, 2, 2, deParticipants[4], deParticipants[7], 'ready', null, null, null, 'upper')
  const mW7 = makeMatch(doubleElimLive.id, 3, 1, null, null, 'pending', null, null, null, 'upper')

  const mL1 = makeMatch(doubleElimLive.id, 1, 1, deParticipants[1], deParticipants[2], 'completed', 2, 0, deParticipants[1], 'lower')
  const mL2 = makeMatch(doubleElimLive.id, 1, 2, deParticipants[5], deParticipants[6], 'completed', 1, 2, deParticipants[6], 'lower')
  const mL3 = makeMatch(doubleElimLive.id, 2, 1, deParticipants[1], null, 'pending', null, null, null, 'lower')
  const mL4 = makeMatch(doubleElimLive.id, 2, 2, deParticipants[6], null, 'pending', null, null, null, 'lower')
  const mL5 = makeMatch(doubleElimLive.id, 3, 1, null, null, 'pending', null, null, null, 'lower')
  const mL6 = makeMatch(doubleElimLive.id, 4, 1, null, null, 'pending', null, null, null, 'lower')

  const mF1 = makeMatch(doubleElimLive.id, 5, 1, null, null, 'pending', null, null, null, 'final')

  linkMatchFlow(mW1, { winnerTo: mW5, loserTo: mL1 })
  linkMatchFlow(mW2, { winnerTo: mW5, loserTo: mL1 })
  linkMatchFlow(mW3, { winnerTo: mW6, loserTo: mL2 })
  linkMatchFlow(mW4, { winnerTo: mW6, loserTo: mL2 })
  linkMatchFlow(mW5, { winnerTo: mW7, loserTo: mL3 })
  linkMatchFlow(mW6, { winnerTo: mW7, loserTo: mL4 })
  linkMatchFlow(mW7, { winnerTo: mF1, loserTo: mL6 })

  linkMatchFlow(mL1, { winnerTo: mL3 })
  linkMatchFlow(mL2, { winnerTo: mL4 })
  linkMatchFlow(mL3, { winnerTo: mL5 })
  linkMatchFlow(mL4, { winnerTo: mL5 })
  linkMatchFlow(mL5, { winnerTo: mL6 })
  linkMatchFlow(mL6, { winnerTo: mF1 })

  const deMatches = [mW1, mW2, mW3, mW4, mW5, mW6, mW7, mL1, mL2, mL3, mL4, mL5, mL6, mF1]
  addRecord(serverId, {
    tournament: doubleElimLive,
    participants: deParticipants,
    matches: deMatches,
    teams: [],
    reports: [],
  })

  const roundRobin = makeTournament(serverId, {
    id: nextId('tour'),
    name: 'FC Online League Stage',
    game: 'EA Sports FC Online',
    format: 'round_robin',
    status: 'in_progress',
    participantType: 'solo',
    maxParticipants: 6,
    createdOffset: 3600 * 16,
    description: 'Vong bang round robin tinh diem.',
    rules: 'Thang 3 diem, hoa 1 diem.',
    prizePool: '8.000.000 VND',
  })
  const rrParticipants = [
    seedParticipant(nextId('p'), 'Mori', 'checked_in', 1, nowSec() - 15000),
    seedParticipant(nextId('p'), 'Liam', 'checked_in', 2, nowSec() - 14500),
    seedParticipant(nextId('p'), 'Taro', 'checked_in', 3, nowSec() - 14200),
    seedParticipant(nextId('p'), 'Haru', 'checked_in', 4, nowSec() - 13800),
  ]
  const rrMatches = [
    makeMatch(roundRobin.id, 1, 1, rrParticipants[0], rrParticipants[1], 'completed', 2, 1, rrParticipants[0]),
    makeMatch(roundRobin.id, 1, 2, rrParticipants[2], rrParticipants[3], 'completed', 0, 2, rrParticipants[3]),
    makeMatch(roundRobin.id, 2, 1, rrParticipants[0], rrParticipants[2], 'in_progress', 1, 1, null),
    makeMatch(roundRobin.id, 2, 2, rrParticipants[1], rrParticipants[3], 'ready', null, null, null),
  ]
  addRecord(serverId, {
    tournament: roundRobin,
    participants: rrParticipants,
    matches: rrMatches,
    teams: [],
    reports: [],
  })

  const swiss = makeTournament(serverId, {
    id: nextId('tour'),
    name: 'TFT Swiss Finals',
    game: 'Teamfight Tactics',
    format: 'swiss',
    status: 'completed',
    participantType: 'solo',
    maxParticipants: 8,
    createdOffset: 3600 * 8,
    description: 'Swiss system 3 round, tong ket bang diem.',
    rules: 'Bo3 moi round, top 4 vao playoff. eliminate_after_losses=2',
    prizePool: '12.000.000 VND',
  })
  const swissParticipants = [
    seedParticipant(nextId('p'), 'Vex', 'winner', 1, nowSec() - 22000),
    seedParticipant(nextId('p'), 'Nia', 'eliminated', 2, nowSec() - 21800),
    seedParticipant(nextId('p'), 'Juno', 'eliminated', 3, nowSec() - 21600),
    seedParticipant(nextId('p'), 'Ari', 'eliminated', 4, nowSec() - 21400),
  ]
  const swissMatches = [
    makeMatch(swiss.id, 1, 1, swissParticipants[0], swissParticipants[1], 'completed', 2, 0, swissParticipants[0]),
    makeMatch(swiss.id, 1, 2, swissParticipants[2], swissParticipants[3], 'completed', 1, 2, swissParticipants[3]),
    makeMatch(swiss.id, 2, 1, swissParticipants[0], swissParticipants[3], 'completed', 2, 1, swissParticipants[0]),
    makeMatch(swiss.id, 2, 2, swissParticipants[1], swissParticipants[2], 'completed', 2, 0, swissParticipants[1]),
    makeMatch(swiss.id, 3, 1, swissParticipants[0], swissParticipants[2], 'completed', 2, 1, swissParticipants[0]),
    makeMatch(swiss.id, 3, 2, swissParticipants[1], swissParticipants[3], 'completed', 0, 2, swissParticipants[3]),
  ]
  swissParticipants[0].final_rank = 1
  swissParticipants[3].final_rank = 2
  swissParticipants[1].final_rank = 3
  swissParticipants[2].final_rank = 4
  addRecord(serverId, {
    tournament: swiss,
    participants: swissParticipants,
    matches: swissMatches,
    teams: [],
    reports: [],
  })

  const cancelled = makeTournament(serverId, {
    id: nextId('tour'),
    name: 'Apex Night Scrim',
    game: 'Apex Legends',
    format: 'double_elimination',
    status: 'cancelled',
    participantType: 'solo',
    maxParticipants: 20,
    createdOffset: 3600 * 4,
    description: 'Giai da huy de demo trang thai cancelled.',
    rules: 'Trios custom lobby.',
    prizePool: 'Cancelled',
  })
  addRecord(serverId, {
    tournament: cancelled,
    participants: [],
    matches: [],
    teams: [],
    reports: [],
  })
}

const ensureTournament = (tournamentId: string) => {
  const found = byTournament.get(tournamentId)
  if (!found) {
    throw new Error('Khong tim thay giai dau.')
  }
  return found
}

const createBracketFromParticipants = (record: DemoTournamentRecord) => {
  if (record.matches.length > 0) {
    return
  }
  if (record.tournament.format === 'swiss') {
    advanceSwissTournament(record)
    return
  }
  const checkedIn = record.participants
    .filter((item) => item.status === 'checked_in' || item.status === 'winner')
    .sort((left, right) => (left.seed ?? 999) - (right.seed ?? 999))

  if (record.tournament.format === 'double_elimination') {
    const entrants = checkedIn.slice(0, 8)
    const mW1 = makeMatch(record.tournament.id, 1, 1, entrants[0] ?? null, entrants[1] ?? null, 'ready', null, null, null, 'upper')
    const mW2 = makeMatch(record.tournament.id, 1, 2, entrants[2] ?? null, entrants[3] ?? null, 'ready', null, null, null, 'upper')
    const mW3 = makeMatch(record.tournament.id, 1, 3, entrants[4] ?? null, entrants[5] ?? null, 'ready', null, null, null, 'upper')
    const mW4 = makeMatch(record.tournament.id, 1, 4, entrants[6] ?? null, entrants[7] ?? null, 'ready', null, null, null, 'upper')
    const mW5 = makeMatch(record.tournament.id, 2, 1, null, null, 'pending', null, null, null, 'upper')
    const mW6 = makeMatch(record.tournament.id, 2, 2, null, null, 'pending', null, null, null, 'upper')
    const mW7 = makeMatch(record.tournament.id, 3, 1, null, null, 'pending', null, null, null, 'upper')

    const mL1 = makeMatch(record.tournament.id, 1, 1, null, null, 'pending', null, null, null, 'lower')
    const mL2 = makeMatch(record.tournament.id, 1, 2, null, null, 'pending', null, null, null, 'lower')
    const mL3 = makeMatch(record.tournament.id, 2, 1, null, null, 'pending', null, null, null, 'lower')
    const mL4 = makeMatch(record.tournament.id, 2, 2, null, null, 'pending', null, null, null, 'lower')
    const mL5 = makeMatch(record.tournament.id, 3, 1, null, null, 'pending', null, null, null, 'lower')
    const mL6 = makeMatch(record.tournament.id, 4, 1, null, null, 'pending', null, null, null, 'lower')

    const mF1 = makeMatch(record.tournament.id, 5, 1, null, null, 'pending', null, null, null, 'final')

    linkMatchFlow(mW1, { winnerTo: mW5, loserTo: mL1 })
    linkMatchFlow(mW2, { winnerTo: mW5, loserTo: mL1 })
    linkMatchFlow(mW3, { winnerTo: mW6, loserTo: mL2 })
    linkMatchFlow(mW4, { winnerTo: mW6, loserTo: mL2 })
    linkMatchFlow(mW5, { winnerTo: mW7, loserTo: mL3 })
    linkMatchFlow(mW6, { winnerTo: mW7, loserTo: mL4 })
    linkMatchFlow(mW7, { winnerTo: mF1, loserTo: mL6 })

    linkMatchFlow(mL1, { winnerTo: mL3 })
    linkMatchFlow(mL2, { winnerTo: mL4 })
    linkMatchFlow(mL3, { winnerTo: mL5 })
    linkMatchFlow(mL4, { winnerTo: mL5 })
    linkMatchFlow(mL5, { winnerTo: mL6 })
    linkMatchFlow(mL6, { winnerTo: mF1 })

    record.matches.push(mW1, mW2, mW3, mW4, mW5, mW6, mW7, mL1, mL2, mL3, mL4, mL5, mL6, mF1)
    return
  }

  for (let index = 0; index < checkedIn.length; index += 2) {
    const participant1 = checkedIn[index] ?? null
    const participant2 = checkedIn[index + 1] ?? null
    if (!participant1) {
      continue
    }
    const isBye = !participant2
    record.matches.push(
      makeMatch(
        record.tournament.id,
        1,
        Math.floor(index / 2) + 1,
        participant1,
        participant2,
        isBye ? 'bye' : 'in_progress',
        isBye ? 1 : null,
        isBye ? 0 : null,
        isBye ? participant1 : null,
        'upper',
      ),
    )
  }
}

export const listTournamentsByServer = async (
  serverId: string,
  params: ListTournamentsParams = {},
): Promise<TournamentListDTO> => {
  ensureDemoData(serverId)
  const ids = byServer.get(serverId) ?? []
  const rawItems = ids
    .map((id) => byTournament.get(id)?.tournament)
    .filter((item): item is TournamentDTO => Boolean(item))
  const filtered = params.status ? rawItems.filter((item) => item.status === params.status) : rawItems
  const page = params.page ?? 1
  const limit = params.limit ?? 50
  const start = (page - 1) * limit
  const items = sortByCreatedDesc(filtered).slice(start, start + limit).map(cloneTournament)
  await delay()
  return { items, total: filtered.length, page, limit }
}

export const createTournament = async (
  serverId: string,
  body: CreateTournamentRequest,
): Promise<TournamentDTO> => {
  ensureDemoData(serverId)
  const current = nowSec()
  const user = getCurrentUser()
  const tournament: TournamentDTO = {
    id: nextId('tour'),
    server_id: serverId,
    name: body.name,
    description: body.description ?? null,
    game: body.game,
    format: body.format,
    status: 'draft',
    max_participants: body.max_participants,
    participant_type: body.participant_type,
    team_size: body.team_size ?? null,
    registration_deadline: body.registration_deadline ?? null,
    check_in_duration_minutes: body.check_in_duration_minutes ?? 15,
    prize_pool: body.prize_pool ?? null,
    rules: body.rules ?? null,
    created_by: user?.id ?? DEMO_HOST_ID,
    started_at: null,
    completed_at: null,
    created_at: current,
    updated_at: current,
  }
  addRecord(serverId, { tournament, participants: [], matches: [], teams: [], reports: [] })
  await delay()
  return cloneTournament(tournament)
}

export const getTournamentDetail = async (tournamentId: string): Promise<TournamentDetailDTO> => {
  const record = ensureTournament(tournamentId)
  await delay()
  return {
    tournament: cloneTournament(record.tournament),
    participant_count: record.participants.length,
    participants: record.participants.map(cloneParticipant),
  }
}

export const updateTournament = async (
  tournamentId: string,
  body: UpdateTournamentRequest,
): Promise<TournamentDTO> => {
  const record = ensureTournament(tournamentId)
  record.tournament = {
    ...record.tournament,
    ...body,
    updated_at: nowSec(),
  }
  await delay()
  return cloneTournament(record.tournament)
}

export const deleteTournament = async (tournamentId: string): Promise<void> => {
  const record = byTournament.get(tournamentId)
  if (!record) {
    return
  }
  byTournament.delete(tournamentId)
  const ids = byServer.get(record.tournament.server_id) ?? []
  byServer.set(
    record.tournament.server_id,
    ids.filter((id) => id !== tournamentId),
  )
  await delay()
}

export const updateTournamentStatus = async (
  tournamentId: string,
  status: TournamentStatusDTO,
): Promise<TournamentDTO> => {
  const record = ensureTournament(tournamentId)
  const current = nowSec()
  record.tournament.status = status
  record.tournament.updated_at = current
  if (status === 'in_progress') {
    record.tournament.started_at = record.tournament.started_at ?? current
    createBracketFromParticipants(record)
    if (record.tournament.format === 'swiss') {
      advanceSwissTournament(record)
    }
  }
  if (status === 'completed') {
    record.tournament.completed_at = current
    const standings = computeStandings(record.participants, record.matches)
    standings.forEach((participant, index) => {
      const found = record.participants.find((item) => item.id === participant.id)
      if (!found) {
        return
      }
      found.final_rank = index + 1
      if (index === 0) {
        found.status = 'winner'
      } else if (found.status !== 'disqualified') {
        found.status = 'eliminated'
      }
    })
  }
  await delay()
  return cloneTournament(record.tournament)
}

export const registerTournamentParticipant = async (
  tournamentId: string,
): Promise<TournamentParticipantDTO> => {
  const record = ensureTournament(tournamentId)
  const currentUser = getCurrentUser()
  if (!currentUser) {
    throw new Error('Ban can dang nhap de tham gia giai dau.')
  }
  const existed = record.participants.find((participant) => participant.user?.id === currentUser.id)
  if (existed) {
    return cloneParticipant(existed)
  }
  if (record.participants.length >= record.tournament.max_participants) {
    throw new Error('Giai dau da dat gioi han nguoi tham gia.')
  }
  const participant: TournamentParticipantDTO = {
    id: nextId('p'),
    user: {
      id: currentUser.id,
      username: currentUser.username,
      is_admin: Boolean(currentUser.is_admin),
      avatar_url: currentUser.avatar_url ?? null,
    },
    team: null,
    seed: record.participants.length + 1,
    status: 'registered',
    final_rank: null,
    registered_at: nowSec(),
    checked_in_at: null,
  }
  record.participants.push(participant)
  record.tournament.updated_at = nowSec()
  await delay()
  return cloneParticipant(participant)
}

export const cancelTournamentRegistration = async (tournamentId: string): Promise<void> => {
  const record = ensureTournament(tournamentId)
  const currentUser = getCurrentUser()
  if (!currentUser) {
    return
  }
  record.participants = record.participants.filter((participant) => participant.user?.id !== currentUser.id)
  await delay()
}

export const checkInTournamentParticipant = async (
  tournamentId: string,
  participantId: string,
): Promise<TournamentParticipantDTO> => {
  const record = ensureTournament(tournamentId)
  const found = record.participants.find((item) => item.id === participantId)
  if (!found) {
    throw new Error('Khong tim thay participant.')
  }
  found.status = 'checked_in'
  found.checked_in_at = nowSec()
  await delay()
  return cloneParticipant(found)
}

export const removeTournamentParticipant = async (
  tournamentId: string,
  participantId: string,
): Promise<void> => {
  const record = ensureTournament(tournamentId)
  record.participants = record.participants.filter((item) => item.id !== participantId)
  await delay()
}

export const updateTournamentParticipantSeed = async (
  tournamentId: string,
  participantId: string,
  seed: number,
): Promise<TournamentParticipantDTO> => {
  const record = ensureTournament(tournamentId)
  const found = record.participants.find((item) => item.id === participantId)
  if (!found) {
    throw new Error('Khong tim thay participant.')
  }
  found.seed = seed
  await delay()
  return cloneParticipant(found)
}

export const bulkAddTournamentParticipants = async (
  tournamentId: string,
  userIds: string[],
): Promise<TournamentParticipantDTO[]> => {
  const record = ensureTournament(tournamentId)
  const added: TournamentParticipantDTO[] = []
  userIds.forEach((userId) => {
    if (record.participants.some((participant) => participant.user?.id === userId)) {
      return
    }
    const participant = seedParticipant(
      nextId('p'),
      `Player ${userId.slice(0, 6)}`,
      'registered',
      record.participants.length + 1,
      nowSec(),
    )
    participant.user = {
      id: userId,
      username: participant.user?.username ?? `Player ${userId.slice(0, 6)}`,
      is_admin: false,
      avatar_url: null,
    }
    record.participants.push(participant)
    added.push(cloneParticipant(participant))
  })
  await delay()
  return added
}

export const getTournamentBracket = async (tournamentId: string): Promise<TournamentMatchDTO[]> => {
  const record = ensureTournament(tournamentId)
  await delay()
  return record.matches.map(cloneMatch)
}

export const listTournamentMatches = async (
  tournamentId: string,
  params: {
    round?: number
    status?: string
    participant_id?: string
  } = {},
): Promise<TournamentMatchDTO[]> => {
  const record = ensureTournament(tournamentId)
  let matches = [...record.matches]
  if (typeof params.round === 'number') {
    matches = matches.filter((item) => item.round === params.round)
  }
  if (params.status) {
    matches = matches.filter((item) => item.status === params.status)
  }
  if (params.participant_id) {
    matches = matches.filter(
      (item) =>
        item.participant1?.id === params.participant_id || item.participant2?.id === params.participant_id,
    )
  }
  await delay()
  return matches.map(cloneMatch)
}

export const getTournamentMatch = async (
  tournamentId: string,
  matchId: string,
): Promise<TournamentMatchDTO> => {
  const record = ensureTournament(tournamentId)
  const match = record.matches.find((item) => item.id === matchId)
  if (!match) {
    throw new Error('Khong tim thay tran dau.')
  }
  await delay()
  return cloneMatch(match)
}

export const reportTournamentMatchResult = async (
  tournamentId: string,
  matchId: string,
  body: {
    winner_id: string
    score1: number
    score2: number
    screenshot_url?: string
  },
): Promise<TournamentMatchReportDTO> => {
  const record = ensureTournament(tournamentId)
  const match = record.matches.find((item) => item.id === matchId)
  if (!match) {
    throw new Error('Khong tim thay tran dau.')
  }
  const winner =
    match.participant1?.id === body.winner_id ? match.participant1 : match.participant2?.id === body.winner_id ? match.participant2 : null
  if (!winner) {
    throw new Error('Winner khong hop le.')
  }
  match.winner = winner
  match.score1 = body.score1
  match.score2 = body.score2
  match.status = 'completed'
  match.completed_at = nowSec()

  const report: TournamentMatchReportDTO = {
    id: nextId('report'),
    match_id: matchId,
    reported_by: getCurrentUser()?.id ?? 'demo-reporter',
    winner_id: body.winner_id,
    score1: body.score1,
    score2: body.score2,
    screenshot_url: body.screenshot_url ?? null,
    status: 'confirmed',
    created_at: nowSec(),
  }
  record.reports.push(report)
  if (record.tournament.format === 'swiss' && record.tournament.status === 'in_progress') {
    advanceSwissTournament(record)
  }
  await delay()
  return cloneReport(report)
}

export const disputeTournamentMatchResult = async (
  tournamentId: string,
  matchId: string,
): Promise<TournamentMatchReportDTO> => {
  const record = ensureTournament(tournamentId)
  const found = [...record.reports].reverse().find((item) => item.match_id === matchId)
  if (!found) {
    throw new Error('Khong co report de dispute.')
  }
  found.status = 'disputed'
  await delay()
  return cloneReport(found)
}

export const overrideTournamentMatchResult = async (
  tournamentId: string,
  matchId: string,
  body: {
    winner_id: string
    score1: number
    score2: number
    reason: string
  },
): Promise<TournamentMatchDTO> => {
  const record = ensureTournament(tournamentId)
  const match = record.matches.find((item) => item.id === matchId)
  if (!match) {
    throw new Error('Khong tim thay tran dau.')
  }
  const winner =
    match.participant1?.id === body.winner_id ? match.participant1 : match.participant2?.id === body.winner_id ? match.participant2 : null
  if (!winner) {
    throw new Error('Winner khong hop le.')
  }
  match.winner = winner
  match.score1 = body.score1
  match.score2 = body.score2
  match.status = 'completed'
  match.completed_at = nowSec()

  record.reports.push({
    id: nextId('report'),
    match_id: matchId,
    reported_by: getCurrentUser()?.id ?? DEMO_HOST_ID,
    winner_id: body.winner_id,
    score1: body.score1,
    score2: body.score2,
    screenshot_url: null,
    status: 'confirmed',
    created_at: nowSec(),
  })
  if (record.tournament.format === 'swiss' && record.tournament.status === 'in_progress') {
    advanceSwissTournament(record)
  }
  await delay()
  return cloneMatch(match)
}

export const getTournamentStandings = async (
  tournamentId: string,
): Promise<TournamentParticipantDTO[]> => {
  const record = ensureTournament(tournamentId)
  await delay()
  return computeStandings(record.participants, record.matches).map(cloneParticipant)
}

export const listTournamentTeams = async (tournamentId: string): Promise<TournamentTeamDTO[]> => {
  const record = ensureTournament(tournamentId)
  await delay()
  return record.teams.map(cloneTeam)
}
