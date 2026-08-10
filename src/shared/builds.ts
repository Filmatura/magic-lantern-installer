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
  /** Folder name under resources/builds/ - only set for source: 'bundled'. */
  bundledFolder?: string
}

export const BUILD_OPTIONS: BuildDefinition[] = [
  {
    id: 'amit',
    label: "Amit's Crop Mood Slim",
    description: 'The actively maintained build, downloaded fresh each time. Strongly recommended - the other two options are not actively maintained.',
    source: 'remote',
    recommended: true
  },
  {
    id: 'danne-tweaks',
    label: 'Crop Mood + Danne Tweaks (24fps fix)',
    description: "A community variant with a 24fps tweak layered on. Only use this if you specifically need that fix - Amit's build is recommended otherwise.",
    source: 'bundled',
    bundledFolder: 'danne-tweaks'
  },
  {
    id: 'crop-mood',
    label: 'Crop Mood',
    description: "An older community variant. Not actively maintained - Amit's build is strongly recommended instead.",
    source: 'bundled',
    bundledFolder: 'crop-mood'
  }
]

export function getBuildOption(id: string): BuildDefinition | undefined {
  return BUILD_OPTIONS.find((b) => b.id === id)
}
