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
export async function formatDrive(deviceId: string, label: string, onLog: (line: string) => void): Promise<FormatResult> {
  if (!/^\/dev\/disk\d+$/.test(deviceId)) {
    return { ok: false, mountPath: null, error: `Refusing to format unexpected device id: ${deviceId}` }
  }

  onLog(`Running: diskutil eraseDisk ExFAT ${label} MBR ${deviceId}`)
  try {
    await execFileAsync('diskutil', ['eraseDisk', 'ExFAT', label, 'MBR', deviceId], { timeout: 60_000 })
  } catch (err) {
    return { ok: false, mountPath: null, error: (err as Error).message }
  }

  // eraseDisk remounts asynchronously - poll for the new mount point. Real-
  // world testing found the original 5-second window (10x500ms) too short
  // for some cards/readers under real load, surfacing as "Format completed
  // but the card never remounted" even though the format itself was fine
  // and it would have mounted a few seconds later. 30s is a lot more
  // generous; if it genuinely never mounts in that window something's
  // actually wrong (a specific problem card/reader combo, matching what
  // real testing found - the fix there was trying a different card).
  const diskId = deviceId.replace('/dev/', '')
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    try {
      const listOut = await run('diskutil', ['list', 'external', 'physical'])
      const drive = await describeDisk(listOut, diskId)
      if (drive?.mountPath) return { ok: true, mountPath: drive.mountPath }
    } catch {
      // keep polling
    }
  }

  // Last resort before giving up: the erase may have genuinely succeeded
  // without macOS auto-remounting it (as opposed to still being in
  // progress, which the polling above already covers) - try mounting it
  // explicitly once.
  try {
    await execFileAsync('diskutil', ['mountDisk', deviceId], { timeout: 15_000 })
    const listOut = await run('diskutil', ['list', 'external', 'physical'])
    const drive = await describeDisk(listOut, diskId)
    if (drive?.mountPath) return { ok: true, mountPath: drive.mountPath }
  } catch {
    // fall through to the error below
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
 * already completed - even though ejecting a moment later works fine.
 * Retrying here (instead of surfacing the first failure) avoids a
 * false-positive error flashing in the UI for something that was never
 * actually wrong.
 */
export async function ejectDrive(deviceId: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^\/dev\/disk\d+$/.test(deviceId)) {
    return { ok: false, error: `Refusing to eject unexpected device id: ${deviceId}` }
  }

  let lastError = ''
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await execFileAsync('diskutil', ['eject', deviceId], { timeout: 30_000 })
      return { ok: true }
    } catch (err) {
      lastError = (err as Error).message
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }
  return { ok: false, error: lastError }
}
