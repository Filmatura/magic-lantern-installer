import type { IpcMain, WebContents } from 'electron'
import { promises as fs, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DiskDevice } from '@shared/diskTypes'
import { MAX_DRIVE_SIZE_GB, FAKE_DRIVE_ID } from '@shared/diskTypes'
import * as diskMac from '../native/diskMac'
import * as diskWin from '../native/diskWin'

function backend(): typeof diskMac {
  if (process.platform === 'darwin') return diskMac
  if (process.platform === 'win32') return diskWin as unknown as typeof diskMac
  throw new Error(`Unsupported platform: ${process.platform}`)
}

const FIRMWARE_FILENAME = 'EOSM1202.FIR'

function resolveFirmwarePath(): string | null {
  const candidates = [
    join(process.cwd(), 'resources', 'firmware', FIRMWARE_FILENAME),
    join(process.resourcesPath ?? '', 'firmware', FIRMWARE_FILENAME)
  ]
  return candidates.find((p) => existsSync(p)) ?? null
}

interface CopyResult {
  ok: boolean
  error?: string
}

export function registerFirmwareIpc(ipcMain: IpcMain): void {
  ipcMain.handle('firmware:installToDrive', async (event, deviceId: string): Promise<CopyResult> => {
    const send = (line: string): void => {
      ;(event.sender as WebContents).send('task:log', line)
    }

    // The dev-mode fake card is handled entirely in the renderer (simulated,
    // never reaches here) - this guard is just defense in depth in case
    // that id ever did make it this far.
    if (deviceId === FAKE_DRIVE_ID) {
      return { ok: false, error: 'Refusing to write to the simulated dev card from the main process.' }
    }

    const firmwarePath = resolveFirmwarePath()
    if (!firmwarePath) return { ok: false, error: 'Canon firmware file not bundled with this app.' }

    let drives: DiskDevice[]
    try {
      drives = await backend().listDrives()
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
    const target = drives.find((d) => d.id === deviceId)
    if (!target) return { ok: false, error: 'That drive is no longer detected. Reselect your card and try again.' }
    if (!target.removable) return { ok: false, error: 'Refusing to write to a non-removable drive.' }
    if (target.sizeGb > MAX_DRIVE_SIZE_GB) return { ok: false, error: `Refusing to write to a drive over ${MAX_DRIVE_SIZE_GB} GB.` }
    if (!target.mountPath) return { ok: false, error: 'The card has no mount point - format it first.' }

    try {
      send(`Copying ${FIRMWARE_FILENAME} to ${target.mountPath}`)
      await fs.copyFile(firmwarePath, join(target.mountPath, FIRMWARE_FILENAME))
      send('Canon firmware copied to card.')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })
}
