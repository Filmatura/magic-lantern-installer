import { readdir } from 'node:fs/promises'
import type { IpcMain, WebContents } from 'electron'
import type { CardContentCheck, DiskDevice, FormatResult } from '@shared/diskTypes'
import { MAX_DRIVE_SIZE_GB, MAX_DRIVE_SIZE_GB_OVERRIDE, VOLUME_LABEL } from '@shared/diskTypes'
import * as diskMac from '../native/diskMac'
import * as diskWin from '../native/diskWin'

// Junk entries various OSes leave on a card that shouldn't count as "real"
// content when deciding whether it looks empty or non-Canon.
const IGNORED_ENTRIES = new Set(['.trashes', '.fseventsd', '.spotlight-v100', '.ds_store', 'system volume information'])

function backend(): typeof diskMac {
  if (process.platform === 'darwin') return diskMac
  if (process.platform === 'win32') return diskWin as unknown as typeof diskMac
  throw new Error(`Unsupported platform: ${process.platform}`)
}

export function registerDiskIpc(ipcMain: IpcMain): void {
  ipcMain.handle('disk:list', async (_event, includeInternal?: boolean): Promise<DiskDevice[]> => {
    try {
      return await backend().listDrives(includeInternal)
    } catch {
      return []
    }
  })

  ipcMain.handle('disk:format', async (event, deviceId: string, override?: boolean): Promise<FormatResult> => {
    const send = (line: string): void => {
      ;(event.sender as WebContents).send('task:log', line)
    }

    // Re-validate against a fresh scan right before formatting - the
    // renderer's picker state could be stale (card swapped, unplugged and
    // replugged as a different device). Nothing gets formatted unless it
    // reappears in this same scan. `override` relaxes the removable/size
    // checks below (still capped, just a much higher one) for advanced
    // users, but listDrives() itself is what actually guarantees the boot
    // disk can never be `target` here - that exclusion is unconditional
    // and this handler has no way to bypass it.
    const drives = await backend().listDrives(override)
    const target = drives.find((d) => d.id === deviceId)

    if (!target) {
      return { ok: false, mountPath: null, error: 'That drive is no longer detected. Reselect your card and try again.' }
    }
    if (!override) {
      if (!target.removable) {
        return { ok: false, mountPath: null, error: 'Refusing to format a non-removable drive.' }
      }
      if (target.sizeGb > MAX_DRIVE_SIZE_GB) {
        return { ok: false, mountPath: null, error: `Refusing to format a drive over ${MAX_DRIVE_SIZE_GB} GB.` }
      }
    } else if (target.sizeGb > MAX_DRIVE_SIZE_GB_OVERRIDE) {
      return { ok: false, mountPath: null, error: `Refusing to format a drive over ${MAX_DRIVE_SIZE_GB_OVERRIDE} GB.` }
    }

    return backend().formatDrive(deviceId, VOLUME_LABEL, send, override)
  })

  ipcMain.handle('disk:eject', async (_event, deviceId: string): Promise<{ ok: boolean; error?: string }> => {
    return backend().ejectDrive(deviceId)
  })

  // Read-only, so this always widens the scan to include internal-media
  // drives rather than threading the picker's override flag through - there's
  // nothing here that can act on the card, only look at what's already on it.
  ipcMain.handle('disk:peekContents', async (_event, deviceId: string): Promise<CardContentCheck | null> => {
    const drives = await backend().listDrives(true)
    const target = drives.find((d) => d.id === deviceId)
    if (!target?.mountPath) return null
    try {
      const entries = (await readdir(target.mountPath)).filter((e) => !IGNORED_ENTRIES.has(e.toLowerCase()))
      if (entries.length === 0) return { empty: true, looksLikeCanon: true }
      const upper = entries.map((e) => e.toUpperCase())
      return { empty: false, looksLikeCanon: upper.includes('DCIM') && upper.includes('MISC') }
    } catch {
      return null
    }
  })
}
