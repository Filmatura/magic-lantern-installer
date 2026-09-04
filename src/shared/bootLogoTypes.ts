/** Shared between main (image processing) and renderer (display + IPC calls). */
export type BootLogoPalette = 'grayscale' | '15-color'

export interface BootLogoResult {
  /** data: URL PNG, for on-screen preview of what will actually show on the camera. */
  previewDataUrl: string
  /** The finished BOOTLOGO.BMP file, base64-encoded for the IPC round trip. */
  bmpBase64: string
}

export interface WriteResult {
  ok: boolean
  error?: string
}
