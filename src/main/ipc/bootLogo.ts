import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import type { IpcMain } from 'electron'
import type { BootLogoPalette, BootLogoResult, WriteResult } from '@shared/bootLogoTypes'
import { generateBootLogo } from '../bootLogo'
import * as diskMac from '../native/diskMac'
import * as diskWin from '../native/diskWin'

const require = createRequire(import.meta.url)
const { dialog } = require('electron') as typeof import('electron')

function backend(): typeof diskMac {
  if (process.platform === 'darwin') return diskMac
  if (process.platform === 'win32') return diskWin as unknown as typeof diskMac
  throw new Error(`Unsupported platform: ${process.platform}`)
}

export function registerBootLogoIpc(ipcMain: IpcMain): void {
  ipcMain.handle('bootLogo:pickImage', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Choose a boot logo image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'tiff', 'tif'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('bootLogo:generate', async (_event, imagePath: string, palette: BootLogoPalette): Promise<BootLogoResult | { error: string }> => {
    try {
      return await generateBootLogo(imagePath, palette)
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('bootLogo:write', async (_event, deviceId: string, bmpBase64: string, override?: boolean): Promise<WriteResult> => {
    const drives = await backend().listDrives(override)
    const target = drives.find((d) => d.id === deviceId)
    if (!target?.mountPath) {
      return { ok: false, error: 'That drive is no longer detected. Reselect your card and try again.' }
    }
    try {
      await writeFile(join(target.mountPath, 'BOOTLOGO.BMP'), Buffer.from(bmpBase64, 'base64'))
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })
}
