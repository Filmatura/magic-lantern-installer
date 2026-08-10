import { createRequire } from 'node:module'
import type { DiskDevice, FormatResult } from '@shared/diskTypes'
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
    list: (): Promise<DiskDevice[]> => ipcRenderer.invoke('disk:list'),
    format: (deviceId: string): Promise<FormatResult> => ipcRenderer.invoke('disk:format', deviceId),
    eject: (deviceId: string): Promise<CopyResult> => ipcRenderer.invoke('disk:eject', deviceId)
  },

  ml: {
    resolveBundledBuild: (buildId: string): Promise<BundledBuildResult> => ipcRenderer.invoke('ml:resolveBundledBuild', buildId),
    downloadAndExtract: (zipUrl: string, zipName: string): Promise<DownloadResult> =>
      ipcRenderer.invoke('ml:downloadAndExtract', zipUrl, zipName),
    copyToDrive: (sourceDir: string, deviceId: string): Promise<CopyResult> =>
      ipcRenderer.invoke('ml:copyToDrive', sourceDir, deviceId)
  },

  firmware: {
    installToDrive: (deviceId: string): Promise<CopyResult> => ipcRenderer.invoke('firmware:installToDrive', deviceId)
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
