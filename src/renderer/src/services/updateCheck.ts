export interface UpdateManifest {
  version: string
  url: string
  notes?: string
}

/**
 * Points at wherever a small JSON file gets hosted - a Google Drive direct
 * download link, a GitHub raw file, anywhere static. Expected shape:
 * { "version": "0.2.0", "url": "https://...", "notes": "optional" }
 *
 * This is a placeholder until a real URL is chosen, so the fetch below is
 * expected to fail right now - checkForUpdate() treats any failure as
 * "no update available" rather than surfacing an error to the user.
 */
const UPDATE_MANIFEST_URL = 'https://example.com/magic-lantern-installer/version.json'

function isNewer(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number)
  const l = local.split('.').map(Number)
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] ?? 0
    const lv = l[i] ?? 0
    if (rv !== lv) return rv > lv
  }
  return false
}

export async function checkForUpdate(currentVersion: string): Promise<UpdateManifest | null> {
  try {
    const res = await fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as UpdateManifest
    if (data.version && isNewer(data.version, currentVersion)) return data
    return null
  } catch {
    return null
  }
}
