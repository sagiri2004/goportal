import React from 'react'
import type { LinkEmbed as LinkEmbedData } from '@goportal/app-core'

type LinkEmbedProps = {
  embed: LinkEmbedData
}

export const LinkEmbed: React.FC<LinkEmbedProps> = ({ embed }) => {
  return (
    <div
      className="mt-1 max-w-[432px] overflow-hidden rounded-md border border-[hsl(240,4%,20%)] bg-[hsl(240,4%,15%)]"
      style={{ borderLeftColor: embed.color ?? '#5865f2', borderLeftWidth: '4px' }}
    >
      <div className="p-3">
        {embed.siteName && (
          <div className="mb-1 flex items-center gap-1.5">
            {embed.favicon && <img src={embed.favicon} className="h-3.5 w-3.5 rounded-sm" />}
            <span className="text-[11px] text-muted-foreground">{embed.siteName}</span>
          </div>
        )}

        {embed.title && (
          <a
            href={embed.url}
            target="_blank"
            rel="noreferrer"
            className="mb-1 block line-clamp-2 text-sm font-semibold text-indigo-400 hover:underline"
          >
            {embed.title}
          </a>
        )}

        {embed.description && (
          <p className="mb-2 line-clamp-3 text-xs text-muted-foreground">{embed.description}</p>
        )}

        {embed.image && (
          <img src={embed.image} className="mt-1 max-h-[200px] w-full rounded-sm object-cover" />
        )}
      </div>
    </div>
  )
}
