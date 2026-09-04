import { createRequire } from 'node:module'
import type { BootLogoPalette, BootLogoResult } from '@shared/bootLogoTypes'

const require = createRequire(import.meta.url)
const { Jimp, JimpMime } = require('jimp') as typeof import('jimp')

const WIDTH = 720
const HEIGHT = 480

interface PaletteEntry {
  index: number
  r: number
  g: number
  b: number
}

/**
 * The camera firmware's boot-splash overlay only understands these exact
 * color codes - the BMP color table is just for image viewers, the
 * firmware reads the raw pixel byte as its own index directly. 42-level
 * ramp, index 38 (black) through 79 (white); no dithering, each pixel's
 * luma maps independently to the nearest rung.
 */
const GRAYSCALE_PALETTE: PaletteEntry[] = Array.from({ length: 42 }, (_, k) => {
  const gray = Math.round((k * 255) / 41)
  return { index: 38 + k, r: gray, g: gray, b: gray }
})

/** The firmware's "Custom (15-Color Dither)" mode - 14 fixed colors at fixed indices, dithered against in RGB space. */
const DITHER_PALETTE: PaletteEntry[] = [
  { index: 2, r: 0, g: 0, b: 0 },
  { index: 44, r: 43, g: 43, b: 43 },
  { index: 51, r: 84, g: 84, b: 84 },
  { index: 58, r: 128, g: 128, b: 128 },
  { index: 65, r: 171, g: 171, b: 171 },
  { index: 72, r: 212, g: 212, b: 212 },
  { index: 1, r: 255, g: 255, b: 255 },
  { index: 8, r: 255, g: 0, b: 0 },
  { index: 7, r: 0, g: 180, b: 0 },
  { index: 11, r: 0, g: 0, b: 255 },
  { index: 5, r: 0, g: 255, b: 255 },
  { index: 14, r: 255, g: 0, b: 255 },
  { index: 15, r: 255, g: 255, b: 0 },
  { index: 19, r: 255, g: 140, b: 0 }
]

function paletteFor(palette: BootLogoPalette): PaletteEntry[] {
  return palette === 'grayscale' ? GRAYSCALE_PALETTE : DITHER_PALETTE
}

/** Luma quantized independently per pixel - the ramp is smooth enough that dithering would add noise, not quality. */
function quantizeGrayscale(rgba: Buffer): Uint8Array {
  const out = new Uint8Array(WIDTH * HEIGHT)
  for (let p = 0; p < out.length; p++) {
    const o = p * 4
    const luma = Math.round(0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2])
    out[p] = 38 + Math.floor((luma * 41) / 255)
  }
  return out
}

/**
 * Standard Floyd-Steinberg error diffusion in RGB space against the fixed
 * 14-color palette. Error buffers are float so accumulated error doesn't
 * get truncated away between passes.
 */
function quantizeDithered(rgba: Buffer, palette: PaletteEntry[]): Uint8Array {
  const out = new Uint8Array(WIDTH * HEIGHT)
  const errR = new Float32Array(WIDTH * HEIGHT)
  const errG = new Float32Array(WIDTH * HEIGHT)
  const errB = new Float32Array(WIDTH * HEIGHT)

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const p = y * WIDTH + x
      const o = p * 4
      const r = Math.max(0, Math.min(255, rgba[o] + errR[p]))
      const g = Math.max(0, Math.min(255, rgba[o + 1] + errG[p]))
      const b = Math.max(0, Math.min(255, rgba[o + 2] + errB[p]))

      let best = palette[0]
      let bestDist = Infinity
      for (const entry of palette) {
        const dr = r - entry.r
        const dg = g - entry.g
        const db = b - entry.b
        const dist = dr * dr + dg * dg + db * db
        if (dist < bestDist) {
          bestDist = dist
          best = entry
        }
      }
      out[p] = best.index

      const er = r - best.r
      const eg = g - best.g
      const eb = b - best.b
      if (x + 1 < WIDTH) {
        errR[p + 1] += (er * 7) / 16
        errG[p + 1] += (eg * 7) / 16
        errB[p + 1] += (eb * 7) / 16
      }
      if (y + 1 < HEIGHT) {
        if (x > 0) {
          errR[p + WIDTH - 1] += (er * 3) / 16
          errG[p + WIDTH - 1] += (eg * 3) / 16
          errB[p + WIDTH - 1] += (eb * 3) / 16
        }
        errR[p + WIDTH] += (er * 5) / 16
        errG[p + WIDTH] += (eg * 5) / 16
        errB[p + WIDTH] += (eb * 5) / 16
        if (x + 1 < WIDTH) {
          errR[p + WIDTH + 1] += (er * 1) / 16
          errG[p + WIDTH + 1] += (eg * 1) / 16
          errB[p + WIDTH + 1] += (eb * 1) / 16
        }
      }
    }
  }
  return out
}

/**
 * Hand-rolled instead of a generic BMP-writing library, because the one
 * requirement that actually matters can't be expressed through a normal
 * indexed-BMP API: the pixel byte at each position must be the firmware's
 * own color index (e.g. 58 for 50% gray), not a sequential palette slot -
 * the color table exists only so image viewers preview it correctly, the
 * firmware ignores it and reads pixel bytes as its own color codes.
 */
function encodeBmp(indices: Uint8Array, palette: PaletteEntry[]): Buffer {
  const fileHeaderSize = 14
  const infoHeaderSize = 40
  const colorTableSize = 256 * 4
  const pixelDataOffset = fileHeaderSize + infoHeaderSize + colorTableSize
  const rowSize = WIDTH // 8bpp, already a multiple of 4 - no row padding needed
  const pixelDataSize = rowSize * HEIGHT
  const fileSize = pixelDataOffset + pixelDataSize

  const buf = Buffer.alloc(fileSize)
  let o = 0

  buf.write('BM', o, 'ascii')
  o += 2
  buf.writeUInt32LE(fileSize, o)
  o += 4
  buf.writeUInt32LE(0, o)
  o += 4 // reserved
  buf.writeUInt32LE(pixelDataOffset, o)
  o += 4

  buf.writeUInt32LE(infoHeaderSize, o)
  o += 4
  buf.writeInt32LE(WIDTH, o)
  o += 4
  buf.writeInt32LE(-HEIGHT, o)
  o += 4 // negative = top-down, matches the row order we already have
  buf.writeUInt16LE(1, o)
  o += 2 // color planes
  buf.writeUInt16LE(8, o)
  o += 2 // bits per pixel
  buf.writeUInt32LE(0, o)
  o += 4 // BI_RGB, uncompressed
  buf.writeUInt32LE(pixelDataSize, o)
  o += 4
  buf.writeInt32LE(2835, o)
  o += 4 // ~72 DPI, arbitrary - the firmware doesn't care
  buf.writeInt32LE(2835, o)
  o += 4
  buf.writeUInt32LE(256, o)
  o += 4 // colors in table
  buf.writeUInt32LE(0, o)
  o += 4 // all colors "important"

  const tableStart = o
  for (const entry of palette) {
    const entryOffset = tableStart + entry.index * 4
    buf[entryOffset] = entry.b
    buf[entryOffset + 1] = entry.g
    buf[entryOffset + 2] = entry.r
    buf[entryOffset + 3] = 0
  }
  o = tableStart + colorTableSize

  Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength).copy(buf, o)
  return buf
}

/** Renders the quantized indices back to RGB so the preview shown in the app matches what the camera will actually display. */
async function renderPreview(indices: Uint8Array, palette: PaletteEntry[]): Promise<string> {
  const lut = new Map(palette.map((e) => [e.index, e]))
  const preview = new Jimp({ width: WIDTH, height: HEIGHT, color: 0x000000ff })
  for (let p = 0; p < indices.length; p++) {
    const entry = lut.get(indices[p])
    if (!entry) continue
    const o = p * 4
    preview.bitmap.data[o] = entry.r
    preview.bitmap.data[o + 1] = entry.g
    preview.bitmap.data[o + 2] = entry.b
    preview.bitmap.data[o + 3] = 255
  }
  return preview.getBase64(JimpMime.png)
}

/**
 * Resizes/letterboxes the source image to exactly 720x480 with no
 * cropping (contain, not cover), flattens onto opaque black (Jimp's
 * `contain` leaves transparent padding, which quantization can't handle),
 * then quantizes against the requested palette and encodes the final BMP.
 */
export async function generateBootLogo(imagePath: string, palette: BootLogoPalette): Promise<BootLogoResult> {
  const source = await Jimp.read(imagePath)
  source.contain({ w: WIDTH, h: HEIGHT })

  const canvas = new Jimp({ width: WIDTH, height: HEIGHT, color: 0x000000ff })
  canvas.composite(source, 0, 0)
  const rgba = Buffer.from(canvas.bitmap.data.buffer, canvas.bitmap.data.byteOffset, canvas.bitmap.data.byteLength)

  const paletteEntries = paletteFor(palette)
  const indices = palette === 'grayscale' ? quantizeGrayscale(rgba) : quantizeDithered(rgba, paletteEntries)

  const bmp = encodeBmp(indices, paletteEntries)
  const previewDataUrl = await renderPreview(indices, paletteEntries)

  return { previewDataUrl, bmpBase64: bmp.toString('base64') }
}
