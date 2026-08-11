import { useCallback, useEffect, useState } from 'react'
import { Button } from '@renderer/components/Button'
import { StepShell } from '@renderer/components/StepShell'
import { makeFakeDrive, MAX_DRIVE_SIZE_GB_OVERRIDE } from '@shared/diskTypes'
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
  // Advanced override: widens the scan to include drives normally hidden
  // for safety (non-removable, over the size cap, or sitting in a
  // built-in reader diskutil/Windows classifies as internal media). The
  // one thing this can never do is surface the system/boot disk - that
  // exclusion lives in the main process's listDrives() itself, not here.
  const [advanced, setAdvanced] = useState(false)

  const refresh = useCallback((includeInternal: boolean) => {
    setLoading(true)
    setError(null)
    window.api.disk
      .list(includeInternal)
      .then(setDrives)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh(advanced)
    // Auto-refresh so a card inserted/removed after landing on this screen
    // just appears without a manual button - `refresh` only ever replaces
    // `drives`, never touches `selected`, so a card the user has already
    // clicked stays selected straight through each background refresh.
    const interval = setInterval(() => refresh(advanced), 5000)
    return () => clearInterval(interval)
  }, [refresh, advanced])

  const allDrives = [...(drives ?? []), ...(fakeDriveAdded ? [makeFakeDrive()] : [])]
  const selectedDrive = allDrives.find((d) => d.id === selected) ?? null
  const [minRecommended, maxRecommended] = step.recommendedSizeRangeGb
  const isOffRecommendedSize =
    !!selectedDrive && (selectedDrive.sizeGb < minRecommended || selectedDrive.sizeGb > maxRecommended)
  const sizeCap = advanced ? MAX_DRIVE_SIZE_GB_OVERRIDE : step.maxSizeGb

  return (
    <StepShell
      eyebrow={step.eyebrow}
      title={step.title}
      subtitle={step.subtitle}
      media={step.media}
      primary={
        <Button
          size="lg"
          withArrow
          disabled={!selectedDrive}
          onClick={() => selectedDrive && onNext(advanced ? { ...selectedDrive, override: true } : selectedDrive)}
        >
          Continue
        </Button>
      }
    >
      {loading && !drives && <p className="drive-picker__status">Looking for removable drives...</p>}

      {error && <p className="drive-picker__status drive-picker__status--error">Couldn't list drives: {error}</p>}

      {!error && !loading && allDrives.length === 0 && (
        <p className="drive-picker__status">No removable drives found. Insert your SD card - we'll pick it up automatically.</p>
      )}

      {allDrives.length > 0 && (
        <div className="drive-picker__list">
          {allDrives.map((drive) => {
            const isFake = drive.id === makeFakeDrive().id
            const tooLarge = !isFake && drive.sizeGb > sizeCap
            const ineligible = tooLarge || (!isFake && !advanced && !drive.removable)
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
                    {tooLarge && ` - larger than ${sizeCap} GB, hidden for safety`}
                    {!tooLarge && !advanced && !isFake && !drive.removable && ' - not removable, hidden for safety'}
                    {!tooLarge && advanced && !isFake && !drive.removable && ' - not normally shown (non-removable)'}
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

      {advanced && (
        <div className="drive-picker__override-note">
          Advanced mode: showing every drive except this computer's system disk, including ones normally hidden for
          size or removability. Double-check you've picked the right card before continuing.
        </div>
      )}

      <div className="drive-picker__footer-row">
        <p className="drive-picker__footnote">
          Only removable drives up to {step.maxSizeGb} GB are shown, so your Mac or PC's own storage is never touched.
        </p>
        <button type="button" className="drive-picker__refresh" onClick={() => setAdvanced((v) => !v)}>
          {advanced ? 'Back to normal view' : "Card not showing up?"}
        </button>
      </div>

      {import.meta.env.DEV && !fakeDriveAdded && (
        <button type="button" className="drive-picker__dev-btn" onClick={() => setFakeDriveAdded(true)}>
          + Add fake SD card (dev mode) - lets you click through the whole app with no real hardware
        </button>
      )}
    </StepShell>
  )
}
