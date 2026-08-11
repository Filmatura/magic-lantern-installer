export type UpdateStatus =
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available' }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  /** A newer version was confirmed (update-available fired) but something failed before it could finish downloading/installing - unlike plain `error`, we know a specific version exists, so the UI shows a manual-download prompt for it. */
  | { state: 'blocked'; version: string }
  /** The check itself failed (no internet, no release published yet, etc.) - we don't know whether an update exists, so the UI stays silent rather than showing a confusing "update available" prompt. */
  | { state: 'error'; message: string }
