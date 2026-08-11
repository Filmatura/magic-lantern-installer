import type { DiskDevice } from '@shared/diskTypes'
import type { BuildDefinition } from '@shared/builds'

export type MediaSpec =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'video'; src: string; poster?: string }

export interface QuestionOption {
  label: string
  description?: string
  goto: string
  setState?: Partial<FlowStateValues>
  tone?: 'default' | 'primary'
}

export type AutoActionKey = 'format-and-flash-firmware' | 'install-magic-lantern'

export interface AutoSubStep {
  id: string
  label: string
}

interface StepDefBase {
  id: string
  eyebrow?: string
  title: string
  subtitle?: string
  media?: MediaSpec
  next?: string
  /** Hide this step from the visible progress count (branch/retry loops). */
  hideFromProgress?: boolean
}

export interface WelcomeStep extends StepDefBase {
  type: 'welcome'
}

export interface RecommendedProduct {
  rank: number
  name: string
  note?: string
  /** Key into the step renderer's image map - see ChecklistStep.tsx. */
  image: string
}

export interface ChecklistStep extends StepDefBase {
  type: 'checklist'
  items: string[]
  cta?: string
  recommendations?: {
    title: string
    note?: string
    products: RecommendedProduct[]
  }
}

export interface InfoStep extends StepDefBase {
  type: 'info'
  body?: string[]
  note?: { tone: 'warning' | 'info'; text: string }
  cta?: string
  /** A muted secondary button next to the main cta, e.g. "I'm having trouble" branching to a troubleshooting step. */
  secondaryAction?: { label: string; goto: string }
}

export interface QuestionStep extends StepDefBase {
  type: 'question'
  options: QuestionOption[]
}

export interface AutoStep extends StepDefBase {
  type: 'auto'
  action: AutoActionKey
  destructive?: boolean
  confirmCopy?: string
  /** Rendered as a numbered checklist, each ticking off in sequence as it completes. */
  subSteps: AutoSubStep[]
  successCopy?: string
}

export type DriveOption = DiskDevice

export interface DrivePickerStep extends StepDefBase {
  type: 'drive-picker'
  /** Drives above this size are shown disabled, as a guardrail against ever touching a system/internal drive. */
  maxSizeGb: number
  /** Selected drives outside this size range get a "not one of the recommended cards" warning. */
  recommendedSizeRangeGb: [number, number]
  /**
   * Forces a blank selection even if `selectedDrive` is already set - for
   * re-picking after the card left the computer (e.g. for the camera
   * firmware flash). Disk identifiers aren't stable across a physical
   * eject/reinsert cycle, so a different drive could coincidentally get
   * reassigned the same id; pre-selecting the stale one would let that
   * pass unnoticed. Forcing a conscious re-pick closes that gap.
   */
  clearPriorSelection?: boolean
}

export type BuildOption = BuildDefinition

export interface BuildPickerStep extends StepDefBase {
  type: 'build-picker'
  options: BuildOption[]
}

export interface OutroStep extends StepDefBase {
  type: 'outro'
  /** Full thank-you paragraph. Each `credits[].name` that appears in this text gets turned into a link automatically. */
  thanksCopy: string
  credits: { name: string; url: string }[]
  socialLinks: { platform: SocialPlatform; url: string }[]
  links: { label: string; url: string; description?: string }[]
}

export type SocialPlatform = 'website' | 'youtube' | 'instagram' | 'discord' | 'github'

export interface TroubleshootIssue {
  title: string
  description: string
}

export interface TroubleshootStep extends StepDefBase {
  type: 'troubleshoot'
  issues: TroubleshootIssue[]
  /** Community links shown as buttons, e.g. Discord/Facebook group, for people who need more help than the FAQ. */
  communityLinks: { label: string; url: string }[]
}

export type StepDef =
  | WelcomeStep
  | ChecklistStep
  | InfoStep
  | QuestionStep
  | AutoStep
  | DrivePickerStep
  | BuildPickerStep
  | TroubleshootStep
  | OutroStep

export interface FlowStateValues {
  firmwareReady: boolean | null
  /** The full device, not just an id - real drives can come and go, so there's nothing to look them back up in. */
  selectedDrive: DriveOption | null
  /** Defaults to the recommended build - unlike the drive/logo pickers, there's a clear right answer here. */
  selectedBuildId: string
  offlineMode: boolean
  /** Filled in once the install step actually runs - drives the outro summary. */
  mlVersion: string | null
  mlBuildName: string | null
}

export interface LogEntry {
  id: string
  time: string
  text: string
  tone: 'default' | 'success' | 'error'
}
