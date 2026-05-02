import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Separator, cn, Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui'
import type { Message as ChatMessage } from '@goportal/app-core'
import { getMessages, sendMessage, uploadMessageAttachment } from '@goportal/app-core'
import {
  Edit,
  FileText,
  Gift,
  Hash,
  Image,
  Loader2,
  MoreHorizontal,
  Plus,
  Reply,
  Smile,
  Trash2,
  X,
} from 'lucide-react'
import { TextContent } from './TextContent'
import { ReplyPreview } from './ReplyPreview'
import { ImageAttachment } from './ImageAttachment'
import { FileAttachment } from './FileAttachment'
import { ReactionBar } from './ReactionBar'
import { VideoAttachment } from './VideoAttachment'
import { EmojiPicker } from './EmojiPicker'

type ThreadPanelChatProps = {
  channelName: string
  channelId: string
}

export const ThreadPanelChat: React.FC<ThreadPanelChatProps> = ({ channelName, channelId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [composerHasContent, setComposerHasContent] = useState(false)
  const [uploadProgressByFile, setUploadProgressByFile] = useState<Record<string, number>>({})
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)
  const inputRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!channelId) {
      setMessages([])
      return
    }

    let cancelled = false
    setIsLoading(true)

    const fetchMessages = async () => {
      try {
        const page = await getMessages(channelId, { limit: 100, offset: 0 })
        if (!cancelled) {
          setMessages(page.items ?? [])
        }
      } catch {
        if (!cancelled) {
          setComposerError('Khong the tai lich su tin nhan kenh voice.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchMessages()
    return () => {
      cancelled = true
    }
  }, [channelId])

  const grouped = useMemo(() => {
    const toMinutes = (t: string) => {
      const [hh, mm] = t.split(':').map((n) => Number(n))
      return (hh || 0) * 60 + (mm || 0)
    }

    return messages.map((m, idx) => {
      const prev = messages[idx - 1]
      const sameAuthor = prev && prev.authorId === m.authorId
      const within5 = prev && Math.abs(toMinutes(m.timestamp) - toMinutes(prev.timestamp)) <= 5
      const startsGroup = !(sameAuthor && within5)
      return { ...m, startsGroup }
    })
  }, [messages])

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
    setMessages((prev) =>
      prev.map((message) => {
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
    )
  }

  const onSend = useCallback(async () => {
    const content = inputRef.current?.innerText.trim() ?? ''
    if (!content && pendingFiles.length === 0) return
    if (!channelId) return

    try {
      setComposerError(null)
      setIsUploadingFiles(true)

      const attachmentIDs = await Promise.all(
        pendingFiles.map(async (file, index) => {
          const key = `${file.name}-${file.size}-${index}`
          const uploaded = await uploadMessageAttachment(file, (progress) => {
            setUploadProgressByFile((prev) => ({ ...prev, [key]: progress }))
          })
          return uploaded.attachmentId
        })
      )

      const created = await sendMessage(channelId, content, attachmentIDs)
      setMessages((prev) => [...prev, created])

      if (inputRef.current) {
        inputRef.current.innerText = ''
      }
      setPendingFiles([])
      setComposerHasContent(false)
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : 'Failed to send message.')
    } finally {
      setUploadProgressByFile({})
      setIsUploadingFiles(false)
    }
  }, [channelId, pendingFiles])

  const handleKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        await onSend()
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

  const canSend = (composerHasContent || pendingFiles.length > 0) && !isUploadingFiles
  const pendingImagePreviewUrls = useMemo(
    () => pendingFiles.map((file) => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null)),
    [pendingFiles]
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="min-h-0 flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
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

        {isLoading && (
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Dang tai tin nhan...</span>
          </div>
        )}

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
            disabled={isUploadingFiles}
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
                    disabled={isUploadingFiles}
                    className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isUploadingFiles && (
            <div className="px-3 pb-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading attachments...</span>
              </div>
              {pendingFiles.map((file, index) => {
                const key = `${file.name}-${file.size}-${index}`
                const progress = uploadProgressByFile[key] ?? 0
                return (
                  <p key={key} className="truncate">
                    {file.name}: {progress}%
                  </p>
                )
              })}
            </div>
          )}

          {composerError && <p className="px-3 pb-2 text-xs text-red-400">{composerError}</p>}

          <div className="flex items-end gap-2 px-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFiles}
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
              data-placeholder={`Nhan #${channelName}`}
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
    </div>
  )
}
