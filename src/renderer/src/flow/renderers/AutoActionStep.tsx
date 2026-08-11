import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/Button'
import { HoldToConfirm } from '@renderer/components/HoldToConfirm'
import { LogPanel } from '@renderer/components/LogPanel'
import { StepShell } from '@renderer/components/StepShell'
import { useAppState } from '@renderer/state/AppState'
import { previewLatestBuild, runSubStep, type RunCarry } from '@renderer/services/install'
import { getBuildOption } from '@shared/builds'
import type { AutoStep as AutoStepDef, FlowStateValues } from '@renderer/flow/types'
import type { LatestBuildInfo } from '@renderer/services/github'
import './AutoActionStep.css'

type Phase = 'idle' | 'running' | 'success' | 'error'
type SubStatus = 'pending' | 'running' | 'done' | 'error'

export function AutoActionStep({
  step,
  onNext,
  onGoto
}: {
  step: AutoStepDef
  onNext: (setState?: Partial<FlowStateValues>) => void
  onGoto: (stepId: string) => void
}): React.JSX.Element {
  const { log, pushLog, values } = useAppState()
  const [phase, setPhase] = useState<Phase>('idle')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [subStatus, setSubStatus] = useState<Record<string, SubStatus>>(() =>
    Object.fromEntries(step.subSteps.map((s) => [s.id, 'pending' as SubStatus]))
  )
  const selectedBuild = getBuildOption(values.selectedBuildId)
  const needsRemotePreview = step.action === 'install-magic-lantern' && selectedBuild?.source === 'remote'
  const [preview, setPreview] = useState<LatestBuildInfo | null | 'loading'>(needsRemotePreview ? 'loading' : null)
  const [collected, setCollected] = useState<Partial<FlowStateValues>>({})

  const drive = values.selectedDrive

  useEffect(() => {
    if (!needsRemotePreview) {
      setPreview(null)
      return
    }
    setPreview('loading')
    let cancelled = false
    previewLatestBuild(values.offlineMode, selectedBuild?.githubRepo).then((result) => {
      if (!cancelled) setPreview(result)
    })
    return () => {
      cancelled = true
    }
    // Re-check whenever the selected build's repo changes - not just when
    // toggling between "some remote build" and "a bundled one." Keying off
    // `needsRemotePreview` alone missed switching between two different
    // remote builds (e.g. Filmatura's fork -> Amit's), since that boolean
    // stays true across the switch while the repo to fetch actually
    // changes. Re-running on every offlineMode flicker would refetch
    // mid-render for no reason, so that's deliberately left out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsRemotePreview, selectedBuild?.githubRepo])

  const run = async (): Promise<void> => {
    setPhase('running')
    const unsubscribe = window.api?.onTaskLog((line) => pushLog(line))
    let result: Partial<FlowStateValues> = {}
    let liveDrive = drive
    const carry: RunCarry = {}
    let currentSubId: string | null = null
    try {
      for (const sub of step.subSteps) {
        currentSubId = sub.id
        setSubStatus((prev) => ({ ...prev, [sub.id]: 'running' }))
        const partial = await runSubStep(
          step.action,
          sub.id,
          { log: pushLog, offlineMode: values.offlineMode },
          liveDrive,
          values.selectedBuildId,
          preview === 'loading' ? null : preview,
          carry
        )
        if (partial) {
          result = { ...result, ...partial }
          if (partial.selectedDrive) liveDrive = partial.selectedDrive
        }
        setSubStatus((prev) => ({ ...prev, [sub.id]: 'done' }))
      }
      setCollected(result)
      setPhase('success')
    } catch (err) {
      // Whichever sub-step was running when this threw stays stuck on its
      // spinner otherwise - mark it failed explicitly instead of leaving
      // the user staring at something that looks like it's still working.
      if (currentSubId) {
        const failedId = currentSubId
        setSubStatus((prev) => ({ ...prev, [failedId]: 'error' }))
      }
      pushLog(`Failed: ${(err as Error).message}`, 'error')
      setPhase('error')
    } finally {
      unsubscribe?.()
    }
  }

  // Gate on the preview fetch too, not just on having a drive selected - if
  // the user completes the 3-second hold before the background version
  // check resolves, the download sub-step sees `preview: null` and fails
  // with a misleading "couldn't reach GitHub" even when the network is
  // fine. Disabling until it resolves removes the race entirely. Bundled
  // builds have no such fetch, so they're never blocked on this.
  const notReady = !drive || (needsRemotePreview && preview === 'loading')

  const primary =
    phase === 'idle' && step.destructive ? (
      <HoldToConfirm label="Hold to format" holdingLabel="Working..." onConfirm={run} disabled={notReady} />
    ) : phase === 'idle' ? (
      <Button size="lg" onClick={run} disabled={notReady}>
        Start
      </Button>
    ) : phase === 'error' ? (
      <Button size="lg" variant="secondary" onClick={run}>
        Try again
      </Button>
    ) : phase === 'success' ? (
      <Button size="lg" withArrow onClick={() => onNext(collected)}>
        Continue
      </Button>
    ) : undefined

  return (
    <StepShell eyebrow={step.eyebrow} title={step.title} subtitle={step.subtitle} media={step.media} primary={primary}>
      {phase === 'idle' && (
        <div className="auto-step__preview">
          <div className="auto-step__preview-row">
            <span>Card</span>
            <strong>{drive ? `${drive.name} · ${drive.sizeGb} GB` : 'No card selected'}</strong>
          </div>
          {step.action === 'install-magic-lantern' && (
            <div className="auto-step__preview-row">
              <span>Magic Lantern build</span>
              <strong>
                {!needsRemotePreview
                  ? selectedBuild?.label
                  : preview === 'loading'
                    ? 'Checking for the latest build...'
                    : preview
                      ? `${selectedBuild?.label} - ${preview.version}`
                      : 'Unavailable - no internet reached'}
              </strong>
            </div>
          )}
          {step.action === 'format-and-flash-firmware' && (
            <div className="auto-step__preview-row">
              <span>Canon firmware</span>
              <strong>2.0.2 (bundled with this app)</strong>
            </div>
          )}
        </div>
      )}

      {phase === 'idle' && step.action === 'install-magic-lantern' && step.allowBuildChange !== false && (
        <button type="button" className="auto-step__advanced-link" onClick={() => onGoto('choose-build')}>
          Advanced: change build
        </button>
      )}

      {step.destructive && phase === 'idle' && (
        <div className="auto-step__warning">⚠ {step.confirmCopy ?? 'This will erase the card. Hold to confirm.'}</div>
      )}

      {phase !== 'idle' && (
        <div className="auto-step__checklist">
          {step.subSteps.map((sub, i) => {
            const status = subStatus[sub.id]
            return (
              <div key={sub.id} className={`auto-step__subrow auto-step__subrow--${status}`}>
                <span className="auto-step__subnum">
                  {status === 'done' ? (
                    <span className="auto-step__subcheck" aria-hidden>
                      ✓
                    </span>
                  ) : status === 'error' ? (
                    <span className="auto-step__suberror" aria-hidden>
                      ✕
                    </span>
                  ) : status === 'running' ? (
                    <span className="auto-step__subspinner" aria-hidden />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="auto-step__sublabel">{sub.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {phase === 'success' && <p className="auto-step__done-note">All done - you're clear to continue.</p>}
      {phase === 'error' && <p className="auto-step__error-note">Something went wrong - see details below.</p>}

      {phase !== 'idle' && (
        <div className="auto-step__details">
          <button type="button" className="auto-step__details-toggle" onClick={() => setDetailsOpen((v) => !v)}>
            {detailsOpen ? 'Hide' : 'Show'} technical details {detailsOpen ? '▴' : '▾'}
          </button>
          {detailsOpen && <LogPanel entries={log} />}
        </div>
      )}
    </StepShell>
  )
}
