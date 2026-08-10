import type { MediaSpec } from '@renderer/flow/types'
import { VideoPlayer } from './VideoPlayer'
import './MediaSlot.css'

export function MediaSlot({ media }: { media?: MediaSpec }): React.JSX.Element | null {
  if (!media) return null

  if (media.kind === 'video') {
    return (
      <div className="media-slot media-slot--video">
        <VideoPlayer src={media.src} poster={media.poster} autoPlay />
      </div>
    )
  }

  return (
    <div className="media-slot">
      <img className="media-slot__el" src={media.src} alt={media.alt} />
    </div>
  )
}
