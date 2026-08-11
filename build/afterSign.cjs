const { execFileSync } = require('node:child_process')
const path = require('node:path')

/**
 * electron-builder skips signing entirely when it finds no paid Apple
 * Developer ID certificate - not even a free ad-hoc signature. That means
 * the shipped app has "no usable signature" at all, which Gatekeeper
 * rejects outright for any downloaded (quarantined) copy, with no
 * right-click "Open anyway" override offered.
 *
 * Ad-hoc signing here is free and doesn't require a paid certificate, but
 * it does NOT fix that Gatekeeper rejection on its own (verified directly
 * against a real quarantined build - still rejected). It's still worth
 * doing: it's what "every executable needs a signature to run at all on
 * Apple Silicon" actually wants, and it's a strict improvement over
 * shipping literally unsigned. The real fix for downloaded copies is
 * either the user running `xattr -cr` (see README) or a paid Developer ID
 * + notarization.
 */
module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath])
  console.log(`[afterSign] ad-hoc signed: ${appPath}`)
}
