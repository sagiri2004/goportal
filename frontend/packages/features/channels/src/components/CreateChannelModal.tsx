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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@goportal/ui'
import { useCreateChannel } from '../hooks/useChannels'
import type { CreateChannelRequest } from '@goportal/types'

type CreateChannelModalProps = {
  serverId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  serverId,
  isOpen,
  onOpenChange,
  onSuccess,
}) => {
  const [channelType, setChannelType] = useState<'TEXT' | 'VOICE'>('TEXT')
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const createChannel = useCreateChannel(serverId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)

    if (!name.trim()) {
      setError('Channel name is required')
      return
    }

    const body: CreateChannelRequest = {
      name: name.trim(),
      type: channelType,
    }

    createChannel.mutate(body, {
      onSuccess: () => {
        setName('')
        setChannelType('TEXT')
        onOpenChange(false)
        onSuccess?.()
      },
      onError: (err: any) => {
        setError(err?.message || 'Failed to create channel')
      },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            Create a new text or voice channel for this server
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Type Tabs */}
          <Tabs value={channelType} onValueChange={(v) => setChannelType(v as 'TEXT' | 'VOICE')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="TEXT">Text Channel</TabsTrigger>
              <TabsTrigger value="VOICE">Voice Channel</TabsTrigger>
            </TabsList>
            <TabsContent value="TEXT" className="mt-4">
              <p className="text-xs text-slate-400 mb-2">
                For text-based conversations
              </p>
            </TabsContent>
            <TabsContent value="VOICE" className="mt-4">
              <p className="text-xs text-slate-400 mb-2">
                For voice conversations and streaming
              </p>
            </TabsContent>
          </Tabs>

          {/* Channel Name */}
          <div className="space-y-1.5">
            <Label htmlFor="channel-name">
              Channel Name {channelType === 'TEXT' && <span className="text-slate-500 ml-1">#</span>}
            </Label>
            <Input
              id="channel-name"
              placeholder={channelType === 'TEXT' ? 'channel-name' : 'voice-channel'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createChannel.isPending}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createChannel.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createChannel.isPending}
            >
              {createChannel.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
