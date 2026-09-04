import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/Button'
import { StepShell } from '@renderer/components/StepShell'
import type { BootLogoPalette, BootLogoResult } from '@shared/bootLogoTypes'
import type { CustomBootLogoStep as CustomBootLogoStepDef, FlowStateValues } from '@renderer/flow/types'
import './CustomBootLogoStep.css'

const PALETTE_OPTIONS: { id: BootLogoPalette; label: string; description: string }[] = [
  { id: '15-color', label: '15-Color Dither', description: 'Keeps brand colors, dithered to what the camera can display.' },
  { id: 'grayscale', label: 'Grayscale', description: 'Smooth black-and-white ramp - closest to a real photo look.' }
]

export function CustomBootLogoStep({
  step,
  onGoto
}: {
  step: CustomBootLogoStepDef
  onGoto: (stepId: string, setState?: Partial<FlowStateValues>) => void
}): React.JSX.Element {
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string | null>(null)
  const [palette, setPalette] = useState<BootLogoPalette>('15-color')
  const [result, setResult] = useState<BootLogoResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!imagePath) return
    let cancelled = false
    setProcessing(true)
    setError(null)
    window.api?.bootLogo.generate(imagePath, palette).then((res) => {
      if (cancelled) return
      setProcessing(false)
      if (!res || 'error' in res) {
        setResult(null)
        setError(res?.error ?? 'Could not process that image.')
        return
      }
      setResult(res)
    })
    return () => {
      cancelled = true
    }
  }, [imagePath, palette])

  const chooseImage = async (): Promise<void> => {
    const path = await window.api?.bootLogo.pickImage()
    if (!path) return
    setImagePath(path)
    setImageName(path.split(/[/\\]/).pop() ?? path)
    setResult(null)
  }

  const skip = (): void => {
    onGoto(step.skipNext ?? step.next, { bootLogoBmpBase64: null, bootLogoPreviewDataUrl: null })
  }

  const confirm = (): void => {
    if (!result) return
    onGoto(step.next, { bootLogoBmpBase64: result.bmpBase64, bootLogoPreviewDataUrl: result.previewDataUrl })
  }

  return (
    <StepShell
      eyebrow={step.eyebrow ?? 'Optional'}
      title={step.title}
      subtitle={step.subtitle}
      primary={
        <>
          <Button variant="secondary" onClick={skip}>
            {step.skipLabel ?? 'Skip this step'}
          </Button>
          <Button size="lg" withArrow onClick={confirm} disabled={!result || processing}>
            Use this logo
          </Button>
        </>
      }
    >
      <div className="boot-logo-step__body">
        <div className="boot-logo-step__preview-frame">
          {result ? (
            <img src={result.previewDataUrl} alt="Boot logo preview" className="boot-logo-step__preview-img" />
          ) : processing ? (
            <span className="boot-logo-step__preview-status">Processing...</span>
          ) : (
            <span className="boot-logo-step__preview-status">No image chosen yet</span>
          )}
        </div>

        <div className="boot-logo-step__controls">
          {imageName && <span className="boot-logo-step__filename">{imageName}</span>}
          <Button variant="secondary" onClick={chooseImage}>
            {imageName ? 'Choose a different image' : 'Choose image'}
          </Button>

          {error && <div className="boot-logo-step__error">⚠ {error}</div>}

          <div className="boot-logo-step__palettes">
            {PALETTE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`boot-logo-step__palette ${palette === opt.id ? 'boot-logo-step__palette--selected' : ''}`}
                onClick={() => setPalette(opt.id)}
              >
                <span className="boot-logo-step__palette-label">{opt.label}</span>
                <span className="boot-logo-step__palette-desc">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </StepShell>
  )
}
