import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { DiskDevice, FormatResult } from '@shared/diskTypes'

const execFileAsync = promisify(execFile)

async function runPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    timeout: 30_000,
    maxBuffer: 1024 * 1024
  })
  return stdout
}

interface PsDisk {
  Number: number
  FriendlyName: string
  Size: number
  BusType: string
}

async function findMountPath(diskNumber: number): Promise<string | null> {
  try {
    const raw = await runPowerShell(
      `Get-Partition -DiskNumber ${diskNumber} | Get-Volume | Select-Object DriveLetter | ConvertTo-Json`
    )
    if (!raw.trim()) return null
    const parsed = JSON.parse(raw)
    const letter = Array.isArray(parsed) ? parsed[0]?.DriveLetter : parsed?.DriveLetter
    return letter ? `${letter}:\\` : null
  } catch {
    return null
  }
}

/**
 * Filters to USB/SD bus type disks - Windows' internal boot disk is SATA/
 * NVMe/RAID, so it structurally never appears in this list. `-not $_.IsBoot
 * -and -not $_.IsSystem` is an explicit second, independent exclusion on
 * top of that bus-type filter (belt and suspenders, same approach as the
 * mac backend), and stays in effect even in `includeInternal` mode - that
 * mode only widens which bus types are eligible, never bypasses this.
 *
 * `includeInternal` (drive-picker's advanced override) drops the USB/SD
 * bus-type restriction entirely - for a card in a built-in reader that
 * Windows might report under a different bus type - relying solely on the
 * IsBoot/IsSystem check to keep the actual system disk out.
 *
 * Unverified: written against documented PowerShell cmdlet behavior, no
 * Windows machine was available to actually run this against real
 * hardware. Treat as a first draft that needs testing on a real PC before
 * being trusted with a real card.
 */
export async function listDrives(includeInternal = false): Promise<DiskDevice[]> {
  const busFilter = includeInternal ? '' : "($_.BusType -eq 'USB' -or $_.BusType -eq 'SD') -and "
  let raw: string
  try {
    raw = await runPowerShell(
      `Get-Disk | Where-Object { ${busFilter}-not $_.IsBoot -and -not $_.IsSystem } | Select-Object Number,FriendlyName,Size,BusType | ConvertTo-Json`
    )
  } catch {
    return []
  }
  if (!raw.trim()) return []

  const parsed = JSON.parse(raw)
  const disks: PsDisk[] = Array.isArray(parsed) ? parsed : [parsed]

  const drives: DiskDevice[] = []
  for (const disk of disks) {
    drives.push({
      id: String(disk.Number),
      name: disk.FriendlyName || `Disk ${disk.Number}`,
      sizeGb: Math.round((disk.Size / 1e9) * 10) / 10,
      removable: true,
      mountPath: await findMountPath(disk.Number),
      kind: disk.BusType
    })
  }

  return drives
}

// `includeInternal` is accepted for signature parity with diskMac.ts's
// formatDrive (which needs it to poll the right diskutil scope after
// erasing) - Windows' Format-Volume is synchronous, no post-format
// remount-polling exists here to need it.
export async function formatDrive(
  deviceId: string,
  label: string,
  onLog: (line: string) => void,
  includeInternal = false
): Promise<FormatResult> {
  if (!/^\d+$/.test(deviceId)) {
    return { ok: false, mountPath: null, error: `Refusing to format unexpected device id: ${deviceId}` }
  }
  if (!/^[A-Za-z0-9_ ]+$/.test(label)) {
    return { ok: false, mountPath: null, error: `Refusing to use unexpected volume label: ${label}` }
  }

  const cmd = `Get-Partition -DiskNumber ${deviceId} | Get-Volume | Format-Volume -FileSystem exFAT -NewFileSystemLabel "${label}" -Confirm:$false | Out-Null`
  onLog(`Running: ${cmd}`)
  try {
    await runPowerShell(cmd)
  } catch (err) {
    return { ok: false, mountPath: null, error: (err as Error).message }
  }

  const mountPath = await findMountPath(Number(deviceId))
  if (mountPath) return { ok: true, mountPath }
  return { ok: false, mountPath: null, error: 'Format completed but the drive letter could not be determined.' }
}

/**
 * Unverified, same as the rest of this file - no Windows machine available
 * to test against real hardware. Uses the well-known Shell.Application COM
 * "safely remove" trick since Windows has no simple first-party eject CLI
 * for removable USB/SD media.
 */
export async function ejectDrive(deviceId: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d+$/.test(deviceId)) {
    return { ok: false, error: `Refusing to eject unexpected device id: ${deviceId}` }
  }

  const mountPath = await findMountPath(Number(deviceId))
  if (!mountPath) return { ok: false, error: 'Could not determine a drive letter to eject.' }
  const letter = mountPath.replace(/:\\?$/, '')
  if (!/^[A-Za-z]$/.test(letter)) return { ok: false, error: `Unexpected drive letter: ${letter}` }

  const script = `$sh = New-Object -ComObject Shell.Application; $sh.Namespace(17).ParseName("${letter}:").InvokeVerb("Eject")`

  // Same reasoning as the mac path: retry before surfacing a failure - a
  // drive that just finished heavy write activity can transiently refuse
  // to eject even though it's perfectly safe a moment later.
  let lastError = ''
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await runPowerShell(script)
      return { ok: true }
    } catch (err) {
      lastError = (err as Error).message
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }
  return { ok: false, error: lastError }
}
