# Magic Lantern Installer

A guided, no-nonsense installer for [Magic Lantern](https://www.magiclantern.fm/) on the Canon EOS M — by [Filmatura](https://filmatura.com). Walks you through preparing your SD card, flashing Canon firmware if needed, and copying Magic Lantern onto your camera, with plain-English steps and short video demos at each stage.

<p align="center">
  <a href="https://github.com/Filmatura/magic-lantern-installer/releases/latest">
    <img alt="Download latest release" src="https://img.shields.io/github/v/release/Filmatura/magic-lantern-installer?label=Download&style=for-the-badge">
  </a>
</p>

**[⬇ Download the latest version](https://github.com/Filmatura/magic-lantern-installer/releases/latest)** — click the link, then grab the file for your computer (macOS or Windows) under "Assets."

## What it does

- Checks your SD card and warns you before touching anything that isn't safe to format.
- Flashes the exact Canon firmware version (2.0.2) Magic Lantern needs, if your camera isn't already on it.
- Downloads and installs the latest Magic Lantern build onto your card.
- Walks you through the on-camera steps with short videos, not just text.
- A "Quick Mode" for advanced users who just want the newest build flashed with no hand-holding.

## Can't open it after downloading?

**macOS:** you'll likely see "*Magic Lantern Installer* can't be opened" (or, depending on your system language, something like *"nelze otevřít"*). This app isn't code-signed with a paid Apple Developer certificate yet, so macOS Gatekeeper blocks it the first time. To open it anyway:

1. Find the app in Finder (don't double-click it).
2. **Right-click (or Control-click) it → Open.**
3. Click **Open** again in the dialog that appears.

You only need to do this once per download - after that it opens normally.

**Windows:** you may see a blue "Windows protected your PC" SmartScreen screen, for the same reason (no paid code-signing certificate yet). Click **More info**, then **Run anyway**.

## Building blocks and credits

This tool installs pre-built Magic Lantern binaries - it doesn't modify Magic Lantern's own source. Four builds are available (pick under "Advanced: change build"):

| Build | Source | Maintainer |
|---|---|---|
| Filmatura's Crop Mood *(default)* | [Filmatura/crop-mood-filmatura](https://github.com/Filmatura/crop-mood-filmatura) | Filmatura, forked from Amit's build below |
| Amit's Crop Mood Slim | [Amit199167/Crop-mood-eosm-slim-gui](https://github.com/Amit199167/Crop-mood-eosm-slim-gui) | [Amit Kattal](https://github.com/Amit199167) |
| Crop Mood + Danne Tweaks | [Magic Lantern forum thread](https://www.magiclantern.fm/forum/index.php?topic=27084.25) | Danne |
| Crop Mood | [Magic Lantern forum thread](https://www.magiclantern.fm/forum/index.php?topic=26851.0) | Bilal |

Huge thanks to Bilal, Danne, and Amit for their work adapting Crop Mood for the EOS M, and to the [Magic Lantern](https://www.magiclantern.fm/) project and its contributors for the underlying firmware itself - none of this exists without their years of work.

### License

Magic Lantern (and every build distributed through this installer) is licensed under the **[GNU GPL v2](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html)**. Each build's own repository/thread (linked above) is the authoritative source for that build's code. This installer app is a separate, independent tool that only downloads and copies those builds onto your SD card - it doesn't link against or redistribute modified Magic Lantern source itself.

Magic Lantern is **unofficial, free/open-source software, not approved or endorsed by Canon**. Installing it may affect your warranty, and it is used entirely at your own risk. This installer and Filmatura are not affiliated with the official Magic Lantern project.

## For developers

```bash
npm install
npm run dev      # run in development
npm run dist     # build a local, unpublished package for testing
npm run release  # build and publish a GitHub release (needs GH_TOKEN)
```
