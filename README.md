# Magic Lantern Installer

An installer for [Magic Lantern](https://www.magiclantern.fm/) on the Canon EOS M, by [Filmatura](https://filmatura.com). Handles the whole thing - SD card, Canon firmware if you need it, copying Magic Lantern over - with actual video demos instead of walls of text.

<p align="center">
  <a href="https://github.com/Filmatura/magic-lantern-installer/releases/latest">
    <img alt="Download latest release" src="https://img.shields.io/github/v/release/Filmatura/magic-lantern-installer?label=Download&style=for-the-badge">
  </a>
</p>

**[⬇ Grab the latest version here](https://github.com/Filmatura/magic-lantern-installer/releases/latest)** - click through, then pick the file for your computer under "Assets."

## What it does

- Won't let you touch a drive it's not safe to format
- Flashes Canon firmware 2.0.2 if your camera needs it
- Grabs the latest Magic Lantern build and puts it on your card
- Shows you what to do on the camera itself, with short videos - not just text
- Quick Mode if you already know what you're doing and just want it done, no hand-holding

## Getting a "can't be opened" error?

**Mac:** you'll probably see something like "Magic Lantern Installer can't be opened" (or "nelze otevřít" if your Mac's set to another language). It's not signed with a paid Apple developer certificate yet, so Gatekeeper blocks it the first time. Easy fix:

1. Find the app in Finder (don't double-click it)
2. Right-click (or Control-click) it → **Open**
3. Click **Open** again in the popup

Only need to do this once - opens normally after that.

**Windows:** you might get a blue "Windows protected your PC" screen, same reason - no paid cert yet. Hit **More info**, then **Run anyway**.

## Builds & credits

This just installs pre-built Magic Lantern binaries - doesn't touch the source itself. Four builds to pick from (under "Advanced: change build"):

| Build | Source | Maintainer |
|---|---|---|
| Filmatura's Crop Mood *(default)* | [Filmatura/crop-mood-filmatura](https://github.com/Filmatura/crop-mood-filmatura) | Filmatura, forked from Amit's build below |
| Amit's Crop Mood Slim | [Amit199167/Crop-mood-eosm-slim-gui](https://github.com/Amit199167/Crop-mood-eosm-slim-gui) | [Amit Kattal](https://github.com/Amit199167) |
| Crop Mood + Danne Tweaks | [Magic Lantern forum thread](https://www.magiclantern.fm/forum/index.php?topic=27084.25) | Danne |
| Crop Mood | [Magic Lantern forum thread](https://www.magiclantern.fm/forum/index.php?topic=26851.0) | Bilal |

Massive thanks to Bilal, Danne, and Amit for building these out for the EOS M, and to the [Magic Lantern](https://www.magiclantern.fm/) team for the firmware itself - none of this happens without their work.

### License

Magic Lantern (and every build listed here) is licensed under **[GNU GPL v2](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html)**. Each build's own repo/thread above is where the actual source lives. This installer is a separate tool - it just downloads and copies those builds onto your card, it doesn't touch or redistribute modified Magic Lantern source.

Magic Lantern is unofficial, free/open-source software - not made or approved by Canon. Installing it may affect your warranty, and it's entirely at your own risk. This installer and Filmatura aren't affiliated with the official Magic Lantern project.

## For developers

```bash
npm install
npm run dev      # run in development
npm run dist     # build a local, unpublished package for testing
npm run release  # build and publish a GitHub release (needs GH_TOKEN)
```
