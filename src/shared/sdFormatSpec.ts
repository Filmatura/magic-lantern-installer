/**
 * SD Association-recommended formatting parameters, as implemented by the
 * official SD Memory Card Formatter and documented by exfatprogs' mkfs.exfat
 * (which republishes SD Association guidance). Camera firmware is built
 * against this table - generic OS format tools (diskutil, PowerShell
 * Format-Volume) use their own different defaults and produce cards some
 * cameras flatly refuse to recognize. Verified against a real 256GB SDXC
 * card: SD Card Formatter produced exactly the 128-512 GiB row below.
 *
 * Table starts at 2 GiB (FAT32 floor) since no camera SD card in practice
 * ships smaller than that - the sub-2GiB tiers in the full spec are omitted
 * as irrelevant here.
 */
export interface SdFormatParams {
  filesystem: 'fat32' | 'exfat'
  clusterBytes: number
  alignBytes: number
}

const GiB = 1024 ** 3
const MiB = 1024 ** 2
const KiB = 1024

const TABLE: Array<{ maxBytes: number } & SdFormatParams> = [
  { maxBytes: 32 * GiB, filesystem: 'fat32', clusterBytes: 32 * KiB, alignBytes: 4 * MiB },
  { maxBytes: 128 * GiB, filesystem: 'exfat', clusterBytes: 128 * KiB, alignBytes: 16 * MiB },
  { maxBytes: 512 * GiB, filesystem: 'exfat', clusterBytes: 256 * KiB, alignBytes: 32 * MiB },
  { maxBytes: 2 * 1024 * GiB, filesystem: 'exfat', clusterBytes: 512 * KiB, alignBytes: 64 * MiB }
]

export function getSdFormatParams(sizeBytes: number): SdFormatParams {
  const tier = TABLE.find((t) => sizeBytes <= t.maxBytes) ?? TABLE[TABLE.length - 1]
  return { filesystem: tier.filesystem, clusterBytes: tier.clusterBytes, alignBytes: tier.alignBytes }
}
