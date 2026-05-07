import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@goportal/ui'
import { getChannels, getServers } from '../services'
import type { MockChannel, MockServer } from '../mock/servers'

export type SharePickerAction = 'shareGame' | 'shareScore' | 'shareAchievement' | 'shareSessionStart'

const actionLabelMap: Record<SharePickerAction, string> = {
  shareGame: 'Share game card',
  shareScore: 'Share score',
  shareAchievement: 'Share achievement',
  shareSessionStart: 'Share now playing',
}

type Props = {
  open: boolean
  action: SharePickerAction | null
  loading?: boolean
  preferredChannelId?: string | null
  onCancel: () => void
  onConfirm: (selection: { serverId: string; channelId: string }) => void
}

export const GameSharePickerDialog: React.FC<Props> = ({
  open,
  action,
  loading = false,
  preferredChannelId,
  onCancel,
  onConfirm,
}) => {
  const [servers, setServers] = React.useState<MockServer[]>([])
  const [selectedServerId, setSelectedServerId] = React.useState('')
  const [channels, setChannels] = React.useState<MockChannel[]>([])
  const [selectedChannelId, setSelectedChannelId] = React.useState('')
  const [isFetchingServers, setIsFetchingServers] = React.useState(false)
  const [isFetchingChannels, setIsFetchingChannels] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    setIsFetchingServers(true)
    setError(null)
    void getServers()
      .then((items) => {
        if (cancelled) return
        setServers(items)
        const firstServerId = items[0]?.id ?? ''
        setSelectedServerId(firstServerId)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unable to load servers')
      })
      .finally(() => {
        if (cancelled) return
        setIsFetchingServers(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  React.useEffect(() => {
    if (!open || !selectedServerId) {
      setChannels([])
      setSelectedChannelId('')
      return
    }
    let cancelled = false
    setIsFetchingChannels(true)
    setError(null)
    void getChannels(selectedServerId)
      .then((result) => {
        if (cancelled) return
        const textChannels = result.categories.flatMap((category) => category.channels).filter((item) => item.type === 'text')
        setChannels(textChannels)
        const preferred = preferredChannelId && textChannels.some((item) => item.id === preferredChannelId) ? preferredChannelId : ''
        setSelectedChannelId(preferred || textChannels[0]?.id || '')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unable to load channels')
      })
      .finally(() => {
        if (cancelled) return
        setIsFetchingChannels(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, preferredChannelId, selectedServerId])

  const canSubmit = Boolean(selectedServerId && selectedChannelId) && !loading && !isFetchingServers && !isFetchingChannels
  const actionLabel = action ? actionLabelMap[action] : 'Share'

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose share destination</DialogTitle>
          <DialogDescription>Select server and text channel for game share actions.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
            Action: <span className="font-medium text-foreground">{actionLabel}</span>
          </div>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Server</span>
            <select
              value={selectedServerId}
              onChange={(event) => setSelectedServerId(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              disabled={loading || isFetchingServers}
            >
              {servers.length === 0 ? <option value="">No server available</option> : null}
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Channel</span>
            <select
              value={selectedChannelId}
              onChange={(event) => setSelectedChannelId(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              disabled={loading || isFetchingChannels || !selectedServerId}
            >
              {channels.length === 0 ? <option value="">No text channel available</option> : null}
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
          </label>

          {error ? <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirm({ serverId: selectedServerId, channelId: selectedChannelId })}
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
          >
            {loading ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

