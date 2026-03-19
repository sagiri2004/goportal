import React from 'react'
import ReactPlayer from 'react-player'

type VideoAttachmentProps = {
  url: string
}

export const VideoAttachment: React.FC<VideoAttachmentProps> = ({ url }) => {
  const isPlayableByReactPlayer = ReactPlayer.canPlay?.(url) ?? false

  return (
    <div className="mt-1 max-w-[400px] overflow-hidden rounded-md">
      {isPlayableByReactPlayer ? (
        <ReactPlayer src={url} width="400px" height="225px" controls light playing={false} />
      ) : (
        <video
          src={url}
          controls
          className="max-h-[300px] max-w-[400px] rounded-md"
          preload="metadata"
        />
      )}
    </div>
  )
}
