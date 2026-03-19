import React from 'react'
import { cn } from '@goportal/ui'

type SegmentType =
  | 'text'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'mention'
  | 'channel'
  | 'url'
  | 'emoji'

type Segment = {
  type: SegmentType
  value: string
}

const emojiLookup: Record<string, string> = {
  smile: '😄',
  joy: '😂',
  heart: '❤️',
  thumbs_up: '👍',
  fire: '🔥',
  tada: '🎉',
  thinking: '🤔',
}

const transformSegments = (
  segments: Segment[],
  pattern: RegExp,
  type: SegmentType,
  pickValue: (match: RegExpExecArray) => string = (match) => match[1] ?? match[0]
): Segment[] => {
  const next: Segment[] = []

  segments.forEach((segment) => {
    if (segment.type !== 'text') {
      next.push(segment)
      return
    }

    pattern.lastIndex = 0
    let lastIndex = 0
    let match = pattern.exec(segment.value)

    while (match) {
      if (match.index > lastIndex) {
        next.push({ type: 'text', value: segment.value.slice(lastIndex, match.index) })
      }

      next.push({ type, value: pickValue(match) })
      lastIndex = match.index + match[0].length
      match = pattern.exec(segment.value)
    }

    if (lastIndex < segment.value.length) {
      next.push({ type: 'text', value: segment.value.slice(lastIndex) })
    }
  })

  return next
}

const parseContent = (content: string): Segment[] => {
  let segments: Segment[] = [{ type: 'text', value: content }]

  segments = transformSegments(segments, /\*\*([^*]+)\*\*/g, 'bold')
  segments = transformSegments(segments, /(\*[^*\n]+\*|_[^_\n]+_)/g, 'italic', (match) =>
    match[0].slice(1, -1)
  )
  segments = transformSegments(segments, /~~([^~]+)~~/g, 'strike')
  segments = transformSegments(segments, /`([^`]+)`/g, 'code')
  segments = transformSegments(segments, /@([a-zA-Z0-9_.-]+)/g, 'mention', (match) => `@${match[1]}`)
  segments = transformSegments(segments, /#([a-zA-Z0-9_-]+)/g, 'channel', (match) => `#${match[1]}`)
  segments = transformSegments(segments, /(https?:\/\/[^\s]+)/g, 'url', (match) => match[1])
  segments = transformSegments(segments, /:([a-zA-Z0-9_+-]+):/g, 'emoji', (match) => match[1])

  return segments
}

const renderSegment = (segment: Segment, index: number) => {
  switch (segment.type) {
    case 'bold':
      return <strong key={index}>{segment.value}</strong>
    case 'italic':
      return <em key={index}>{segment.value}</em>
    case 'strike':
      return <del key={index}>{segment.value}</del>
    case 'code':
      return (
        <code
          key={index}
          className="rounded bg-[hsl(240,4%,18%)] px-1 py-0.5 font-mono text-[13px] text-[hsl(35,85%,75%)]"
        >
          {segment.value}
        </code>
      )
    case 'mention':
      return (
        <span
          key={index}
          className="cursor-pointer rounded bg-indigo-500/25 px-0.5 text-indigo-300 hover:bg-indigo-500/40"
        >
          {segment.value}
        </span>
      )
    case 'channel':
      return (
        <span key={index} className="cursor-pointer text-indigo-300 hover:underline">
          {segment.value}
        </span>
      )
    case 'url':
      return (
        <a
          key={index}
          href={segment.value}
          target="_blank"
          rel="noreferrer noopener"
          className="text-indigo-400 hover:underline"
        >
          {segment.value}
        </a>
      )
    case 'emoji': {
      const resolved = emojiLookup[segment.value] ?? `:${segment.value}:`
      return <React.Fragment key={index}>{resolved}</React.Fragment>
    }
    default:
      return <React.Fragment key={index}>{segment.value}</React.Fragment>
  }
}

export const TextContent: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  const segments = parseContent(content)

  return (
    <span className={cn('text-[15px] leading-relaxed whitespace-pre-wrap break-words', className)}>
      {segments.map(renderSegment)}
    </span>
  )
}
