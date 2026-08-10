import { getBuildOption } from '@shared/builds'
import { FAKE_DRIVE_ID } from '@shared/diskTypes'
import type { AutoActionKey, DriveOption, FlowStateValues, LogEntry } from '@renderer/flow/types'
import { fetchLatestBuild, type LatestBuildInfo } from './github'

export interface ActionContext {
  log: (text: string, tone?: LogEntry['tone']) => void
  offlineMode: boolean
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Fetched proactively, before the user even confirms the install, so they
 * can see what version they're about to get. Returns null on any failure
 * (no internet, no release found, offline mode, or no repo to check) -
 * callers treat that as "nothing available" since there's no offline
 * bundled copy for the remote builds specifically (the other two builds
 * are bundled and need no fetch at all - see runSubStep).
 */
export async function previewLatestBuild(offlineMode: boolean, repo: string | undefined): Promise<LatestBuildInfo | null> {
  if (offlineMode || !repo) return null
  try {
    return await fetchLatestBuild(repo)
  } catch {
    return null
  }
}

/** Carries state between sub-steps within a single run (e.g. where the download landed, for the copy step to use). */
export interface RunCarry {
  extractedDir?: string
}

/**
 * Format, Canon firmware copy, and Magic Lantern download/copy are all
 * real - they call through to the main process (disk.ts / ml.ts /
 * firmware.ts) which does actual, careful, guarded disk I/O.
 *
 * The one exception: the dev-mode fake card (FAKE_DRIVE_ID). Every branch
 * below checks for it first and simulates instead - this is what lets the
 * whole flow be clicked through with no real hardware attached, without
 * a single real-disk code path having to know or care that dev mode
 * exists.
 */
export async function runSubStep(
  action: AutoActionKey,
  subId: string,
  ctx: ActionContext,
  drive: DriveOption | null,
  buildId: string,
  preview: LatestBuildInfo | null,
  carry: RunCarry
): Promise<Partial<FlowStateValues> | void> {
  if (!drive) throw new Error('No card selected.')
  const fake = drive.id === FAKE_DRIVE_ID

  if (action === 'format-and-flash-firmware') {
    if (subId === 'format') {
      return formatDrive(drive, ctx, fake)
    }
    if (subId === 'flash') {
      if (fake) {
        ctx.log('Copying EOSM1202.FIR to card... (simulated)')
        await wait(500)
        ctx.log('Canon firmware copied to card.', 'success')
        return
      }
      ctx.log('Copying EOSM1202.FIR to card...')
      const result = await window.api.firmware.installToDrive(drive.id)
      if (!result.ok) throw new Error(result.error ?? 'Firmware copy failed.')
      ctx.log('Canon firmware copied to card.', 'success')
      return
    }
    if (subId === 'eject') {
      return ejectDrive(drive, ctx, fake)
    }
  }

  if (action === 'install-magic-lantern') {
    if (subId === 'download') {
      const build = getBuildOption(buildId)
      if (!build) throw new Error(`Unknown build: ${buildId}`)

      if (fake) {
        ctx.log(`Using bundled build: ${build.label} (simulated)`)
        await wait(500)
        carry.extractedDir = 'FAKE_DEV_SOURCE'
        return { mlVersion: build.source === 'remote' ? 'Simulated' : 'Bundled with app', mlBuildName: build.label }
      }

      if (build.source === 'bundled') {
        ctx.log(`Using bundled build: ${build.label}`)
        const result = await window.api.ml.resolveBundledBuild(build.id)
        if (!result.ok || !result.dir) throw new Error(result.error ?? 'Bundled build not found.')
        carry.extractedDir = result.dir
        return { mlVersion: 'Bundled with app', mlBuildName: build.label }
      }

      if (!preview) {
        throw new Error("No build available - couldn't reach GitHub, and there's no offline copy bundled yet.")
      }
      ctx.log(`Downloading ${preview.zipName}...`)
      const result = await window.api.ml.downloadAndExtract(preview.zipUrl, preview.zipName)
      if (!result.ok || !result.extractedDir) throw new Error(result.error ?? 'Download failed.')
      carry.extractedDir = result.extractedDir
      return { mlVersion: preview.version, mlBuildName: preview.zipName }
    }
    if (subId === 'format') {
      return formatDrive(drive, ctx, fake)
    }
    if (subId === 'copy') {
      if (!carry.extractedDir) throw new Error('Nothing downloaded to copy yet.')
      if (fake) {
        ctx.log(`Copying files to ${drive.name}... (simulated)`)
        await wait(600)
        ctx.log('Copy complete.', 'success')
        return
      }
      ctx.log(`Copying files to ${drive.name}...`)
      const result = await window.api.ml.copyToDrive(carry.extractedDir, drive.id)
      if (!result.ok) throw new Error(result.error ?? 'Copy failed.')
      ctx.log('Copy complete.', 'success')
      return
    }
    if (subId === 'eject') {
      return ejectDrive(drive, ctx, fake)
    }
  }
}

/**
 * Ejects and then waits for the card to be verifiably, physically gone
 * before resolving - not just for the eject command to succeed. Folded in
 * as the last sub-step of both auto-install flows (rather than a separate
 * screen after) so "success" never shows, and Continue never appears,
 * until the card has actually been pulled - no chance of someone yanking
 * the card the moment they see it "done" only to hit a still-mounted
 * warning a screen later.
 */
async function ejectDrive(drive: DriveOption, ctx: ActionContext, fake: boolean): Promise<void> {
  if (fake) {
    ctx.log('Ejecting card... (simulated)')
    await wait(600)
    ctx.log('Card safely ejected.', 'success')
    return
  }

  ctx.log('Ejecting card...')
  const result = await window.api.disk.eject(drive.id)
  if (!result.ok) throw new Error(result.error ?? 'Eject failed.')

  ctx.log('Please remove the card now - waiting for it to be physically removed...')
  for (;;) {
    await wait(1000)
    const drives = await window.api.disk.list()
    if (!drives.some((d) => d.id === drive.id)) break
  }
  ctx.log('Card safely ejected.', 'success')
}

async function formatDrive(drive: DriveOption, ctx: ActionContext, fake: boolean): Promise<Partial<FlowStateValues>> {
  if (fake) {
    ctx.log(`Formatting ${drive.name} to exFAT... (simulated)`)
    await wait(700)
    ctx.log('Format complete.', 'success')
    return { selectedDrive: drive }
  }
  ctx.log(`Formatting ${drive.name} to exFAT...`)
  const result = await window.api.disk.format(drive.id)
  if (!result.ok) throw new Error(result.error ?? 'Format failed.')
  ctx.log('Format complete.', 'success')
  return { selectedDrive: { ...drive, mountPath: result.mountPath } }
}
