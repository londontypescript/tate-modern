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
import { srgbToLab, type Lab } from './colour';
import { decodePng, type RgbImage } from './image';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Registration {
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
const FOREGROUND_DELTA_E = 2.0;

/** Whether a distance from the background makes a pixel foreground: strictly greater. */
export const isForeground = (deltaE: number) => deltaE > FOREGROUND_DELTA_E;

/** The exact colours of `regions.png`. */
export const regionColours = {
  background: [0, 0, 0],
  sheets: [255, 0, 0],
  tile: [0, 0, 255],
} as const;

/** Region codes in `Reference.region`. */
const Region = { background: 0, sheets: 1, tile: 2 } as const;

export const referenceDir = join(dirname(fileURLToPath(import.meta.url)), 'reference');

const referenceFiles = ['mark.png', 'regions.png', 'registration.json'] as const;

export interface Reference {
  width: number;
  height: number;
  registration: Registration;
  /** The background colour in CIELAB. */
  backgroundLab: Lab;
  /** CIELAB of every pixel of mark.png, L a b interleaved. */
  lab: Float64Array;
  /** The region of every pixel (see `Region`). */
  region: Uint8Array;
  /** Pixels per region. */
  counts: { background: number; sheets: number; tile: number };
  /** SHA-256 of each committed file. */
  hashes: Record<(typeof referenceFiles)[number], string>;
}

/** CIELAB of every pixel of an image, L a b interleaved; repeated colours are converted once. */
function imageLab(image: RgbImage): Float64Array {
  const out = new Float64Array(image.width * image.height * 3);
  const cache = new Map<number, Lab>();
  for (let i = 0, j = 0; j < out.length; i += 3, j += 3) {
    const r = image.data[i] ?? 0;
    const g = image.data[i + 1] ?? 0;
    const b = image.data[i + 2] ?? 0;
    const key = (r << 16) | (g << 8) | b;
    let lab = cache.get(key);
    if (!lab) {
      lab = srgbToLab(r, g, b);
      cache.set(key, lab);
    }
    out[j] = lab.L;
    out[j + 1] = lab.a;
    out[j + 2] = lab.b;
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
    backgroundLab: srgbToLab(...registration.background),
    lab: imageLab(mark),
    region,
    counts,
    hashes,
  };
}
