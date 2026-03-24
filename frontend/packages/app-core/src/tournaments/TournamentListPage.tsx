import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Badge, Button } from '@goportal/ui'
import type { TournamentDTO } from '@goportal/types'
import { Eye, Plus } from 'lucide-react'
import { listTournamentsByServer } from '../services'
import {
  formatDateTime,
  formatRelativeCountdown,
  TOURNAMENT_FORMAT_META,
  TOURNAMENT_STATUS_META,
} from './utils'

type ShellContext = {
  canManageTournaments?: boolean
  openTournamentCreateDialog?: () => void
}

const TournamentCardSkeleton: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-border/60 bg-[hsl(240,8%,14%)] p-4">
    <div className="mb-4 h-5 w-1/2 rounded bg-muted/30" />
    <div className="mb-3 h-4 w-2/3 rounded bg-muted/20" />
    <div className="mb-2 h-4 w-1/3 rounded bg-muted/20" />
    <div className="h-4 w-1/2 rounded bg-muted/20" />
  </div>
)

const TournamentCard: React.FC<{
  tournament: TournamentDTO
  onOpen: () => void
}> = ({ tournament, onOpen }) => {
  const statusMeta = TOURNAMENT_STATUS_META[tournament.status]
  const formatMeta = TOURNAMENT_FORMAT_META[tournament.format]

  return (
    <article className="rounded-xl border border-border/70 bg-[hsl(240,8%,14%)] p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{tournament.name}</h3>
          <p className="text-sm text-muted-foreground">{tournament.game}</p>
        </div>
        <Badge variant="outline" className={statusMeta.className}>
          {statusMeta.label}
        </Badge>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Badge variant="outline">{formatMeta.label}</Badge>
        <span className="text-xs text-muted-foreground">{formatMeta.shortDescription}</span>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          Đăng ký: <span className="text-foreground">0/{tournament.max_participants}</span>
        </p>
        <p>
          Hạn đăng ký:{' '}
          <span className="text-foreground">
            {formatDateTime(tournament.registration_deadline)} ({formatRelativeCountdown(tournament.registration_deadline)})
          </span>
        </p>
      </div>

      <Button type="button" variant="outline" className="mt-4 w-full" onClick={onOpen}>
        <Eye className="mr-2 h-4 w-4" />
        Xem chi tiết
      </Button>
    </article>
  )
}

export const TournamentListPage: React.FC = () => {
  const navigate = useNavigate()
  const { serverId = '' } = useParams<{ serverId: string }>()
  const { canManageTournaments, openTournamentCreateDialog } = useOutletContext<ShellContext>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<TournamentDTO[]>([])

  const load = useCallback(async () => {
    if (!serverId) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await listTournamentsByServer(serverId, { limit: 100 })
      setItems(response.items ?? [])
    } catch (loadError: any) {
      setError(loadError?.message ?? 'Không thể tải danh sách giải đấu.')
    } finally {
      setIsLoading(false)
    }
  }, [serverId])

  useEffect(() => {
    void load()
  }, [load])

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => right.created_at - left.created_at),
    [items],
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col bg-[hsl(240,10%,7%)]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground">Giải đấu</h1>
        </div>
        {canManageTournaments && (
          <Button type="button" size="sm" onClick={() => openTournamentCreateDialog?.()}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo giải đấu
          </Button>
        )}
      </header>

      <section className="min-h-0 flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <TournamentCardSkeleton key={index} />
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-[hsl(240,8%,12%)] p-6 text-sm text-muted-foreground">
            Chưa có giải đấu nào trong server này.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {sortedItems.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onOpen={() => navigate(`/app/servers/${serverId}/tournaments/${tournament.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
