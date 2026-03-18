import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@goportal/ui'
import { useCreateServer } from '../hooks/useServers'
import type { CreateServerRequest } from '@goportal/types'

type CreateServerModalProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export const CreateServerModal: React.FC<CreateServerModalProps> = ({
  isOpen,
  onOpenChange,
  onSuccess,
}) => {
  const [form, setForm] = useState<CreateServerRequest>({
    name: '',
    is_public: true,
  })
  const [error, setError] = useState<string>()
  const createServer = useCreateServer()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)

    if (!form.name.trim()) {
      setError('Server name is required')
      return
    }

    createServer.mutate(form, {
      onSuccess: () => {
        setForm({ name: '', is_public: true })
        onOpenChange(false)
        onSuccess?.()
      },
      onError: (err: any) => {
        setError(err?.message || 'Failed to create server')
      },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Server</DialogTitle>
          <DialogDescription>
            Create a new server to organize your community
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="server-name">Server Name</Label>
            <Input
              id="server-name"
              placeholder="My Awesome Server"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              disabled={createServer.isPending}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="public"
              checked={form.is_public}
              onChange={(e) => setForm(f => ({ ...f, is_public: e.target.checked }))}
              disabled={createServer.isPending}
              className="w-4 h-4 rounded border-input"
            />
            <Label htmlFor="public" className="!mt-0 cursor-pointer">
              Make this server public
            </Label>
          </div>

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createServer.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createServer.isPending}
            >
              {createServer.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
