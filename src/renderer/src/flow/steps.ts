import { BUILD_OPTIONS } from '@shared/builds'
import firmwareUpdateVideo from '@renderer/assets/videos/firmware-update.mp4'
import shutterReleaseVideo from '@renderer/assets/videos/shutter-release-without-lens.mp4'
import magicLanternFlashVideo from '@renderer/assets/videos/magic-lantern-flash.mp4'
import magicLanternInfoVideo from '@renderer/assets/videos/magic-lantern-info.mp4'
import type { FlowStateValues, QuestionStep, StepDef } from './types'

/**
 * The entire install flow lives here as data. Reordering, inserting, or
 * branching a step means editing this array - no component code needs to
 * change. Every step's `next` is explicit so branches (firmware check,
 * retry loops) are easy to trace just by reading this file.
 *
 * For wording/copy edits, use /CONTENT.md instead of editing here directly
 * - it's the same content in plain-English document form, safe to edit
 * without touching flow logic. This file is the synced result.
 *
 * `media` is optional per step; drop in an image or video src at any time
 * and the step renderer will show it without further wiring.
 */
export const steps: StepDef[] = [
  {
    id: 'welcome',
    type: 'welcome',
    title: 'Magic Lantern Installer',
    subtitle: 'For Canon EOS M - by Filmatura',
    next: 'before-you-start'
  },
  {
    id: 'before-you-start',
    type: 'checklist',
    eyebrow: 'Before you start',
    title: "Let's get your gear ready",
    items: [
      'Use a fully charged, original Canon battery - not a third-party one.',
      'Grab a card reader and a SD card.'
    ],
    recommendations: {
      title: 'You need one of these two cards',
      note: "Other cards have a massive chance of not working properly. Use the 256GB Lexar or SanDisk above - no substitutes.",
      products: [
        { rank: 1, name: 'Lexar Professional SILVER PLUS 256GB', image: 'lexar-silver-plus' },
        { rank: 2, name: 'SanDisk Extreme PRO 256GB', image: 'sandisk-extreme-pro' }
      ]
    },
    cta: "I'm ready",
    next: 'enable-shutter-release'
  },
  {
    id: 'enable-shutter-release',
    type: 'info',
    eyebrow: 'On your camera',
    title: 'Enable release shutter without lens',
    media: { kind: 'video', src: shutterReleaseVideo },
    body: [
      'Turn on the camera and switch it to Photo mode (mode dial around the shutter button).',
      'Press MENU, go to Settings (rightmost wrench icon with 4 dots), scroll down to Custom Functions (C.Fn), and press OK.',
      'Press left once to get to page 7.',
      'Press OK to open the selection, choose Enable, then press OK again.'
    ],
    next: 'drive-picker'
  },
  {
    id: 'drive-picker',
    type: 'drive-picker',
    eyebrow: 'Your card',
    title: 'Select your SD card',
    subtitle: "We'll only ever write to this card - nothing else on your computer.",
    maxSizeGb: 256,
    recommendedSizeRangeGb: [230, 260],
    next: 'firmware-check'
  },
  {
    // Reached only via the "Advanced: change build" link on the Install
    // Magic Lantern screen, never through the main flow - hidden from
    // progress and not on any step's default `next` chain, so it can't
    // confuse anyone who doesn't go looking for it.
    id: 'choose-build',
    type: 'build-picker',
    hideFromProgress: true,
    eyebrow: 'Advanced',
    title: 'Choose your build',
    subtitle:
      "This is an advanced option most people should skip. Filmatura's Crop Mood is the recommended default - only pick one of the others if you specifically need what it offers.",
    options: BUILD_OPTIONS,
    next: 'install-magic-lantern'
  },
  {
    id: 'firmware-check',
    type: 'question',
    eyebrow: 'Firmware check',
    title: 'Is your EOS M already on Canon firmware 2.0.2?',
    subtitle:
      'Turn the mode dial to Photo mode, then check under the Canon menu wrench tab. Not sure? Pick "No / not sure" and we\'ll get you there safely.',
    options: [
      { label: "Yes, I'm on 2.0.2", goto: 'install-magic-lantern', setState: { firmwareReady: true }, tone: 'primary' },
      { label: 'No / not sure', goto: 'firmware-path-intro', setState: { firmwareReady: false } }
    ]
  },
  {
    id: 'firmware-path-intro',
    type: 'info',
    eyebrow: 'Canon firmware 2.0.2',
    title: "We'll prep your card with the right Canon firmware",
    body: [
      'Insert your SD card into your reader.',
      'Magic Lantern requires Canon firmware 2.0.2 exactly. We\'ll format your SD card and load the official 2.0.2 firmware onto it automatically - nothing to download or configure yourself.',
      "If your camera is on a different firmware version, don't worry: this won't brick anything. Worst case is a harmless error screen you clear by pulling the battery."
    ],
    cta: 'Continue',
    next: 'format-and-flash-firmware'
  },
  {
    id: 'format-and-flash-firmware',
    type: 'auto',
    eyebrow: 'Automatic',
    title: 'Format your card and add Canon firmware',
    subtitle: "We'll format to exFAT, then copy the 2.0.2 firmware onto it.",
    action: 'format-and-flash-firmware',
    destructive: true,
    confirmCopy: 'This erases everything currently on the card. Hold for 3 seconds to confirm.',
    subSteps: [
      { id: 'format', label: 'Format SD card' },
      { id: 'flash', label: 'Copy Canon firmware' },
      { id: 'eject', label: 'Eject card' }
    ],
    successCopy: 'Card formatted, Canon firmware ready, and safely ejected.',
    next: 'install-canon-firmware-guided'
  },
  {
    id: 'install-canon-firmware-guided',
    type: 'info',
    eyebrow: 'On your camera',
    title: 'Run the Canon firmware update',
    media: { kind: 'video', src: firmwareUpdateVideo },
    body: [
      'Put the card we just flashed into your EOS M.',
      'Turn on the camera.',
      'Press MENU to go to Settings, rightmost wrench icon with 4 dots, scroll down to "Firmware Ver.:", select EOSM1202.FIR and press OK, then select it again and press OK again.',
      'Wait for the confirmation screen, then press OK and restart the camera.'
    ],
    cta: "I've updated the firmware",
    next: 'firmware-confirm'
  },
  {
    id: 'firmware-confirm',
    type: 'question',
    title: 'Does your camera now show firmware 2.0.2?',
    hideFromProgress: true,
    // No setState here on purpose - `firmwareReady` is what marks this
    // user as being on the long branch for progress-bar purposes
    // (see resolveDefaultNext below). Flipping it back to true here once
    // confirmed would make computeVisiblePath think we're back on the
    // short 8-step path even though we're deep in the long one, freezing
    // the progress bar at a stale "8/8" for the rest of the flow.
    options: [
      { label: 'Yes, confirmed', goto: 'reselect-drive', tone: 'primary' },
      { label: 'Something went wrong', goto: 'firmware-path-intro' }
    ]
  },
  {
    // The card physically left the computer for the firmware flash (eject
    // -> camera -> reinsert), and disk identifiers aren't stable across
    // that round-trip - a different drive could coincidentally get
    // reassigned the same id the original card had. Forcing a fresh,
    // blank re-pick here (clearPriorSelection) closes that gap instead of
    // silently trusting a stale selection.
    id: 'reselect-drive',
    type: 'drive-picker',
    eyebrow: 'One more check',
    title: 'Reselect your card',
    subtitle:
      "Turn off the camera, take out the SD card, and put it back in your reader. Your card just went through the camera for the firmware update, so its listing may have changed - pick it again to make sure we've got the right one before we format anything.",
    maxSizeGb: 256,
    recommendedSizeRangeGb: [230, 260],
    clearPriorSelection: true,
    next: 'install-magic-lantern'
  },
  {
    id: 'install-magic-lantern',
    type: 'auto',
    eyebrow: 'Magic Lantern - automatic',
    title: 'Install Magic Lantern',
    subtitle: "We'll get your chosen build ready, format your card, and copy everything over - all in one go.",
    action: 'install-magic-lantern',
    destructive: true,
    confirmCopy: 'This erases everything currently on the card. Hold for 3 seconds to confirm.',
    subSteps: [
      { id: 'download', label: 'Prepare Magic Lantern build' },
      { id: 'format', label: 'Format SD card' },
      { id: 'copy', label: 'Copy files to card' },
      { id: 'eject', label: 'Eject card' }
    ],
    successCopy: 'Magic Lantern is installed and safely ejected.',
    next: 'camera-prep'
  },
  {
    id: 'camera-prep',
    type: 'info',
    eyebrow: 'On your camera',
    title: 'Prep the camera',
    media: { kind: 'video', src: magicLanternFlashVideo },
    body: [
      'Insert the SD card we just installed Magic Lantern on.',
      'Turn on the camera, and rotate the mode dial (around the shutter button) to Photo mode.',
      'Go to Settings, rightmost wrench icon with 4 dots, scroll down to "Firmware ver.: 2.0.2", press OK, then press OK again and wait a couple seconds. Magic Lantern will now install.',
      'When prompted, restart your camera. You will now boot into Magic Lantern.'
    ],
    cta: 'Continue',
    next: 'first-boot'
  },
  {
    id: 'first-boot',
    type: 'info',
    eyebrow: 'First boot',
    title: 'Boot into Magic Lantern',
    media: { kind: 'video', src: magicLanternInfoVideo },
    body: [
      'Rotate the mode dial (around the shutter button) to Video mode.',
      'Turn on the camera.',
      'Press the INFO button once to switch to the Magic Lantern overlay.',
      'Hold the Down (Trashcan) button to access Magic Lantern menus.',
      'Press OK to hide the disclaimer.',
      "You're now ready to go!"
    ],
    cta: "I'm in Magic Lantern",
    secondaryAction: { label: "I'm having trouble", goto: 'troubleshoot' },
    next: 'outro'
  },
  {
    id: 'troubleshoot',
    type: 'troubleshoot',
    hideFromProgress: true,
    eyebrow: 'Troubleshooting',
    title: "Let's get this sorted",
    subtitle: "Here are the most common issues at this stage. If none of these fix it, chat with a real person using the button in the corner.",
    issues: [
      {
        title: "Camera won't boot into Magic Lantern",
        description:
          'Double check you selected exactly "Firmware ver.: 2.0.2" in the Settings menu and pressed OK twice. If the screen just shows the normal Canon menu, the card may not have Magic Lantern\'s files at its root - try the install again from the beginning.'
      },
      {
        title: "Card isn't recognized by the camera at all",
        description:
          'This is almost always the card itself. Use a Lexar Professional SILVER PLUS 256GB or SanDisk Extreme PRO 256GB - other cards have a high chance of not working, even if they work fine in a computer.'
      },
      {
        title: 'Camera shows a firmware update error screen',
        description:
          "This won't damage the camera. Remove the battery for about 10 seconds, put it back in, and try the firmware update step again."
      },
      {
        title: "Magic Lantern menu doesn't appear after boot",
        description:
          'Make sure the mode dial is on Photo mode, not a video mode. Then in LiveView, press INFO/DISP a few times until a footer bar with audio levels shows up, and press DELETE to open the ML menu.'
      }
    ],
    communityLinks: [
      { label: 'Join our Discord', url: 'https://discord.gg/CBtwJfUm3p' },
      { label: 'Join our Facebook group', url: 'https://www.facebook.com/groups/filmatura' }
    ],
    next: 'first-boot'
  },
  {
    // Reached only via the discreet "Quick Mode" link on the welcome
    // screen - never through the main `next` chain, so it's naturally
    // excluded from computeVisiblePath (no progress tracking) and marked
    // bareChrome (no header at all) to match: no guided steps, no tips,
    // just pick a card and go.
    id: 'quick-mode-drive-picker',
    type: 'drive-picker',
    bareChrome: true,
    hideFromProgress: true,
    eyebrow: 'Quick Mode',
    title: 'Select your SD card',
    subtitle: "We'll only ever write to this card - nothing else on your computer.",
    maxSizeGb: 256,
    recommendedSizeRangeGb: [230, 260],
    next: 'quick-mode-install'
  },
  {
    id: 'quick-mode-install',
    type: 'auto',
    bareChrome: true,
    hideFromProgress: true,
    eyebrow: 'Quick Mode - automatic',
    title: 'Install Magic Lantern',
    subtitle: "We'll download the latest build, format your card, and copy everything over - all in one go.",
    action: 'install-magic-lantern',
    destructive: true,
    confirmCopy: 'This erases everything currently on the card. Hold for 3 seconds to confirm.',
    allowBuildChange: false,
    subSteps: [
      { id: 'download', label: 'Prepare Magic Lantern build' },
      { id: 'format', label: 'Format SD card' },
      { id: 'copy', label: 'Copy files to card' },
      { id: 'eject', label: 'Eject card' }
    ],
    successCopy: 'Magic Lantern is installed and safely ejected.',
    next: 'outro'
  },
  {
    id: 'outro',
    type: 'outro',
    title: "You're all set.",
    thanksCopy:
      "Massive thank you to Bilal, Danne and Amit for paving the way for Magic Lantern on the EOS M to become what it is today. And of course the incredible Magic Lantern devs for years and years of hard work! We wouldn't have been here without you, Thank you!",
    credits: [
      { name: 'Bilal', url: 'https://www.magiclantern.fm/forum/index.php?topic=26851.0' },
      { name: 'Danne', url: 'https://www.magiclantern.fm/forum/index.php?topic=27084.25' },
      { name: 'Amit', url: 'https://github.com/Amit199167' },
      { name: 'Magic Lantern devs', url: 'https://www.magiclantern.fm/' }
    ],
    socialLinks: [
      { platform: 'website', url: 'https://filmatura.com' },
      { platform: 'youtube', url: 'https://www.youtube.com/@Filmatura' },
      { platform: 'instagram', url: 'https://www.instagram.com/filmatura_cinema/' },
      { platform: 'discord', url: 'https://discord.gg/CBtwJfUm3p' },
      { platform: 'github', url: 'https://github.com/Filmatura' }
    ],
    links: [
      {
        label: 'Explore M-Lite REVO',
        url: 'https://filmatura.com/collections/m-lite',
        description: 'Rigging built for run-and-gun EOS M shooters.'
      },
      {
        label: 'Explore EOS M gear',
        url: 'https://filmatura.com/collections/eos-m',
        description: 'Everything Filmatura makes for your camera.'
      }
    ]
  }
]

const byId = new Map(steps.map((step) => [step.id, step]))

export function getStep(id: string): StepDef {
  const step = byId.get(id)
  if (!step) throw new Error(`Unknown step id: ${id}`)
  return step
}

/**
 * For progress counting only: questions branch, so "how many steps total"
 * depends on answers we may not have yet. Until the firmware question is
 * answered we assume the short (already-on-2.0.2) path - the moment the
 * user says "No / not sure", the branch steps join the count.
 */
function resolveDefaultNext(step: QuestionStep, values: FlowStateValues): string | undefined {
  if (step.id === 'firmware-check') {
    return values.firmwareReady === false ? 'firmware-path-intro' : 'install-magic-lantern'
  }
  if (step.id === 'firmware-confirm') {
    return 'reselect-drive'
  }
  return step.options[0]?.goto
}

/** Ordered ids of every non-hidden step the user will pass through, given what we know so far. */
export function computeVisiblePath(values: FlowStateValues): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  let current: StepDef | undefined = steps[0]

  while (current && current.type !== 'outro') {
    if (seen.has(current.id)) break
    seen.add(current.id)
    if (!current.hideFromProgress) ids.push(current.id)

    const nextId: string | undefined = current.type === 'question' ? resolveDefaultNext(current, values) : current.next
    current = nextId ? byId.get(nextId) : undefined
  }

  return ids
}
