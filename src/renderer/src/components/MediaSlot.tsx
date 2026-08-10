import type { MediaSpec } from '@renderer/flow/types'
import './MediaSlot.css'

export function MediaSlot({ media }: { media?: MediaSpec }): React.JSX.Element | null {
  if (!media) return null

  if (media.kind === 'video') {
    return (
      <div className="media-slot media-slot--video">
        <video className="media-slot__el" src={media.src} poster={media.poster} controls autoPlay />
      </div>
    )
  }

  return (
    <div className="media-slot">
      <img className="media-slot__el" src={media.src} alt={media.alt} />
    </div>
  )
}
