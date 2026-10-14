/**
 * The committed reference the score compares against: the original's mark
 * on a fixed canvas (`mark.png`), its regions (`regions.png`) and where its
 * tile is (`registration.json`). Read once, validated, and turned into the
 * per-pixel arrays the metrics use.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, type RgbImage } from './image';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Registration {
  /** What the canvas is, in words: which of the original's pixels, and what fills the rest. */
  note: string;
  canvas: { width: number; height: number };
  /** The rectangle of the original's pixels copied into the canvas. */
  sourceCrop: Rect;
  /** Where that rectangle's top-left sits in the canvas. */
  cropAt: { x: number; y: number };
  /** The background colour sampled at the crop's corners, as 8-bit sRGB. */
  background: [number, number, number];
  /** The largest CIEDE2000 distance of a corner sample from that colour. */
  backgroundSpread: number;
  /** The original tile's measured bounds in the canvas (it is wider than tall). */
  tile: Rect;
  /** The measured tile's centre, where a candidate tile's centre is placed. */
  centre: { x: number; y: number };
  /** A candidate tile's side in canvas pixels: the geometric mean of the measured width and height. */
  side: number;
  /** How far each edge of that square falls inside the measured tile, per axis (negative: outside). */
  residual: { x: number; y: number };
}

/**
 * A pixel is drawn (foreground) when its CIEDE2000 distance from the
 * reference background exceeds this. The same rule drew the reference's
 * regions and decides a candidate's silhouette.
 */
export const FOREGROUND_DELTA_E = 2.0;

/** Whether a distance from the background makes a pixel foreground: strictly greater. */
export const isForeground = (deltaE: number) => deltaE > FOREGROUND_DELTA_E;

/** The exact colours of `regions.png`. */
export const regionColours = {
  background: [0, 0, 0],
  sheets: [255, 0, 0],
  tile: [0, 0, 255],
} as const;

/** Region codes in `Reference.region`. */
export const Region = { background: 0, sheets: 1, tile: 2 } as const;

export const referenceDir = join(dirname(fileURLToPath(import.meta.url)), 'reference');

const referenceFiles = ['mark.png', 'regions.png', 'registration.json'] as const;

export interface Reference {
  width: number;
  height: number;
  registration: Registration;
  /** Every pixel of mark.png, packed as 0xRRGGBB. */
  colour: Uint32Array;
  /** The region of every pixel (see `Region`). */
  region: Uint8Array;
  /** Pixels per region. */
  counts: { background: number; sheets: number; tile: number };
  /** SHA-256 of each committed file. */
  hashes: Record<(typeof referenceFiles)[number], string>;
}

/** Every pixel's colour packed as 0xRRGGBB, the key the metrics cache distances by. */
export function packedColours(image: RgbImage): Uint32Array {
  const out = new Uint32Array(image.width * image.height);
  for (let p = 0; p < out.length; p++) {
    out[p] = ((image.data[p * 3] ?? 0) << 16) | ((image.data[p * 3 + 1] ?? 0) << 8) | (image.data[p * 3 + 2] ?? 0);
  }
  return out;
}

/** The region of every pixel, refusing any colour that isn't exactly one of the three. */
export function regionCodes(regions: RgbImage): Uint8Array {
  const codes = new Uint8Array(regions.width * regions.height);
  for (let p = 0; p < codes.length; p++) {
    const [r, g, b] = [regions.data[p * 3], regions.data[p * 3 + 1], regions.data[p * 3 + 2]];
    const name = (Object.keys(regionColours) as (keyof typeof regionColours)[]).find((key) => {
      const c = regionColours[key];
      return c[0] === r && c[1] === g && c[2] === b;
    });
    if (!name) {
      throw new Error(`regions.png: pixel (${p % regions.width}, ${Math.floor(p / regions.width)}) is ${r},${g},${b}`);
    }
    codes[p] = Region[name];
  }
  return codes;
}

/** Reads and validates the committed reference. */
export async function loadReference(dir = referenceDir): Promise<Reference> {
  const bytes = await Promise.all(referenceFiles.map((f) => readFile(join(dir, f))));
  const [markBytes, regionsBytes, registrationBytes] = bytes as [Buffer, Buffer, Buffer];
  const registration = JSON.parse(registrationBytes.toString('utf8')) as Registration;
  const mark = decodePng(markBytes, registration.canvas, 'mark.png');
  const region = regionCodes(decodePng(regionsBytes, registration.canvas, 'regions.png'));
  const counts = { background: 0, sheets: 0, tile: 0 };
  for (const code of region) {
    if (code === Region.sheets) counts.sheets++;
    else if (code === Region.tile) counts.tile++;
    else counts.background++;
  }
  for (const [name, count] of Object.entries(counts)) {
    if (count === 0) throw new Error(`regions.png: the ${name} region is empty`);
  }
  const hashes = Object.fromEntries(
    referenceFiles.map((f, i) => [
      f,
      createHash('sha256')
        .update(bytes[i] as Buffer)
        .digest('hex'),
    ]),
  ) as Reference['hashes'];
  return {
    width: mark.width,
    height: mark.height,
    registration,
    colour: packedColours(mark),
    region,
    counts,
    hashes,
  };
}
