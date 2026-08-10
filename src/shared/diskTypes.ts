/**
 * Shared between main (real disk access) and renderer (display + IPC
 * calls) - kept dependency-free so both tsconfig projects can import it
 * directly without reaching across the renderer/main boundary.
 */
export interface DiskDevice {
  /** Platform device identifier - e.g. "/dev/disk4" on mac, a disk number on Windows. Used as the id everywhere. */
  id: string
  name: string
  sizeGb: number
  removable: boolean
  /** Where it's currently mounted, if at all - needed to know where to copy files. */
  mountPath: string | null
  /** Best-effort bus/media description for display (e.g. "USB", "SD"). */
  kind: string
}

export interface FormatResult {
  ok: boolean
  mountPath: string | null
  error?: string
}

/**
 * Hard safety ceiling shared by the renderer (for display/disabling) and
 * the main process (as the actual enforcement point right before any
 * format command runs). Nothing above this size is ever eligible.
 */
export const MAX_DRIVE_SIZE_GB = 256

export const VOLUME_LABEL = 'ML_CARD'

/**
 * Sentinel id for the dev-mode simulated card (see DrivePickerStep +
 * install.ts). Never a real device id - every real-disk code path checks
 * for it explicitly and refuses to act on it, so even a coding mistake
 * can't make a "fake" selection reach a real format/copy command.
 */
export const FAKE_DRIVE_ID = 'dev-fake-card'

export function makeFakeDrive(): DiskDevice {
  return {
    id: FAKE_DRIVE_ID,
    name: 'FAKE_DEV_CARD (simulated)',
    sizeGb: 256,
    removable: true,
    mountPath: '/tmp/ml-fake-dev-card',
    kind: 'Simulated'
  }
}
