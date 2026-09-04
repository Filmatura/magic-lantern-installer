import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { DiskDevice, FormatResult } from '@shared/diskTypes'

const execFileAsync = promisify(execFile)

async function run(cmd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(cmd, args, { timeout: 20_000 })
  return stdout
}

function parseInfoField(text: string, label: string): string | null {
  // diskutil indents every field ("   Device / Media Name:       Mass-Storage"),
  // so the label is never at true column 0 - allow leading whitespace.
  const re = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(.+)$`, 'm')
  const match = text.match(re)
  return match ? match[1].trim() : null
}

function parseSizeBytes(sizeLine: string | null): number {
  if (!sizeLine) return 0
  // e.g. "31.9 GB (31914983424 Bytes) (exactly 62333952 512-Byte-Units)"
  const match = sizeLine.match(/\((\d+)\s*Bytes\)/)
  return match ? Number(match[1]) : 0
}

/**
 * `diskutil list` blocks look like:
 *   /dev/disk4 (external, physical):
 *      #:  TYPE            NAME       SIZE      IDENTIFIER
 *      0:  FDisk_partition_scheme    *31.9 GB   disk4
 *      1:  DOS_FAT_32      UNTITLED   31.9 GB    disk4s1
 * The whole disk (disk4) is what eraseDisk targets and has no mount point
 * of its own - the actual filesystem (and its mount point) lives on the
 * partition (disk4s1). Scheme rows always come first, so the last
 * `diskNsM` identifier in a disk's block is its data partition.
 */
function findPartitionId(listOut: string, diskId: string): string | null {
  const blocks = listOut.split(/\n(?=\/dev\/)/)
  const block = blocks.find((b) => b.startsWith(`/dev/${diskId} `))
  if (!block) return null
  const partitionIds = [...block.matchAll(new RegExp(`\\b(${diskId}s\\d+)\\b`, 'g'))].map((m) => m[1])
  return partitionIds.length > 0 ? partitionIds[partitionIds.length - 1] : null
}

async function describeDisk(listOut: string, diskId: string): Promise<DiskDevice | null> {
  try {
    const info = await run('diskutil', ['info', `/dev/${diskId}`])
    const sizeBytes = parseSizeBytes(parseInfoField(info, 'Disk Size'))
    const removableRaw = parseInfoField(info, 'Removable Media')
    const removable = removableRaw ? /removable/i.test(removableRaw) : true
    const protocol = parseInfoField(info, 'Protocol') ?? 'External'

    // The whole disk's own "Device / Media Name" is a generic bus
    // descriptor ("Mass-Storage"), not the label the user actually put on
    // the card. The partition's Volume Name is the recognizable one, so
    // prefer it - and its Mount Point, since the whole disk never has one.
    let name = parseInfoField(info, 'Device / Media Name') ?? diskId
    let mountPath = parseInfoField(info, 'Mount Point')

    const partitionId = findPartitionId(listOut, diskId)
    if (partitionId) {
      try {
        const partitionInfo = await run('diskutil', ['info', `/dev/${partitionId}`])
        const volumeName = parseInfoField(partitionInfo, 'Volume Name')
        if (volumeName && !/not applicable/i.test(volumeName)) name = volumeName
        mountPath = mountPath ?? parseInfoField(partitionInfo, 'Mount Point')
      } catch {
        // Partition might not be mountable (still initializing) - keep whole-disk info.
      }
    }

    return {
      id: `/dev/${diskId}`,
      name,
      sizeGb: Math.round((sizeBytes / 1e9) * 10) / 10,
      removable,
      mountPath: mountPath && mountPath.length > 0 ? mountPath : null,
      kind: protocol
    }
  } catch {
    return null
  }
}

/**
 * The physical disk backing the boot volume (e.g. "disk0") - resolved
 * fresh on every call rather than cached, and used to exclude the system
 * disk explicitly and unconditionally in listDrives(), independent of
 * whatever diskutil scope was queried. This is what actually guarantees
 * the boot disk is never returned in advanced/override mode - the
 * external/internal split alone isn't enough once internal disks are
 * back in scope.
 *
 * On APFS (the default since macOS 10.13, i.e. virtually every real Mac
 * this runs on), `diskutil info /`'s "Part of Whole" is the synthesized
 * APFS *container* id (e.g. "disk3"), not a physical disk - that
 * container never appears in `diskutil list physical` at all, so
 * comparing against it directly would silently never match anything and
 * defeat this exclusion entirely. The container's "APFS Physical Store"
 * field (e.g. "disk0s2") points at the real underlying partition, whose
 * own "Part of Whole" (e.g. "disk0") is the actual physical whole-disk id
 * that shows up in listings. Verified this chain against a real APFS Mac.
 */
async function getBootDiskId(): Promise<string | null> {
  try {
    const rootInfo = await run('diskutil', ['info', '/'])
    const partOfWhole = parseInfoField(rootInfo, 'Part of Whole')
    if (!partOfWhole) return null

    const containerInfo = await run('diskutil', ['info', partOfWhole])
    const physicalStore = parseInfoField(containerInfo, 'APFS Physical Store')
    if (!physicalStore) return partOfWhole // Not APFS - already a physical disk id.

    const storeInfo = await run('diskutil', ['info', physicalStore])
    return parseInfoField(storeInfo, 'Part of Whole') ?? partOfWhole
  } catch {
    return null
  }
}

/**
 * Normally only ever queries `external, physical` disks - diskutil
 * structurally excludes the internal/system disk from this list, so there
 * is no code path here that can even see, let alone target, the machine's
 * boot drive.
 *
 * `includeInternal` (drive-picker's advanced override, for cards sitting
 * in a built-in reader that diskutil classifies as "internal" media even
 * though the card itself is removable) widens the query to
 * `diskutil list physical` - internal AND external. The boot disk is
 * excluded explicitly via getBootDiskId() in that case, as a second,
 * independent check on top of whatever diskutil itself reports - not
 * something the override flag can ever bypass.
 */
export async function listDrives(includeInternal = false): Promise<DiskDevice[]> {
  const bootDiskId = includeInternal ? await getBootDiskId() : null

  let listOut: string
  try {
    listOut = await run('diskutil', includeInternal ? ['list', 'physical'] : ['list', 'external', 'physical'])
  } catch {
    return []
  }

  const busPattern = includeInternal ? '(?:external|internal)' : 'external'
  const idPattern = new RegExp(`^\\/dev\\/(disk\\d+)\\s*\\(${busPattern}, physical\\):`, 'gm')
  const ids = [...listOut.matchAll(idPattern)].map((m) => m[1]).filter((id) => id !== bootDiskId)
  const drives: DiskDevice[] = []

  for (const id of ids) {
    const drive = await describeDisk(listOut, id)
    if (drive) drives.push(drive)
  }

  return drives
}

/**
 * Plain `diskutil eraseDisk`, pinned to MBR (not GPT). Byte-exact SD
 * Association formatting (specific cluster size / partition alignment)
 * turned out to be a dead end on macOS: the tools that support it
 * (fdisk -r, newfs_exfat -c) get "Operation not permitted" against real
 * external device nodes even running as full root - confirmed with a real
 * admin-elevation test against actual hardware, not just a permissions
 * guess. That's a SIP-level restriction that only exempts Apple's own
 * diskutil, not third-party code at any privilege level.
 *
 * MBR (vs the GPT that `eraseDisk` defaults to without an explicit scheme)
 * is what actually mattered: GPT is a structurally different partition
 * table camera firmware can't parse at all, which is what caused the
 * original failure. Cluster size / alignment are SD Association
 * *performance* recommendations for the card's wear-leveling, not
 * necessarily hard camera-compatibility requirements - this plain MBR
 * format is the pragmatic bet pending confirmation on real hardware.
 */
export async function formatDrive(
  deviceId: string,
  label: string,
  onLog: (line: string) => void,
  includeInternal = false
): Promise<FormatResult> {
  if (!/^\/dev\/disk\d+$/.test(deviceId)) {
    return { ok: false, mountPath: null, error: `Refusing to format unexpected device id: ${deviceId}` }
  }

  onLog(`Running: diskutil eraseDisk ExFAT ${label} MBR ${deviceId}`)
  try {
    await execFileAsync('diskutil', ['eraseDisk', 'ExFAT', label, 'MBR', deviceId], { timeout: 60_000 })
  } catch (err) {
    return { ok: false, mountPath: null, error: (err as Error).message }
  }

  const diskId = deviceId.replace('/dev/', '')
  // Must match the scope this drive was actually found under (same
  // reasoning as listDrives/ejectDrive elsewhere) - a card in a MacBook's
  // built-in SD slot is often classified "internal" by diskutil, so
  // polling only `external, physical` here would never see it mount *at
  // all*, no matter how long the wait, independently reproducing "never
  // remounted" regardless of the timeout below.
  const listArgs = includeInternal ? ['list', 'physical'] : ['list', 'external', 'physical']

  const checkMounted = async (): Promise<string | null> => {
    try {
      const listOut = await run('diskutil', listArgs)
      const drive = await describeDisk(listOut, diskId)
      return drive?.mountPath ?? null
    } catch {
      return null
    }
  }

  // eraseDisk remounts asynchronously most of the time, but real-world
  // testing surfaced two distinct failure modes this loop covers:
  //  1. Some cards/readers just take longer than the original 5s window -
  //     fixed by polling for up to 30s instead of giving up early.
  //  2. A MacBook's built-in SD slot specifically often doesn't auto-
  //     remount at all without an explicit nudge - its media-change
  //     signaling to diskarbitrationd is less reliable than USB mass
  //     storage's (confirmed via real testing: identical card fails
  //     repeatedly in the built-in slot, works immediately through a USB
  //     reader). Fixed by proactively retrying `diskutil mountDisk` every
  //     few seconds throughout the wait, rather than only as a one-shot
  //     last resort after the full 30s had already elapsed.
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const mountPath = await checkMounted()
    if (mountPath) return { ok: true, mountPath }

    if (i % 3 === 2) {
      try {
        await execFileAsync('diskutil', ['mountDisk', deviceId], { timeout: 10_000 })
      } catch {
        // Ignore - the next checkMounted() call above is the real signal,
        // this is just a nudge in case macOS didn't do it on its own.
      }
    }
  }

  return {
    ok: false,
    mountPath: null,
    error: 'Format completed but the card never remounted. Try removing and reinserting the card, or a different card/reader if this keeps happening.'
  }
}

/**
 * `diskutil eject` can transiently fail immediately after heavy write
 * activity - the filesystem is still settling even though the write itself
 * already completed - even though ejecting a moment later works fine. Real
 * testing surfaced this as macOS's own Spotlight/mdworker (CoreServices)
 * holding the volume open to index the files that were just copied onto
 * it, reported as "Unmount was dissented by PID ... CoreServices.framework"
 * - that can outlast a short retry window, so this one is longer (8
 * attempts, ~2s apart) to give indexing time to finish and let go on its
 * own instead of surfacing a false-positive error for something that was
 * never actually wrong.
 */
export async function ejectDrive(deviceId: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^\/dev\/disk\d+$/.test(deviceId)) {
    return { ok: false, error: `Refusing to eject unexpected device id: ${deviceId}` }
  }

  let lastError = ''
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      await execFileAsync('diskutil', ['eject', deviceId], { timeout: 30_000 })
      return { ok: true }
    } catch (err) {
      lastError = (err as Error).message
      // The device is simply gone already - most likely the user (or an
      // earlier attempt in this same loop) already ejected it manually
      // while this was retrying. The actual goal - the card being safe to
      // remove - is already true, so this isn't a real failure.
      if (/Failed to find disk|could not be found/i.test(lastError)) {
        return { ok: true }
      }
      if (attempt < 8) await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }
  return { ok: false, error: lastError }
}
