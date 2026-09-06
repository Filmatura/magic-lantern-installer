import { mkdir, readFile, writeFile } from 'node:fs/promises'
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

/**
 * The firmware's boot-logo menu choice index, matching its current fixed
 * 6-option list: Filmatura=0, REVO=1, Rogue=2, Magic Lantern=3, M-Lite=4,
 * Custom=5. Only ever written when we're writing a user-uploaded logo, so
 * it's always this one value.
 */
const CUSTOM_LOGO_CHOICE = 5

/**
 * BOOTLOGO.DAT is a one-byte mirror of the choice, separate from
 * magic.cfg, because the boot splash renders before magic.cfg gets loaded
 * - magic.cfg alone can't influence what's shown at boot. Written to the
 * ML folder root (not the card root, where BOOTLOGO.BMP itself lives).
 */
async function writeBootLogoChoiceFile(mlDir: string): Promise<void> {
  await mkdir(mlDir, { recursive: true })
  await writeFile(join(mlDir, 'BOOTLOGO.DAT'), Buffer.from([CUSTOM_LOGO_CHOICE]))
}

/**
 * Not needed for the splash itself (BOOTLOGO.DAT drives that), but without
 * this the in-camera menu still shows the old choice until the user opens
 * it manually - looks like a bug even though the actual splash is already
 * showing the custom logo. Merges into any existing magic.cfg (the
 * standalone "just add a logo" path targets cards that already went
 * through a real camera boot and have a real settings file full of other
 * values - this must only touch the boot.logo line, never overwrite the
 * rest) rather than assuming a fresh file.
 */
async function writeMagicCfgBootLogo(mlDir: string): Promise<void> {
  const settingsDir = join(mlDir, 'SETTINGS')
  const cfgPath = join(settingsDir, 'magic.cfg')
  await mkdir(settingsDir, { recursive: true })

  let lines: string[] = []
  try {
    lines = (await readFile(cfgPath, 'utf-8')).split(/\r?\n/)
  } catch {
    lines = []
  }

  // Trailing blank line(s) from the source file's own final newline -
  // trimmed up front so appending doesn't leave a stray gap, and doesn't
  // resurface as a doubled-up blank line if the file already ended with one.
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

  const newLine = `boot.logo = ${CUSTOM_LOGO_CHOICE}`
  const existingIndex = lines.findIndex((l) => /^\s*boot\.logo\s*=/.test(l))
  if (existingIndex >= 0) {
    lines[existingIndex] = newLine
  } else {
    lines.push(newLine)
  }
  await writeFile(cfgPath, lines.join('\n') + '\n', 'utf-8')
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
      const mlDir = join(target.mountPath, 'ML')
      await writeBootLogoChoiceFile(mlDir)
      await writeMagicCfgBootLogo(mlDir)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })
}
