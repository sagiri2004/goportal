import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Separator, cn, Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui'
import {
  Edit,
  FileText,
  Gift,
  Hash,
  Image,
  MoreHorizontal,
  Plus,
  Reply,
  Smile,
  Trash2,
  X,
} from 'lucide-react'
import { mockMessages } from '@goportal/app-core'
import { TextContent } from './TextContent'
import { ReplyPreview } from './ReplyPreview'
import { ImageAttachment } from './ImageAttachment'
import { FileAttachment } from './FileAttachment'
import { ReactionBar } from './ReactionBar'
import { VideoAttachment } from './VideoAttachment'
import { EmojiPicker } from './EmojiPicker'

type ThreadPanelChatProps = {
  channelName: string
}

export const ThreadPanelChat: React.FC<ThreadPanelChatProps> = ({ channelName }) => {
  const [messagesByChannel, setMessagesByChannel] = useState(mockMessages)
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [composerHasContent, setComposerHasContent] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeChannelKey = useMemo(
    () => (messagesByChannel[channelName] ? channelName : 'general'),
    [channelName, messagesByChannel]
  )

  const activeMessages = useMemo(
    () => messagesByChannel[activeChannelKey] ?? [],
    [activeChannelKey, messagesByChannel]
  )

  const grouped = useMemo(() => {
    const toMinutes = (t: string) => {
      const [hh, mm] = t.split(':').map((n) => Number(n))
      return (hh || 0) * 60 + (mm || 0)
    }

    return activeMessages.map((m, idx) => {
      const prev = activeMessages[idx - 1]
      const sameAuthor = prev && prev.authorId === m.authorId
      const within5 = prev && Math.abs(toMinutes(m.timestamp) - toMinutes(prev.timestamp)) <= 5
      const startsGroup = !(sameAuthor && within5)
      return { ...m, startsGroup }
    })
  }, [activeMessages])

  const actionButtons = [
    { icon: Reply, label: 'Reply' },
    { icon: Edit, label: 'Edit' },
    { icon: Trash2, label: 'Delete' },
    { icon: MoreHorizontal, label: 'More' },
  ]

  const updateComposerState = useCallback(() => {
    const content = inputRef.current?.innerText.trim() ?? ''
    setComposerHasContent(content.length > 0)
  }, [])

  const toggleReaction = (messageId: string, emoji: string) => {
    const currentUserId = 'you'
    setMessagesByChannel((prev) => {
      const messages = prev[activeChannelKey] ?? []
      const nextMessages = messages.map((message) => {
        if (message.id !== messageId) return message

        const currentReactions = message.reactions ?? []
        const reactionIndex = currentReactions.findIndex((reaction) => reaction.emoji === emoji)
        if (reactionIndex === -1) {
          return {
            ...message,
            reactions: [
              ...currentReactions,
              { emoji, count: 1, hasReacted: true, userIds: [currentUserId] },
            ],
          }
        }

        const reaction = currentReactions[reactionIndex]
        const nextHasReacted = !reaction.hasReacted
        const nextCount = Math.max(0, reaction.count + (nextHasReacted ? 1 : -1))
        const nextUserIds = nextHasReacted
          ? Array.from(new Set([...reaction.userIds, currentUserId]))
          : reaction.userIds.filter((id) => id !== currentUserId)

        const nextReactions = currentReactions
          .map((item, index) =>
            index === reactionIndex
              ? {
                  ...reaction,
                  hasReacted: nextHasReacted,
                  count: nextCount,
                  userIds: nextUserIds,
                }
              : item
          )
          .filter((item) => item.count > 0)

        return {
          ...message,
          reactions: nextReactions,
        }
      })

      return {
        ...prev,
        [activeChannelKey]: nextMessages,
      }
    })
  }

  const onSend = useCallback(() => {
    const content = inputRef.current?.innerText.trim() ?? ''
    if (!content && pendingFiles.length === 0) return

    const now = new Date()
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const attachments = pendingFiles.map((file, index) => ({
      id: `upload-${now.getTime()}-${index}`,
      type: file.type.startsWith('image/')
        ? ('image' as const)
        : file.type.startsWith('video/')
          ? ('video' as const)
          : ('file' as const),
      url: URL.createObjectURL(file),
      filename: file.name,
      filesize: file.size,
      mimeType: file.type || 'application/octet-stream',
    }))

    setMessagesByChannel((prev) => {
      const currentMessages = prev[activeChannelKey] ?? []
      return {
        ...prev,
        [activeChannelKey]: [
          ...currentMessages,
          {
            id: `m-${now.getTime()}`,
            authorId: 'you',
            author: 'you',
            authorColor: 'text-indigo-300',
            avatarColor: 'bg-indigo-500',
            avatarInitials: 'Y',
            content,
            timestamp,
            date: 'Today',
            attachments,
          },
        ],
      }
    })

    if (inputRef.current) inputRef.current.innerText = ''
    setPendingFiles([])
    setComposerHasContent(false)
  }, [activeChannelKey, pendingFiles])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        onSend()
      }
    },
    [onSend]
  )

  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      document.execCommand('insertText', false, emoji)
      updateComposerState()
    },
    [updateComposerState]
  )

  const canSend = composerHasContent || pendingFiles.length > 0
  const pendingImagePreviewUrls = useMemo(
    () => pendingFiles.map((file) => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null)),
    [pendingFiles]
  )

  return (
    <>
      <section className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="py-4">
          <Hash className="mb-4 h-14 w-14 rounded-full bg-muted p-3 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground">Welcome to #{channelName}</h2>
          <p className="text-sm text-muted-foreground">This is the start of #{channelName} channel.</p>
        </div>

        <div className="my-4 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="whitespace-nowrap text-xs text-muted-foreground">Today</span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-1">
          {grouped.map((msg) => {
            const username = msg.author ?? 'unknown'
            const avatarLetter = msg.avatarInitials ?? username[0]?.toUpperCase() ?? '?'
            const imageAttachments = (msg.attachments ?? []).filter((a) => a.type === 'image' || a.type === 'gif')
            const videoAttachments = (msg.attachments ?? []).filter((a) => a.type === 'video')
            const fileAttachments = (msg.attachments ?? []).filter((a) => a.type === 'file' || a.type === 'audio')
            const reactions = msg.reactions ?? []

            if (msg.startsGroup) {
              return (
                <div key={msg.id} className="group relative overflow-visible">
                  {msg.replyTo && <ReplyPreview replyTo={msg.replyTo} />}
                  <div className="flex gap-3 rounded-md px-2 py-1 hover:bg-white/5">
                    {msg.avatarUrl ? (
                      <img src={msg.avatarUrl} alt={username} className="mt-0.5 h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${msg.avatarColor ?? 'bg-muted'}`}>
                        {avatarLetter}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-baseline">
                        <span className={`text-sm font-semibold ${msg.authorColor ?? 'text-foreground'}`}>{username}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{msg.timestamp}</span>
                      </div>
                      <TextContent content={msg.content} className="text-foreground" />
                      {imageAttachments.length > 0 && <ImageAttachment attachments={imageAttachments} />}
                      {videoAttachments.map((attachment) => <VideoAttachment key={attachment.id} url={attachment.url} />)}
                      {fileAttachments.map((attachment) => <FileAttachment key={attachment.id} attachment={attachment} />)}
                      <ReactionBar reactions={reactions} onToggleReaction={(emoji) => toggleReaction(msg.id, emoji)} />
                    </div>
                  </div>
                  <div
                    className={cn(
                      'absolute right-2 top-1 z-20 overflow-visible rounded-md border border-border bg-card px-1 shadow-sm',
                      reactionPickerMessageId === msg.id ? 'flex gap-0.5' : 'hidden group-hover:flex group-hover:gap-0.5'
                    )}
                  >
                    <EmojiPicker
                      open={reactionPickerMessageId === msg.id}
                      onOpenChange={(open) => setReactionPickerMessageId(open ? msg.id : null)}
                      onSelect={(emoji) => toggleReaction(msg.id, emoji)}
                      trigger={(
                        <button className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" type="button">
                          <Smile className="h-4 w-4" />
                        </button>
                      )}
                    />
                    {actionButtons.map(({ icon: Icon, label }) => (
                      <Tooltip key={label}>
                        <TooltipTrigger asChild>
                          <button className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" type="button">
                            <Icon className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} className="group relative overflow-visible rounded-md py-0.5 pl-[48px] hover:bg-white/5">
                {msg.replyTo && <ReplyPreview replyTo={msg.replyTo} />}
                <TextContent content={msg.content} className="text-foreground" />
                {imageAttachments.length > 0 && <ImageAttachment attachments={imageAttachments} />}
                {videoAttachments.map((attachment) => <VideoAttachment key={attachment.id} url={attachment.url} />)}
                {fileAttachments.map((attachment) => <FileAttachment key={attachment.id} attachment={attachment} />)}
                <ReactionBar reactions={reactions} onToggleReaction={(emoji) => toggleReaction(msg.id, emoji)} />
                <div
                  className={cn(
                    'absolute right-2 top-0 z-20 overflow-visible rounded-md border border-border bg-card px-1 shadow-sm',
                    reactionPickerMessageId === msg.id ? 'flex gap-0.5' : 'hidden group-hover:flex group-hover:gap-0.5'
                  )}
                >
                  <EmojiPicker
                    open={reactionPickerMessageId === msg.id}
                    onOpenChange={(open) => setReactionPickerMessageId(open ? msg.id : null)}
                    onSelect={(emoji) => toggleReaction(msg.id, emoji)}
                    trigger={(
                      <button className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" type="button">
                        <Smile className="h-4 w-4" />
                      </button>
                    )}
                  />
                  {actionButtons.map(({ icon: Icon, label }) => (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <button className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" type="button">
                          <Icon className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <footer className="mx-3 mb-3 flex-none">
        <div className={`relative rounded-lg bg-[hsl(240,3.7%,18%)] ${canSend ? 'ring-1 ring-indigo-500/30' : ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              setPendingFiles((prev) => [...prev, ...files])
            }}
          />

          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-2">
              {pendingFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="group relative">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={pendingImagePreviewUrls[index] ?? undefined}
                      alt={file.name}
                      className="h-14 w-14 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-md border border-border bg-[hsl(240,4%,18%)]">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 px-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Add Attachment</TooltipContent>
            </Tooltip>

            <div
              ref={inputRef}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={handleKeyDown}
              onInput={updateComposerState}
              className="min-h-[44px] min-w-0 flex-1 overflow-y-auto break-words bg-transparent py-[11px] text-[15px] text-foreground outline-none"
              data-placeholder={`Nhắn #${channelName}`}
            />

            <div className="flex items-center gap-1 pb-2">
              {[
                { icon: Gift, label: 'Gift' },
                { icon: Image, label: 'GIF' },
              ].map(({ icon: Icon, label }) => (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" type="button">
                      <Icon className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
              <EmojiPicker
                align="end"
                onSelect={insertEmoji}
                trigger={(
                  <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" type="button">
                    <Smile className="h-5 w-5" />
                  </button>
                )}
              />
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
