import React, { useEffect, useMemo, useState } from 'react'
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
} from '@goportal/ui'
import {
  Brackets,
  CircleDashed,
  GitBranchPlus,
  Swords,
  Users,
  UserRound,
} from 'lucide-react'
import type { TournamentDTO, TournamentFormatDTO, TournamentParticipantTypeDTO } from '@goportal/types'
import { createTournament, updateTournament } from '../services'
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
  TOURNAMENT_FORMAT_META,
} from './utils'

type FormState = {
  name: string
  game: string
  description: string
  rules: string
  prize_pool: string
  format: TournamentFormatDTO
  participant_type: TournamentParticipantTypeDTO
  team_size: string
  max_participants: string
  registration_deadline: string
  check_in_duration_minutes: string
}

const formatOptions: Array<{
  value: TournamentFormatDTO
  icon: React.ComponentType<{ className?: string }>
}> = [
  { value: 'single_elimination', icon: Brackets },
  { value: 'double_elimination', icon: GitBranchPlus },
  { value: 'round_robin', icon: CircleDashed },
  { value: 'swiss', icon: Swords },
]

const participantTypeOptions: Array<{
  value: TournamentParticipantTypeDTO
  title: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { value: 'solo', title: 'Solo', icon: UserRound },
  { value: 'team', title: 'Team', icon: Users },
]

const getDefaultState = (tournament?: TournamentDTO): FormState => ({
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
})

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
  tournament?: TournamentDTO | null
  onSuccess?: (tournament: TournamentDTO) => void
}

export const TournamentCreateEditDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  serverId,
  tournament,
  onSuccess,
}) => {
  const isEdit = Boolean(tournament)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(getDefaultState(tournament ?? undefined))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setStep(1)
    setError(null)
    setIsSubmitting(false)
    setForm(getDefaultState(tournament ?? undefined))
  }, [open, tournament])

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return form.name.trim().length > 0 && form.game.trim().length > 0
    }
    if (step === 2) {
      const max = Number(form.max_participants)
      if (!Number.isFinite(max) || max <= 1) {
        return false
      }
      if (form.participant_type === 'team') {
        const teamSize = Number(form.team_size)
        return Number.isFinite(teamSize) && teamSize > 1
      }
      return true
    }
    return true
  }, [form, step])

  const submit = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      if (isEdit && tournament) {
        const updated = await updateTournament(tournament.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          rules: form.rules.trim() || null,
          prize_pool: form.prize_pool.trim() || null,
          max_participants: Number(form.max_participants),
          registration_deadline: fromDateTimeLocalValue(form.registration_deadline),
        })
        onSuccess?.(updated)
        onOpenChange(false)
        return
      }

      const created = await createTournament(serverId, {
        name: form.name.trim(),
        game: form.game.trim(),
        description: form.description.trim() || null,
        rules: form.rules.trim() || null,
        prize_pool: form.prize_pool.trim() || null,
        format: form.format,
        participant_type: form.participant_type,
        team_size:
          form.participant_type === 'team' && form.team_size
            ? Number(form.team_size)
            : null,
        max_participants: Number(form.max_participants),
        registration_deadline: fromDateTimeLocalValue(form.registration_deadline),
        check_in_duration_minutes: Number(form.check_in_duration_minutes) || 15,
      })
      onSuccess?.(created)
      onOpenChange(false)
    } catch (submitError: any) {
      setError(submitError?.message ?? 'Không thể lưu giải đấu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLastStep = step === 3 || isEdit

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Chỉnh sửa giải đấu' : 'Tạo giải đấu'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Cập nhật thông tin giải đấu hiện tại.' : `Bước ${step}/3`}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {[1, 2, 3].map((index) => (
              <Badge
                key={index}
                variant="outline"
                className={index === step ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-300' : ''}
              >
                Bước {index}
              </Badge>
            ))}
          </div>
        )}

        {(step === 1 || isEdit) && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tournament-name">Tên giải</Label>
                <Input
                  id="tournament-name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tournament-game">Game</Label>
                <Input
                  id="tournament-game"
                  value={form.game}
                  onChange={(event) => setForm((prev) => ({ ...prev, game: event.target.value }))}
                  disabled={isEdit}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tournament-description">Mô tả</Label>
              <textarea
                id="tournament-description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="flex min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tournament-rules">Luật chơi</Label>
              <textarea
                id="tournament-rules"
                value={form.rules}
                onChange={(event) => setForm((prev) => ({ ...prev, rules: event.target.value }))}
                className="flex min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tournament-prize">Giải thưởng</Label>
              <textarea
                id="tournament-prize"
                value={form.prize_pool}
                onChange={(event) => setForm((prev) => ({ ...prev, prize_pool: event.target.value }))}
                className="flex min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {!isEdit && step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Format</p>
              <div className="grid grid-cols-2 gap-3">
                {formatOptions.map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, format: value }))}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      form.format === value
                        ? 'border-indigo-400/40 bg-indigo-500/10'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <p className="text-sm font-medium">{TOURNAMENT_FORMAT_META[value].label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {TOURNAMENT_FORMAT_META[value].shortDescription}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Participant type</p>
              <div className="grid grid-cols-2 gap-3">
                {participantTypeOptions.map(({ value, title, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, participant_type: value }))}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      form.participant_type === value
                        ? 'border-indigo-400/40 bg-indigo-500/10'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <p className="text-sm font-medium">{title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {form.participant_type === 'team' && (
                <div className="space-y-1.5">
                  <Label htmlFor="tournament-team-size">Team size</Label>
                  <Input
                    id="tournament-team-size"
                    type="number"
                    min={2}
                    value={form.team_size}
                    onChange={(event) => setForm((prev) => ({ ...prev, team_size: event.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="tournament-max-participants">Số người tối đa</Label>
                <Input
                  id="tournament-max-participants"
                  type="number"
                  min={2}
                  value={form.max_participants}
                  onChange={(event) => setForm((prev) => ({ ...prev, max_participants: event.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {!isEdit && step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tournament-registration-deadline">Thời hạn đăng ký</Label>
              <Input
                id="tournament-registration-deadline"
                type="datetime-local"
                value={form.registration_deadline}
                onChange={(event) => setForm((prev) => ({ ...prev, registration_deadline: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tournament-checkin-duration">Thời gian check-in (phút)</Label>
              <Input
                id="tournament-checkin-duration"
                type="number"
                min={1}
                value={form.check_in_duration_minutes}
                onChange={(event) => setForm((prev) => ({ ...prev, check_in_duration_minutes: event.target.value }))}
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <DialogFooter>
          {!isEdit && step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep((prev) => Math.max(1, prev - 1))}>
              Quay lại
            </Button>
          )}

          {!isLastStep ? (
            <Button
              type="button"
              disabled={!canGoNext}
              onClick={() => setStep((prev) => Math.min(3, prev + 1))}
            >
              Tiếp tục
            </Button>
          ) : (
            <Button type="button" disabled={isSubmitting || !canGoNext} onClick={() => void submit()}>
              {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo giải đấu'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
