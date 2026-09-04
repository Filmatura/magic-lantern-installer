import { createRequire } from 'node:module'
import { app, type BrowserWindow, type IpcMain } from 'electron'
import type { UpdateStatus } from '@shared/updateTypes'

// electron-updater is CommonJS - its named exports aren't statically
// analyzable under ESM (same issue worked around for the "electron" module
// itself in main/index.ts), so this goes through require() instead of a
// static import.
const require = createRequire(import.meta.url)
const { autoUpdater } = require('electron-updater') as typeof import('electron-updater')

function isNewerVersion(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number)
  const l = local.split('.').map(Number)
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] ?? 0
    const lv = l[i] ?? 0
    if (rv !== lv) return rv > lv
  }
  return false
}

/**
 * Windows only. electron-updater's silent download-and-relaunch flow is
 * built around an NSIS-installed app's registry/uninstaller state -
 * confirmed on real hardware that it does nothing at all for our portable
 * .exe target (no download, no "update available" UI, nothing), which
 * matches how electron-updater's Windows support is documented to work.
 * Rather than keep pretending to check via a mechanism that can't function
 * for a portable app, this does a plain version comparison against
 * GitHub's latest release tag and goes straight to the same "download
 * manually" prompt used elsewhere for a blocked update - there's no
 * silent install path to offer on Windows portable regardless.
 */
async function checkGithubLatestVersionDirect(send: (status: UpdateStatus) => void): Promise<void> {
  send({ state: 'checking' })
  try {
    const res = await fetch('https://api.github.com/repos/Filmatura/magic-lantern-installer/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' }
    })
    if (!res.ok) throw new Error(`GitHub API responded ${res.status}`)
    const data = (await res.json()) as { tag_name?: string }
    const latest = (data.tag_name ?? '').replace(/^v/, '')
    if (latest && isNewerVersion(latest, app.getVersion())) {
      send({ state: 'blocked', version: latest })
    } else {
      send({ state: 'not-available' })
    }
  } catch (err) {
    send({ state: 'error', message: (err as Error).message })
  }
}

/**
 * electron-updater reads `app-update.yml` out of the packaged app's resources
 * to know where to check (GitHub Releases on Filmatura/magic-lantern-installer,
 * per the `publish` block in package.json's `build` config) - that file only
 * exists in a built/packaged app, so checking in `npm run dev` throws. Every
 * call in here is guarded on `app.isPackaged` for that reason.
 */
export function registerUpdateIpc(ipcMain: IpcMain, win: BrowserWindow): void {
  const send = (status: UpdateStatus): void => {
    if (!win.isDestroyed()) win.webContents.send('update:status', status)
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  // electron-updater fires the same generic 'error' event whether the
  // initial check failed (no internet, no release published yet, a 404 -
  // we don't actually know if a newer version exists) or a download/apply
  // step failed *after* a real update was already confirmed. Tracking the
  // last confirmed version here is what lets those two cases show
  // different UI - a confusing "update available" prompt when there might
  // not even be one is worse than staying silent.
  let knownUpdateVersion: string | null = null

  autoUpdater.on('checking-for-update', () => send({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => {
    knownUpdateVersion = info.version
    send({ state: 'available', version: info.version })
  })
  autoUpdater.on('update-not-available', () => {
    knownUpdateVersion = null
    send({ state: 'not-available' })
  })
  autoUpdater.on('download-progress', (progress) => send({ state: 'downloading', percent: Math.round(progress.percent) }))
  autoUpdater.on('update-downloaded', (info) => send({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', (err) => {
    // Logged (not just sent to the UI as a generic "blocked" state) because
    // this is also where a failed quitAndInstall() surfaces - Squirrel.Mac
    // requires the *running* app to have a real, consistent code signature
    // to replace itself in place, which an ad-hoc-only signature doesn't
    // satisfy (nor did any build before the ad-hoc-signing fix landed, so
    // updating away from one of those old unsigned installs is expected to
    // hit this). This log line is what tells us which case we're actually
    // in if it comes up again.
    console.error('[update] error event:', err.message)
    if (knownUpdateVersion) {
      send({ state: 'blocked', version: knownUpdateVersion })
    } else {
      send({ state: 'error', message: err.message })
    }
  })

  // Only the renderer-visible "restart & install" action is user-triggered
  // (see WelcomeStep) - the check-and-download itself runs automatically
  // on launch, same as most consumer apps. quitAndInstall() failing doesn't
  // throw synchronously here - it fails asynchronously through Squirrel's
  // own machinery and surfaces via the 'error' listener above instead.
  ipcMain.handle('update:quitAndInstall', () => {
    autoUpdater.quitAndInstall()
  })

  if (app.isPackaged) {
    if (process.platform === 'win32') {
      checkGithubLatestVersionDirect(send)
    } else {
      autoUpdater.checkForUpdates().catch((err) => send({ state: 'error', message: (err as Error).message }))
    }
  }
}
