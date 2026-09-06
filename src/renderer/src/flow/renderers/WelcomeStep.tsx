import { useEffect, useRef, useState } from 'react'
import filmaturaBlack from '@renderer/assets/brand/filmatura-black.png'
import { Button } from '@renderer/components/Button'
import { APP_VERSION } from '@renderer/version'
import { track } from '@renderer/services/analytics'
import type { WelcomeStep as WelcomeStepDef } from '@renderer/flow/types'
import type { UpdateStatus } from '@shared/updateTypes'
import './WelcomeStep.css'

const RELEASES_URL = 'https://github.com/Filmatura/magic-lantern-installer/releases/latest'

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

const MAX_LOAD_ATTEMPTS = WELCOME_VIDEO_PLAYLIST.length * 2

export function WelcomeStep({
  step,
  onNext,
  onGoto
}: {
  step: WelcomeStepDef
  onNext: () => void
  onGoto: (stepId: string) => void
}): React.JSX.Element {
  const [update, setUpdate] = useState<UpdateStatus | null>(null)
  // Two persistent <video> elements, only one visible at a time. Setting
  // `.src` on a single video element forces it through a blank/no-data
  // state before the next frame decodes - that gap is what was showing as
  // a white flash (the page behind it peeking through). Instead, the
  // hidden slot preloads (and is started playing, muted, off-screen-
  // equivalent via opacity) the next clip well ahead of time, so swapping
  // which slot is on top is instant with a real frame already on screen.
  const slotRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)]
  const slotIndices = useRef<[number, number]>([0, WELCOME_VIDEO_PLAYLIST.length > 1 ? 1 : 0])
  const [front, setFront] = useState<0 | 1>(0)
  const [dead, setDead] = useState(false)
  const failCount = useRef(0)

  useEffect(() => {
    return window.api?.update.onStatus(setUpdate)
  }, [])

  // 'downloading' doesn't carry its own version (see UpdateStatus) - this
  // remembers whatever version 'available' most recently reported, so the
  // banner/tracking still has it once we move past that state.
  const [knownVersion, setKnownVersion] = useState<string | null>(null)
  useEffect(() => {
    if (update && 'version' in update) setKnownVersion(update.version)
  }, [update])

  // As soon as we KNOW a newer version exists - not waiting for a
  // background download to finish, since Restart-to-update doesn't
  // reliably work on Mac anyway (see the update-banner note below) - the
  // main action becomes updating instead of starting a 10-minute guided
  // install on a build with known-fixed bugs already sitting in a newer
  // release. Fails open on its own: 'checking'/'not-available'/'error'
  // (can't reach GitHub, or already current) all leave Get Started as-is.
  const updateKnownNewer =
    update?.state === 'available' || update?.state === 'downloading' || update?.state === 'downloaded' || update?.state === 'blocked'

  const updateNow = (): void => {
    track('update_now_clicked', { version: knownVersion })
    void window.api?.openExternal(RELEASES_URL)
  }

  const updateLater = (): void => {
    track('update_later_clicked', { version: knownVersion })
    onNext()
  }

  useEffect(() => {
    const [a, b] = slotIndices.current
    const va = slotRefs[0].current
    const vb = slotRefs[1].current
    if (va) {
      va.src = WELCOME_VIDEO_PLAYLIST[a]
      va.play().catch(() => {})
    }
    if (vb) {
      vb.src = WELCOME_VIDEO_PLAYLIST[b]
      vb.play().catch(() => {})
    }
    // Mount-only: sets up both slots once. Transitions after this are
    // driven imperatively by handleEnded/handleError below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Every loaded slot plays continuously, muted, regardless of whether it's
  // the visible (front) one - only opacity decides what's on screen. That
  // way the hidden slot has been decoding real frames the whole time the
  // front one plays, so becoming visible is an instant swap instead of
  // waiting on `.play()` to spin up from a paused/buffered-only state
  // (which is what caused a brief black flash at each transition).
  const loadSlot = (slot: 0 | 1, playlistIndex: number): void => {
    const el = slotRefs[slot].current
    if (!el) return
    slotIndices.current[slot] = playlistIndex
    el.src = WELCOME_VIDEO_PLAYLIST[playlistIndex]
    el.play().catch(() => {})
  }

  const handleEnded = (finishedSlot: 0 | 1): void => {
    if (finishedSlot !== front || dead) return
    failCount.current = 0
    const back = finishedSlot === 0 ? 1 : 0
    setFront(back)
    const nextIndex = (slotIndices.current[back] + 1) % WELCOME_VIDEO_PLAYLIST.length
    loadSlot(finishedSlot, nextIndex)
  }

  // A single dead clip shouldn't take the whole background down - skip it
  // and try the next one in that slot. Only if failures pile up (e.g. a
  // fully offline launch) does this give up entirely, so it doesn't spin
  // retrying network requests forever.
  const handleError = (slot: 0 | 1): void => {
    failCount.current += 1
    if (failCount.current > MAX_LOAD_ATTEMPTS) {
      setDead(true)
      return
    }
    const nextIndex = (slotIndices.current[slot] + 1) % WELCOME_VIDEO_PLAYLIST.length
    loadSlot(slot, nextIndex)
  }

  return (
    <div className="welcome-step">
      {!dead && (
        <>
          <video
            ref={slotRefs[0]}
            className={`welcome-step__bg-video ${front === 0 ? 'welcome-step__bg-video--front' : ''}`}
            muted
            playsInline
            onEnded={() => handleEnded(0)}
            onError={() => handleError(0)}
          />
          <video
            ref={slotRefs[1]}
            className={`welcome-step__bg-video ${front === 1 ? 'welcome-step__bg-video--front' : ''}`}
            muted
            playsInline
            onEnded={() => handleEnded(1)}
            onError={() => handleError(1)}
          />
        </>
      )}
      <div className="welcome-step__card">
        <div className="welcome-step__content">
          <img src={filmaturaBlack} alt="Filmatura" className="welcome-step__brand" />
          <span className="welcome-step__version">
            v{APP_VERSION}
            {update?.state === 'not-available' && <span className="welcome-step__version-check"> · Up to date</span>}
          </span>
          <h1 className="welcome-step__title">{step.title}</h1>
          <p className="welcome-step__subtitle">{step.subtitle}</p>

          {updateKnownNewer ? (
            <div className="welcome-step__update-banner">
              <span className="welcome-step__update-banner-tag">Update available</span>
              <p className="welcome-step__update-banner-text">
                {knownVersion ? `Version ${knownVersion} is ready - grab it before starting.` : 'A newer version is ready - grab it before starting.'}
              </p>
              {/* Plain button, not the shared Button component - its
                  primary variant is the same near-black as this banner's
                  own background, which would make it invisible here. This
                  needs the inverted (light-on-dark) treatment instead. */}
              <button type="button" className="welcome-step__update-banner-btn" onClick={updateNow}>
                Update now →
              </button>
              <button type="button" className="welcome-step__update-later" onClick={updateLater}>
                Update later
              </button>
            </div>
          ) : (
            <Button size="lg" withArrow onClick={onNext} className="welcome-step__cta">
              Get started
            </Button>
          )}

          {/* Secondary paths, deliberately smaller/quieter than the Get
              Started button above so it stays the obvious main action -
              but still real text buttons (not corner chips) since both are
              meant to be findable, not hidden. */}
          <div className="welcome-step__secondary-links">
            <button type="button" onClick={() => onGoto('quick-mode-drive-picker')}>
              Quick Mode (Advanced users)
            </button>
            <span className="welcome-step__secondary-dot" aria-hidden>
              ·
            </span>
            <button type="button" onClick={() => onGoto('boot-logo-drive-picker')}>
              Add a custom boot logo
            </button>
          </div>
        </div>
        <p className="welcome-step__footnote">Takes about 10 minutes. We'll guide you through every step.</p>
      </div>
    </div>
  )
}
