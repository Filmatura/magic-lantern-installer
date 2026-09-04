import { createRequire } from 'node:module'
import type { CardContentCheck, DiskDevice, FormatResult } from '@shared/diskTypes'
import type { UpdateStatus } from '@shared/updateTypes'

const require = createRequire(import.meta.url)
const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron')

interface DownloadResult {
  ok: boolean
  extractedDir: string | null
  error?: string
}

interface CopyResult {
  ok: boolean
  error?: string
}

interface BundledBuildResult {
  ok: boolean
  dir: string | null
  error?: string
}

const api = {
  getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('app:getPlatform'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url),
  quit: (): Promise<void> => ipcRenderer.invoke('app:quit'),

  disk: {
    /** `includeInternal` is the drive-picker's advanced override - widens the scan to include internal-media drives (e.g. a card in a built-in reader), never the boot disk. */
    list: (includeInternal?: boolean): Promise<DiskDevice[]> => ipcRenderer.invoke('disk:list', includeInternal),
    /** `override` relaxes the removable/size safety checks for a drive selected via the advanced override - the boot-disk exclusion itself can't be bypassed by this. */
    format: (deviceId: string, override?: boolean): Promise<FormatResult> => ipcRenderer.invoke('disk:format', deviceId, override),
    eject: (deviceId: string): Promise<CopyResult> => ipcRenderer.invoke('disk:eject', deviceId),
    /** Peeks at the card's root folder before formatting, to warn if it doesn't look like a Canon-formatted card. */
    peekContents: (deviceId: string): Promise<CardContentCheck | null> => ipcRenderer.invoke('disk:peekContents', deviceId)
  },

  ml: {
    resolveBundledBuild: (buildId: string): Promise<BundledBuildResult> => ipcRenderer.invoke('ml:resolveBundledBuild', buildId),
    downloadAndExtract: (zipUrl: string, zipName: string): Promise<DownloadResult> =>
      ipcRenderer.invoke('ml:downloadAndExtract', zipUrl, zipName),
    copyToDrive: (sourceDir: string, deviceId: string, override?: boolean): Promise<CopyResult> =>
      ipcRenderer.invoke('ml:copyToDrive', sourceDir, deviceId, override)
  },

  firmware: {
    installToDrive: (deviceId: string, override?: boolean): Promise<CopyResult> =>
      ipcRenderer.invoke('firmware:installToDrive', deviceId, override)
  },

  /** Streams log lines from any long-running main-process task (format, download, copy). Returns an unsubscribe function. */
  onTaskLog: (cb: (line: string) => void): (() => void) => {
    const handler = (_event: unknown, line: string): void => cb(line)
    ipcRenderer.on('task:log', handler)
    return () => ipcRenderer.removeListener('task:log', handler)
  },

  update: {
    /** Streams the auto-update lifecycle (checking/available/downloading/downloaded/error). Returns an unsubscribe function. */
    onStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
      const handler = (_event: unknown, status: UpdateStatus): void => cb(status)
      ipcRenderer.on('update:status', handler)
      return () => ipcRenderer.removeListener('update:status', handler)
    },
    quitAndInstall: (): Promise<void> => ipcRenderer.invoke('update:quitAndInstall')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
