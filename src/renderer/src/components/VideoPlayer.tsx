import { useEffect, useRef, useState } from 'react'
import './VideoPlayer.css'

/**
 * A deliberately minimal replacement for the browser's native <video>
 * controls - just play/pause and a scrubber, no fullscreen/settings/
 * download/captions/PiP clutter, and no gradient scrim (native controls
 * need one to stay legible sitting on top of the video; putting the
 * controls in their own strip below the video sidesteps that entirely).
 */
export function VideoPlayer({
  src,
  poster,
  autoPlay
}: {
  src: string
  poster?: string
  autoPlay?: boolean
}): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onTimeUpdate = (): void => {
      if (el.duration) setProgress(el.currentTime / el.duration)
    }
    const onPlay = (): void => setPlaying(true)
    const onPause = (): void => setPlaying(false)
    const onEnded = (): void => setPlaying(false)

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = (): void => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const el = videoRef.current
    if (!el || !el.duration) return
    const ratio = Number(e.target.value)
    el.currentTime = ratio * el.duration
    setProgress(ratio)
  }

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        className="video-player__el"
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        onClick={togglePlay}
      />
      <div className="video-player__controls">
        <button
          type="button"
          className="video-player__play"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor" aria-hidden>
              <rect x="0" y="0" width="3.5" height="13" />
              <rect x="7.5" y="0" width="3.5" height="13" />
            </svg>
          ) : (
            <svg width="12" height="13" viewBox="0 0 12 13" fill="currentColor" aria-hidden>
              <path d="M0 0L12 6.5L0 13V0Z" />
            </svg>
          )}
        </button>
        <input
          type="range"
          className="video-player__scrubber"
          min={0}
          max={1}
          step={0.0001}
          value={Number.isFinite(progress) ? progress : 0}
          onChange={seek}
          aria-label="Seek"
        />
      </div>
    </div>
  )
}
