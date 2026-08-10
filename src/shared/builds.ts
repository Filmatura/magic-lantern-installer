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
}

export const BUILD_OPTIONS: BuildDefinition[] = [
  {
    id: 'filmatura',
    label: "Filmatura's Crop Mood",
    description: "Filmatura's actively maintained fork of Amit's Crop Mood Slim, downloaded fresh each time. Recommended for everyone.",
    source: 'remote',
    recommended: true,
    githubRepo: 'Filmatura/crop-mood-filmatura'
  },
  {
    id: 'amit',
    label: "Amit's Crop Mood Slim",
    description: "The original build this fork is based on, still actively maintained by Amit. Downloaded fresh each time.",
    source: 'remote',
    tagLabel: 'Actively maintained',
    githubRepo: 'Amit199167/Crop-mood-eosm-slim-gui'
  },
  {
    id: 'danne-tweaks',
    label: 'Crop Mood + Danne Tweaks (24fps fix)',
    description: "A community variant with a 24fps tweak layered on. Only use this if you specifically need that fix - Filmatura's build is recommended otherwise.",
    source: 'bundled',
    bundledFolder: 'danne-tweaks'
  },
  {
    id: 'crop-mood',
    label: 'Crop Mood',
    description: "An older community variant. Not actively maintained - Filmatura's build is strongly recommended instead.",
    source: 'bundled',
    bundledFolder: 'crop-mood'
  }
]

export function getBuildOption(id: string): BuildDefinition | undefined {
  return BUILD_OPTIONS.find((b) => b.id === id)
}
