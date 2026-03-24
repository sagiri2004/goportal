import type { TournamentFormatDTO, TournamentParticipantStatusDTO, TournamentStatusDTO } from '@goportal/types'

export const TOURNAMENT_STATUS_META: Record<
  TournamentStatusDTO,
  { label: string; className: string }
> = {
  draft: { label: 'Nháp', className: 'bg-slate-500/20 text-slate-300 border-slate-400/30' },
  registration: { label: 'Đang đăng ký', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
  check_in: { label: 'Check-in', className: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
  in_progress: { label: 'Đang diễn ra', className: 'bg-rose-500/20 text-rose-300 border-rose-400/30' },
  completed: { label: 'Hoàn thành', className: 'bg-zinc-500/20 text-zinc-300 border-zinc-400/30' },
  cancelled: { label: 'Đã huỷ', className: 'bg-zinc-700/30 text-zinc-200 border-zinc-500/40' },
}

export const TOURNAMENT_FORMAT_META: Record<TournamentFormatDTO, { label: string; shortDescription: string }> = {
  single_elimination: { label: 'Single Elimination', shortDescription: 'Thua là out' },
  double_elimination: { label: 'Double Elimination', shortDescription: 'Có cơ hội thứ 2' },
  round_robin: { label: 'Round Robin', shortDescription: 'Tất cả đấu với nhau' },
  swiss: { label: 'Swiss System', shortDescription: 'Ghép theo điểm số' },
}

export const PARTICIPANT_STATUS_META: Record<
  TournamentParticipantStatusDTO,
  { label: string; className: string }
> = {
  registered: { label: 'Đã đăng ký', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
  checked_in: { label: 'Checked-in', className: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
  eliminated: { label: 'Bị loại', className: 'bg-zinc-500/20 text-zinc-300 border-zinc-400/30' },
  winner: { label: 'Vô địch', className: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' },
  disqualified: { label: 'Loại', className: 'bg-rose-500/20 text-rose-300 border-rose-400/30' },
}

export const toDateTimeLocalValue = (unixSeconds?: number | null): string => {
  if (!unixSeconds) {
    return ''
  }
  const date = new Date(unixSeconds * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const fromDateTimeLocalValue = (value: string): number | null => {
  if (!value.trim()) {
    return null
  }
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return null
  }
  return Math.floor(timestamp / 1000)
}

export const formatDateTime = (unixSeconds?: number | null): string => {
  if (!unixSeconds) {
    return '—'
  }
  return new Date(unixSeconds * 1000).toLocaleString('vi-VN')
}

export const formatRelativeCountdown = (unixSeconds?: number | null): string => {
  if (!unixSeconds) {
    return 'Không giới hạn'
  }
  const diff = unixSeconds * 1000 - Date.now()
  if (diff <= 0) {
    return 'Đã hết hạn'
  }
  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export const getParticipantDisplayName = (participant: {
  user?: { username: string } | null
  team?: { name: string } | null
}) => participant.user?.username ?? participant.team?.name ?? 'TBD'
