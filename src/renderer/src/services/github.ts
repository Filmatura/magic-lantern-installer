export interface LatestBuildInfo {
  version: string
  zipUrl: string
  zipName: string
}

/**
 * Some of these repos (e.g. Amit's) don't attach formal release assets -
 * the actual .zip lives as a markdown link to a github user-attachments
 * file inside the release body. We check the assets array first (in case
 * that's ever used) and fall back to parsing the body.
 */
export async function fetchLatestBuild(repo: string): Promise<LatestBuildInfo> {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' }
  })
  if (!res.ok) throw new Error(`GitHub API responded ${res.status}`)
  const data = await res.json()

  const tag = data.tag_name as string
  const body = (data.body as string) ?? ''

  const asset = ((data.assets ?? []) as Array<{ browser_download_url: string; name: string }>).find((a) =>
    a.browser_download_url.endsWith('.zip')
  )
  if (asset) {
    return { version: tag, zipUrl: asset.browser_download_url, zipName: asset.name }
  }

  const match = body.match(/\[([^\]]+\.zip)]\((https:\/\/github\.com\/user-attachments\/files\/[^)]+)\)/)
  if (!match) throw new Error('No .zip link found in the latest release notes.')
  return { version: tag, zipUrl: match[2], zipName: match[1] }
}
