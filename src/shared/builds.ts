/**
 * The three installable Magic Lantern build options. Shared between the
 * renderer (picker UI) and main process (resolving bundled build files
 * safely - `bundledFolder` is validated against this exact list before
 * ever touching the filesystem, never taken as free-form input).
 */
export interface BuildDefinition {
  id: string
  label: string
  description: string
  /** 'remote' fetches the latest release from GitHub at install time; 'bundled' ships inside this app, no download needed. */
  source: 'remote' | 'bundled'
  recommended?: boolean
  /** Overrides the default "Not actively maintained" tag shown on non-recommended options - e.g. Amit's build is still maintained, just not the default. */
  tagLabel?: string
  /** Folder name under resources/builds/ - only set for source: 'bundled'. */
  bundledFolder?: string
  /** owner/repo on GitHub to fetch the latest release from - only set for source: 'remote'. */
  githubRepo?: string
  /** "Read more" link shown on the build's card - the original creator's repo/profile/forum thread. */
  moreInfoUrl?: string
}

export const BUILD_OPTIONS: BuildDefinition[] = [
  {
    id: 'filmatura',
    label: "Filmatura's Crop Mood",
    description:
      "Filmatura's actively maintained fork of Amit's Crop Mood Slim, downloaded fresh each time. Includes small visual tweaks and customisations. Recommended for everyone.",
    source: 'remote',
    recommended: true,
    githubRepo: 'Filmatura/crop-mood-filmatura',
    moreInfoUrl: 'https://github.com/Filmatura/crop-mood-filmatura'
  },
  {
    id: 'amit',
    label: "Amit's Crop Mood Slim",
    description: 'The original build this fork is based on, actively maintained by Amit. Downloaded fresh each time.',
    source: 'remote',
    tagLabel: 'Actively maintained',
    githubRepo: 'Amit199167/Crop-mood-eosm-slim-gui',
    moreInfoUrl: 'https://github.com/Amit199167'
  },
  {
    id: 'danne-tweaks',
    label: 'Crop Mood + Danne Tweaks (24fps fix)',
    description: "Danne's variant of Crop Mood with a 24fps fix. Only use this if you know what you're doing.",
    source: 'bundled',
    bundledFolder: 'danne-tweaks',
    moreInfoUrl: 'https://www.magiclantern.fm/forum/index.php?topic=27084.25'
  },
  {
    id: 'crop-mood',
    label: 'Crop Mood',
    description: "Bilal's original Crop Mood build for the EOS M. Only use this if you know what you're doing.",
    source: 'bundled',
    bundledFolder: 'crop-mood',
    moreInfoUrl: 'https://www.magiclantern.fm/forum/index.php?topic=26851.0'
  }
]

export function getBuildOption(id: string): BuildDefinition | undefined {
  return BUILD_OPTIONS.find((b) => b.id === id)
}
