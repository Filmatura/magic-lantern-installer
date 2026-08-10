import type { IpcMain, WebContents } from 'electron'
import type { DiskDevice, FormatResult } from '@shared/diskTypes'
import { MAX_DRIVE_SIZE_GB, VOLUME_LABEL } from '@shared/diskTypes'
import * as diskMac from '../native/diskMac'
import * as diskWin from '../native/diskWin'

function backend(): typeof diskMac {
  if (process.platform === 'darwin') return diskMac
  if (process.platform === 'win32') return diskWin as unknown as typeof diskMac
  throw new Error(`Unsupported platform: ${process.platform}`)
}

export function registerDiskIpc(ipcMain: IpcMain): void {
  ipcMain.handle('disk:list', async (): Promise<DiskDevice[]> => {
    try {
      return await backend().listDrives()
    } catch {
      return []
    }
  })

  ipcMain.handle('disk:format', async (event, deviceId: string): Promise<FormatResult> => {
    const send = (line: string): void => {
      ;(event.sender as WebContents).send('task:log', line)
    }

    // Re-validate against a fresh scan right before formatting - the
    // renderer's picker state could be stale (card swapped, unplugged and
    // replugged as a different device). Nothing gets formatted unless it
    // reappears in this same scan, removable, and under the size cap.
    const drives = await backend().listDrives()
    const target = drives.find((d) => d.id === deviceId)

    if (!target) {
      return { ok: false, mountPath: null, error: 'That drive is no longer detected. Reselect your card and try again.' }
    }
    if (!target.removable) {
      return { ok: false, mountPath: null, error: 'Refusing to format a non-removable drive.' }
    }
    if (target.sizeGb > MAX_DRIVE_SIZE_GB) {
      return { ok: false, mountPath: null, error: `Refusing to format a drive over ${MAX_DRIVE_SIZE_GB} GB.` }
    }

    return backend().formatDrive(deviceId, VOLUME_LABEL, send)
  })

  ipcMain.handle('disk:eject', async (_event, deviceId: string): Promise<{ ok: boolean; error?: string }> => {
    return backend().ejectDrive(deviceId)
  })
}
