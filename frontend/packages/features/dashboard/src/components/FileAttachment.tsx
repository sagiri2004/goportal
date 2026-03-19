import React from 'react'
import { cn } from '@goportal/ui'
import { Archive, Download, File, FileText, Music } from 'lucide-react'
import type { Attachment } from '@goportal/app-core'

type FileAttachmentProps = {
  attachment: Attachment
}

const getFileIcon = (mime: string) => {
  if (mime.includes('pdf')) {
    return { icon: FileText, color: 'text-red-400' }
  }
  if (mime.includes('zip')) {
    return { icon: Archive, color: 'text-yellow-400' }
  }
  if (mime.includes('audio')) {
    return { icon: Music, color: 'text-green-400' }
  }
  if (mime.includes('text')) {
    return { icon: FileText, color: 'text-blue-400' }
  }
  return { icon: File, color: 'text-muted-foreground' }
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1048576) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${Math.round((bytes / 1048576) * 10) / 10} MB`
}

export const FileAttachment: React.FC<FileAttachmentProps> = ({ attachment }) => {
  const { icon: Icon, color } = getFileIcon(attachment.mimeType)

  return (
    <div className="mt-1 flex w-[320px] max-w-full items-center gap-3 rounded-md border border-[hsl(240,4%,20%)] bg-[hsl(240,4%,15%)] p-3 group">
      <Icon className={cn('h-8 w-8 flex-shrink-0', color)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{attachment.filename}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.filesize)}</p>
      </div>
      <a href={attachment.url} download={attachment.filename} onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-[hsl(240,4%,22%)] hover:text-foreground group-hover:opacity-100"
        >
          <Download className="h-4 w-4" />
        </button>
      </a>
    </div>
  )
}
