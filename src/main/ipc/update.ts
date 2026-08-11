import { createRequire } from 'node:module'
import { app, type BrowserWindow, type IpcMain } from 'electron'
import type { UpdateStatus } from '@shared/updateTypes'

// electron-updater is CommonJS - its named exports aren't statically
// analyzable under ESM (same issue worked around for the "electron" module
// itself in main/index.ts), so this goes through require() instead of a
// static import.
const require = createRequire(import.meta.url)
const { autoUpdater } = require('electron-updater') as typeof import('electron-updater')

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
    if (knownUpdateVersion) {
      send({ state: 'blocked', version: knownUpdateVersion })
    } else {
      send({ state: 'error', message: err.message })
    }
  })

  // Only the renderer-visible "restart & install" action is user-triggered
  // (see WelcomeStep) - the check-and-download itself runs automatically
  // on launch, same as most consumer apps.
  ipcMain.handle('update:quitAndInstall', () => {
    autoUpdater.quitAndInstall()
  })

  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch((err) => send({ state: 'error', message: (err as Error).message }))
  }
}
