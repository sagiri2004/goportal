import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Separator } from '@goportal/ui'
import { ChannelHeader } from '@goportal/feature-channels'
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
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from '@goportal/ui'
import { mockMessages } from '@goportal/app-core'
import type { ChannelDTO } from '@goportal/types'
import { useDropzone } from 'react-dropzone'
import { TextContent } from './components/TextContent'
import { ReplyPreview } from './components/ReplyPreview'
import { ImageAttachment } from './components/ImageAttachment'
import { FileAttachment } from './components/FileAttachment'
import { ReactionBar } from './components/ReactionBar'
import { LinkEmbed } from './components/LinkEmbed'
import { VideoAttachment } from './components/VideoAttachment'
import { EmojiPicker } from './components/EmojiPicker'

type ShellContext = {
  showMembers: boolean
  setShowMembers: React.Dispatch<React.SetStateAction<boolean>>
  activeChannelId: string
  setActiveChannelId: React.Dispatch<React.SetStateAction<string>>
}

export const DashboardView: React.FC = () => {
  const { showMembers, setShowMembers, activeChannelId } = useOutletContext<ShellContext>()
  const [messagesByChannel, setMessagesByChannel] = useState(mockMessages)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null)
  const inputRef = useRef<HTMLDivElement>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [composerHasContent, setComposerHasContent] = useState(false)

  const activeChannel = useMemo(
    () =>
      ({
        id: activeChannelId,
        name: activeChannelId,
        type: 'TEXT',
      }) as unknown as ChannelDTO,
    [activeChannelId]
  )

  const activeChannelKey = useMemo(
    () => (messagesByChannel[activeChannelId] ? activeChannelId : 'general'),
    [activeChannelId, messagesByChannel]
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
      const within5 =
        prev && Math.abs(toMinutes(m.timestamp) - toMinutes(prev.timestamp)) <= 5
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

  const toggleReaction = (messageId: string, emoji: string) => {
    const currentUserId = 'you'
    setMessagesByChannel((prev) => {
      const messages = prev[activeChannelKey] ?? []
      const nextMessages = messages.map((message) => {
        if (message.id !== messageId) {
          return message
        }

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

        const updatedReaction = {
          ...reaction,
          hasReacted: nextHasReacted,
          count: nextCount,
          userIds: nextUserIds,
        }

        const nextReactions = currentReactions
          .map((item, index) => (index === reactionIndex ? updatedReaction : item))
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

  const pendingImagePreviewUrls = useMemo(
    () => pendingFiles.map((file) => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null)),
    [pendingFiles]
  )

  useEffect(() => {
    return () => {
      pendingImagePreviewUrls.forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [pendingImagePreviewUrls])

  const updateComposerState = useCallback(() => {
    const content = inputRef.current?.innerText.trim() ?? ''
    setComposerHasContent(content.length > 0)
  }, [])

  const onSend = useCallback(
    ({ content, files }: { content: string; files: File[] }) => {
      const now = new Date()
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      const attachments = files.map((file, index) => ({
        id: `upload-${now.getTime()}-${index}`,
        type: file.type.startsWith('image/')
          ? ('image' as const)
          : file.type.startsWith('video/')
            ? ('video' as const)
            : file.type.startsWith('audio/')
              ? ('audio' as const)
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
    },
    [activeChannelKey]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        const content = inputRef.current?.innerText.trim() ?? ''
        if (!content && pendingFiles.length === 0) {
          return
        }
        onSend({ content, files: pendingFiles })
        if (inputRef.current) {
          inputRef.current.innerText = ''
        }
        setPendingFiles([])
        setComposerHasContent(false)
      }
    },
    [onSend, pendingFiles]
  )

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.clipboardData.items)
    const imageItems = items.filter((item) => item.type.startsWith('image/'))

    if (imageItems.length > 0) {
      event.preventDefault()
      const files = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[]
      setPendingFiles((prev) => [...prev, ...files])
      return
    }

    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = inputRef.current
      if (!el) {
        return
      }
      el.focus()
      document.execCommand('insertText', false, emoji)
      updateComposerState()
    },
    [updateComposerState]
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => setPendingFiles((prev) => [...prev, ...files]),
    noClick: true,
    noKeyboard: true,
  })

  const canSend = composerHasContent || pendingFiles.length > 0

  const composerPlaceholder = `Message #${activeChannel?.name ?? 'general'}`

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none">
        <ChannelHeader
          channel={activeChannel}
          topic="Welcome to the channel"
          showMembers={showMembers}
          onToggleMembers={() => setShowMembers((v) => !v)}
        />
      </div>

      <section className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="py-4">
          <Hash className="w-16 h-16 p-3 rounded-full bg-muted text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground">
            Welcome to #{activeChannel?.name ?? 'general'}
          </h2>
          <p className="text-muted-foreground text-sm">
            This is the start of #{activeChannel?.name ?? 'general'} channel.
          </p>
        </div>

        <div className="flex items-center gap-3 my-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Today
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-1">
          {grouped.map((msg) => {
            const username = msg.author ?? 'unknown'
            const avatarLetter = msg.avatarInitials ?? username[0]?.toUpperCase() ?? '?'
            const imageAttachments = (msg.attachments ?? []).filter(
              (attachment) => attachment.type === 'image' || attachment.type === 'gif'
            )
            const videoAttachments = (msg.attachments ?? []).filter(
              (attachment) => attachment.type === 'video'
            )
            const fileAttachments = (msg.attachments ?? []).filter(
              (attachment) => attachment.type === 'file' || attachment.type === 'audio'
            )
            const reactions = msg.reactions ?? []

            if (msg.startsGroup) {
              return (
                <div
                  key={msg.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId((current) => (current === msg.id ? null : current))}
                >
                  {msg.replyTo && <ReplyPreview replyTo={msg.replyTo} />}
                  <div className="flex gap-3 px-2 py-1 rounded-md hover:bg-white/5">
                    {msg.avatarUrl ? (
                      <img
                        src={msg.avatarUrl}
                        alt={username}
                        className="mt-0.5 h-10 w-10 flex-shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                          msg.avatarColor ?? 'bg-muted'
                        }`}
                      >
                        {avatarLetter}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-baseline">
                        <span className={`text-sm font-semibold ${msg.authorColor ?? 'text-foreground'}`}>
                          {username}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {msg.timestamp}
                        </span>
                      </div>
                      <TextContent content={msg.content} className="text-foreground" />
                      {imageAttachments.length > 0 && <ImageAttachment attachments={imageAttachments} />}
                      {videoAttachments.map((attachment) => (
                        <VideoAttachment key={attachment.id} url={attachment.url} />
                      ))}
                      {fileAttachments.map((attachment) => (
                        <FileAttachment key={attachment.id} attachment={attachment} />
                      ))}
                      {(msg.embeds ?? []).map((embed, index) => (
                        <LinkEmbed key={`${msg.id}-${embed.url}-${index}`} embed={embed} />
                      ))}
                      <ReactionBar
                        reactions={reactions}
                        onToggleReaction={(emoji) => toggleReaction(msg.id, emoji)}
                        showAddReaction={hoveredMessageId === msg.id}
                        onOpenEmojiPicker={() => setReactionPickerMessageId(msg.id)}
                      />
                    </div>
                  </div>

                  <div className="hidden group-hover:flex absolute right-2 top-1 bg-card border border-border rounded-md shadow-sm px-1 gap-0.5">
                    <EmojiPicker
                      open={reactionPickerMessageId === msg.id}
                      onOpenChange={(open) => setReactionPickerMessageId(open ? msg.id : null)}
                      onSelect={(emoji) => toggleReaction(msg.id, emoji)}
                      trigger={(
                        <button
                          className="cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                          type="button"
                        >
                          <SmilePlus className="w-4 h-4" />
                        </button>
                      )}
                    />
                    {actionButtons.map(({ icon: Icon, label }) => (
                      <Tooltip key={label}>
                        <TooltipTrigger asChild>
                          <button
                            className="cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                            type="button"
                          >
                            <Icon className="w-4 h-4" />
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
              <div
                key={msg.id}
                className="relative group pl-[52px] py-0.5 rounded-md hover:bg-white/5"
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId((current) => (current === msg.id ? null : current))}
              >
                {msg.replyTo && <ReplyPreview replyTo={msg.replyTo} />}
                <TextContent content={msg.content} className="text-foreground" />
                {imageAttachments.length > 0 && <ImageAttachment attachments={imageAttachments} />}
                {videoAttachments.map((attachment) => (
                  <VideoAttachment key={attachment.id} url={attachment.url} />
                ))}
                {fileAttachments.map((attachment) => (
                  <FileAttachment key={attachment.id} attachment={attachment} />
                ))}
                {(msg.embeds ?? []).map((embed, index) => (
                  <LinkEmbed key={`${msg.id}-${embed.url}-${index}`} embed={embed} />
                ))}
                <ReactionBar
                  reactions={reactions}
                  onToggleReaction={(emoji) => toggleReaction(msg.id, emoji)}
                  showAddReaction={hoveredMessageId === msg.id}
                  onOpenEmojiPicker={() => setReactionPickerMessageId(msg.id)}
                />
                <div className="hidden group-hover:flex absolute right-2 top-0 bg-card border border-border rounded-md shadow-sm px-1 gap-0.5">
                  <EmojiPicker
                    open={reactionPickerMessageId === msg.id}
                    onOpenChange={(open) => setReactionPickerMessageId(open ? msg.id : null)}
                    onSelect={(emoji) => toggleReaction(msg.id, emoji)}
                    trigger={(
                      <button
                        className="cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                        type="button"
                      >
                        <SmilePlus className="w-4 h-4" />
                      </button>
                    )}
                  />
                  {actionButtons.map(({ icon: Icon, label }) => (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <button
                          className="cursor-pointer p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                          type="button"
                        >
                          <Icon className="w-4 h-4" />
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

      <footer className="flex-none mx-4 mb-4">
        <div
          {...getRootProps()}
          className={`relative rounded-lg bg-[hsl(240,3.7%,18%)] ${canSend ? 'ring-1 ring-indigo-500/30' : ''}`}
        >
          {isDragActive && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-indigo-500/50 bg-indigo-500/10">
              <p className="font-semibold text-indigo-400">Drop files to upload</p>
            </div>
          )}

          <input {...getInputProps()} />

          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-2">
              {pendingFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="group relative">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={pendingImagePreviewUrls[index] ?? undefined}
                      alt={file.name}
                      className="h-16 w-16 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-md border border-border bg-[hsl(240,4%,18%)]">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="w-12 truncate text-center text-[9px] text-muted-foreground">
                        {file.name}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePendingFile(index)}
                    className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-red-500 text-[10px] text-white group-hover:flex"
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
                  className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                  type="button"
                  onClick={open}
                >
                  <Plus className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Add Attachment</TooltipContent>
            </Tooltip>

            <div
              ref={inputRef}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onInput={updateComposerState}
              className="min-h-[44px] max-h-[300px] min-w-0 flex-1 overflow-y-auto break-words bg-transparent py-[11px] text-[15px] text-foreground outline-none"
              data-placeholder={composerPlaceholder}
            />

            <div className="flex items-center gap-1 pb-2">
              {[
                { icon: Gift, label: 'Gift' },
                { icon: Image, label: 'GIF' },
              ].map(({ icon: Icon, label }) => (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <button
                      className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground"
                      type="button"
                    >
                      <Icon className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
              <EmojiPicker
                align="end"
                onSelect={insertEmoji}
                trigger={(
                  <button
                    className="cursor-pointer p-1.5 rounded-md hover:bg-accent hover:text-foreground transition-colors duration-150 text-muted-foreground"
                    type="button"
                  >
                    <Smile className="w-5 h-5 text-muted-foreground hover:text-foreground" />
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
