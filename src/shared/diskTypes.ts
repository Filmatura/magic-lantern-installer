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
  /**
   * Set when this drive was selected via the drive-picker's "Advanced:
   * show all drives" override - carried on the device object itself
   * (rather than separate app state) since `selectedDrive` already flows
   * everywhere formatting happens. Relaxes the size/removable checks at
   * format time, but never the boot-disk exclusion - that's enforced
   * independently in listDrives() and can't be bypassed by this flag.
   */
  override?: boolean
}

export interface FormatResult {
  ok: boolean
  mountPath: string | null
  error?: string
}

/** Result of peeking at a card's root folder before formatting, to warn if it doesn't look like a Canon-formatted SD card (no DCIM/MISC). */
export interface CardContentCheck {
  empty: boolean
  looksLikeCanon: boolean
}

/**
 * Hard safety ceiling shared by the renderer (for display/disabling) and
 * the main process (as the actual enforcement point right before any
 * format command runs). Nothing above this size is ever eligible.
 */
export const MAX_DRIVE_SIZE_GB = 256

/**
 * Still-sane upper bound even in the drive-picker's advanced override mode
 * (e.g. someone genuinely using a larger card) - not a real safety
 * mechanism like the boot-disk exclusion, just a guard against an
 * obviously-wrong selection like a large external backup drive.
 */
export const MAX_DRIVE_SIZE_GB_OVERRIDE = 2048

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
