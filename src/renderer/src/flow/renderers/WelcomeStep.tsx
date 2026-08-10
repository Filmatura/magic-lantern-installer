import { useEffect, useState } from 'react'
import filmaturaBlack from '@renderer/assets/brand/filmatura-black.png'
import { Button } from '@renderer/components/Button'
import { APP_VERSION } from '@renderer/version'
import type { WelcomeStep as WelcomeStepDef } from '@renderer/flow/types'
import type { UpdateStatus } from '@shared/updateTypes'
import './WelcomeStep.css'

/**
 * Streamed from Filmatura's Shopify Files (720p renditions) instead of
 * bundled with the app - keeps the installer's own download small. Order
 * matters here: this is the exact sequence requested, looping back to the
 * first once the last one ends.
 */
const WELCOME_VIDEO_PLAYLIST = [
  'https://cdn.shopify.com/videos/c/vp/3e4e293ee960483e813f5a10ab43e74c/3e4e293ee960483e813f5a10ab43e74c.HD-720p-4.5Mbps-48834961.mp4',
  'https://cdn.shopify.com/videos/c/vp/e31aade14c4f4687b82a53a914e38461/e31aade14c4f4687b82a53a914e38461.HD-720p-4.5Mbps-48834730.mp4',
  'https://cdn.shopify.com/videos/c/vp/b5a979f6ca2a44119237c99e9148a3ad/b5a979f6ca2a44119237c99e9148a3ad.HD-720p-4.5Mbps-48834164.mp4',
  'https://cdn.shopify.com/videos/c/vp/ac6948c95b614d84af2466d3654992f0/ac6948c95b614d84af2466d3654992f0.HD-720p-4.5Mbps-48834170.mp4',
  'https://cdn.shopify.com/videos/c/vp/fc90a0161d8f43b8b88565ae1ee6dece/fc90a0161d8f43b8b88565ae1ee6dece.HD-720p-4.5Mbps-48835031.mp4',
  'https://cdn.shopify.com/videos/c/vp/66af8c92933345959908bb5971214925/66af8c92933345959908bb5971214925.HD-720p-4.5Mbps-48835030.mp4'
]

export function WelcomeStep({ step, onNext }: { step: WelcomeStepDef; onNext: () => void }): React.JSX.Element {
  const [update, setUpdate] = useState<UpdateStatus | null>(null)
  const [videoIndex, setVideoIndex] = useState(0)
  const [errorStreak, setErrorStreak] = useState(0)

  useEffect(() => {
    return window.api?.update.onStatus(setUpdate)
  }, [])

  const advanceVideo = (): void => {
    setErrorStreak(0)
    setVideoIndex((i) => (i + 1) % WELCOME_VIDEO_PLAYLIST.length)
  }

  // If every clip in the playlist fails in a row (offline launch, most
  // likely), stop retrying instead of spinning through failed network
  // requests forever - the card still shows fine with no background video.
  const handleVideoError = (): void => {
    const nextStreak = errorStreak + 1
    setErrorStreak(nextStreak)
    if (nextStreak < WELCOME_VIDEO_PLAYLIST.length) {
      setVideoIndex((i) => (i + 1) % WELCOME_VIDEO_PLAYLIST.length)
    }
  }

  return (
    <div className="welcome-step">
      {errorStreak < WELCOME_VIDEO_PLAYLIST.length && (
        <video
          key={videoIndex}
          className="welcome-step__bg-video"
          src={WELCOME_VIDEO_PLAYLIST[videoIndex]}
          autoPlay
          muted
          playsInline
          onEnded={advanceVideo}
          onError={handleVideoError}
        />
      )}
      <div className="welcome-step__card">
        <div className="welcome-step__content">
          <img src={filmaturaBlack} alt="Filmatura" className="welcome-step__brand" />
          <span className="welcome-step__version">v{APP_VERSION}</span>
          <h1 className="welcome-step__title">{step.title}</h1>
          <p className="welcome-step__subtitle">{step.subtitle}</p>
          <Button size="lg" withArrow onClick={onNext} className="welcome-step__cta">
            Get started
          </Button>
          {update?.state === 'downloading' && (
            <span className="welcome-step__update welcome-step__update--passive">
              Downloading update... {update.percent}%
            </span>
          )}
          {update?.state === 'downloaded' && (
            <button type="button" className="welcome-step__update" onClick={() => window.api?.update.quitAndInstall()}>
              Restart to update - v{update.version} →
            </button>
          )}
        </div>
        <p className="welcome-step__footnote">Takes about 10 minutes. We'll guide you through every step.</p>
      </div>
    </div>
  )
}
