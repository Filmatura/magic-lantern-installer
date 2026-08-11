import { app, type IpcMain, type WebContents } from 'electron'
import { promises as fs, existsSync } from 'node:fs'
import { join } from 'node:path'
import AdmZip from 'adm-zip'
import type { DiskDevice } from '@shared/diskTypes'
import { MAX_DRIVE_SIZE_GB, MAX_DRIVE_SIZE_GB_OVERRIDE } from '@shared/diskTypes'
import { BUILD_OPTIONS } from '@shared/builds'
import * as diskMac from '../native/diskMac'
import * as diskWin from '../native/diskWin'

function backend(): typeof diskMac {
  if (process.platform === 'darwin') return diskMac
  if (process.platform === 'win32') return diskWin as unknown as typeof diskMac
  throw new Error(`Unsupported platform: ${process.platform}`)
}

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

/**
 * `buildId` is only ever matched against the fixed BUILD_OPTIONS list - it
 * never becomes a filesystem path directly, so a compromised/odd renderer
 * value can't be used to read arbitrary paths off the resources folder.
 */
function resolveBundledBuildDir(buildId: string): string | null {
  const build = BUILD_OPTIONS.find((b) => b.id === buildId && b.source === 'bundled' && b.bundledFolder)
  if (!build?.bundledFolder) return null

  const candidates = [
    join(process.cwd(), 'resources', 'builds', build.bundledFolder),
    join(process.resourcesPath ?? '', 'builds', build.bundledFolder)
  ]
  return candidates.find((p) => existsSync(p)) ?? null
}

/** If the zip wraps everything in one folder (a common convention), copy from inside it instead of copying the wrapper folder itself. */
async function resolveEffectiveRoot(dir: string): Promise<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = entries.filter((e) => e.isFile())
  const dirs = entries.filter((e) => e.isDirectory())
  if (files.length === 0 && dirs.length === 1) {
    return join(dir, dirs[0].name)
  }
  return dir
}

export function registerMlIpc(ipcMain: IpcMain): void {
  ipcMain.handle('ml:resolveBundledBuild', async (_event, buildId: string): Promise<BundledBuildResult> => {
    const dir = resolveBundledBuildDir(buildId)
    if (!dir) return { ok: false, dir: null, error: `Bundled build not found: ${buildId}` }
    return { ok: true, dir }
  })

  ipcMain.handle('ml:downloadAndExtract', async (event, zipUrl: string, zipName: string): Promise<DownloadResult> => {
    const send = (line: string): void => {
      ;(event.sender as WebContents).send('task:log', line)
    }

    try {
      const workDir = join(app.getPath('temp'), 'magic-lantern-installer', `dl-${Date.now()}`)
      await fs.mkdir(workDir, { recursive: true })
      const zipPath = join(workDir, zipName || 'magic-lantern.zip')

      send(`Downloading from ${zipUrl}`)
      const res = await fetch(zipUrl)
      if (!res.ok) {
        return { ok: false, extractedDir: null, error: `Download failed: HTTP ${res.status}` }
      }
      const buf = Buffer.from(await res.arrayBuffer())
      await fs.writeFile(zipPath, buf)
      send(`Downloaded ${(buf.byteLength / 1e6).toFixed(1)} MB`)

      const extractDir = join(workDir, 'extracted')
      await fs.mkdir(extractDir, { recursive: true })
      new AdmZip(zipPath).extractAllTo(extractDir, true)
      send('Extracted archive')

      const effectiveRoot = await resolveEffectiveRoot(extractDir)
      return { ok: true, extractedDir: effectiveRoot }
    } catch (err) {
      return { ok: false, extractedDir: null, error: (err as Error).message }
    }
  })

  ipcMain.handle('ml:copyToDrive', async (event, sourceDir: string, deviceId: string, override?: boolean): Promise<CopyResult> => {
    const send = (line: string): void => {
      ;(event.sender as WebContents).send('task:log', line)
    }

    // Same re-validation as format: only ever copy onto a drive that is
    // still detected and under the size cap right now. `override` relaxes
    // the removable/size checks (see disk.ts's disk:format handler for
    // the same pattern) but listDrives() unconditionally keeps the boot
    // disk out of `drives` regardless - nothing here can touch it.
    let drives: DiskDevice[]
    try {
      drives = await backend().listDrives(override)
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
    const target = drives.find((d) => d.id === deviceId)
    if (!target) return { ok: false, error: 'That drive is no longer detected. Reselect your card and try again.' }
    if (!override) {
      if (!target.removable) return { ok: false, error: 'Refusing to write to a non-removable drive.' }
      if (target.sizeGb > MAX_DRIVE_SIZE_GB) return { ok: false, error: `Refusing to write to a drive over ${MAX_DRIVE_SIZE_GB} GB.` }
    } else if (target.sizeGb > MAX_DRIVE_SIZE_GB_OVERRIDE) {
      return { ok: false, error: `Refusing to write to a drive over ${MAX_DRIVE_SIZE_GB_OVERRIDE} GB.` }
    }
    if (!target.mountPath) return { ok: false, error: 'The card has no mount point - format it first.' }

    try {
      send(`Copying files to ${target.mountPath}`)
      await fs.cp(sourceDir, target.mountPath, { recursive: true })
      send('Copy complete')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })
}
