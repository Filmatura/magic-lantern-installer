import { useCallback, useEffect, useState } from 'react'
import { Button } from '@renderer/components/Button'
import { StepShell } from '@renderer/components/StepShell'
import { makeFakeDrive } from '@shared/diskTypes'
import type { DriveOption, DrivePickerStep as DrivePickerStepDef } from '@renderer/flow/types'
import './DrivePickerStep.css'

export function DrivePickerStep({
  step,
  selectedId,
  onNext
}: {
  step: DrivePickerStepDef
  selectedId: string | null
  onNext: (drive: DriveOption) => void
}): React.JSX.Element {
  const [selected, setSelected] = useState<string | null>(selectedId)
  const [drives, setDrives] = useState<DriveOption[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fakeDriveAdded, setFakeDriveAdded] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    window.api.disk
      .list()
      .then(setDrives)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const allDrives = [...(drives ?? []), ...(fakeDriveAdded ? [makeFakeDrive()] : [])]
  const selectedDrive = allDrives.find((d) => d.id === selected) ?? null
  const [minRecommended, maxRecommended] = step.recommendedSizeRangeGb
  const isOffRecommendedSize =
    !!selectedDrive && (selectedDrive.sizeGb < minRecommended || selectedDrive.sizeGb > maxRecommended)

  return (
    <StepShell
      eyebrow={step.eyebrow}
      title={step.title}
      subtitle={step.subtitle}
      media={step.media}
      primary={
        <Button size="lg" withArrow disabled={!selectedDrive} onClick={() => selectedDrive && onNext(selectedDrive)}>
          Continue
        </Button>
      }
    >
      {loading && !drives && <p className="drive-picker__status">Looking for removable drives...</p>}

      {error && <p className="drive-picker__status drive-picker__status--error">Couldn't list drives: {error}</p>}

      {!error && !loading && allDrives.length === 0 && (
        <p className="drive-picker__status">No removable drives found. Insert your SD card, then refresh.</p>
      )}

      {allDrives.length > 0 && (
        <div className="drive-picker__list">
          {allDrives.map((drive) => {
            const isFake = drive.id === makeFakeDrive().id
            const tooLarge = !isFake && drive.sizeGb > step.maxSizeGb
            const ineligible = tooLarge || (!isFake && !drive.removable)
            return (
              <button
                key={drive.id}
                type="button"
                disabled={ineligible}
                className={`drive-picker__row ${selected === drive.id ? 'drive-picker__row--selected' : ''}`}
                onClick={() => setSelected(drive.id)}
              >
                <span className="drive-picker__icon" aria-hidden>
                  ▮
                </span>
                <span className="drive-picker__info">
                  <span className="drive-picker__name">{drive.name}</span>
                  <span className="drive-picker__meta">
                    {drive.sizeGb} GB · {drive.kind}
                    {tooLarge && ` - larger than ${step.maxSizeGb} GB, hidden for safety`}
                    {!tooLarge && !isFake && !drive.removable && ' - not removable, hidden for safety'}
                  </span>
                </span>
                {selected === drive.id && !ineligible && (
                  <span className="drive-picker__check" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {isOffRecommendedSize && (
        <div className="drive-picker__warning">
          ⚠ This isn't one of the recommended 256GB cards and has a massive chance of not working properly. Use a
          Lexar Professional SILVER PLUS 256GB or SanDisk Extreme PRO 256GB instead.
        </div>
      )}

      <div className="drive-picker__footer-row">
        <button type="button" className="drive-picker__refresh" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh drives'}
        </button>
        <p className="drive-picker__footnote">
          Only removable drives up to {step.maxSizeGb} GB are shown, so your Mac or PC's own storage is never touched.
        </p>
      </div>

      {import.meta.env.DEV && !fakeDriveAdded && (
        <button type="button" className="drive-picker__dev-btn" onClick={() => setFakeDriveAdded(true)}>
          + Add fake SD card (dev mode) - lets you click through the whole app with no real hardware
        </button>
      )}
    </StepShell>
  )
}
