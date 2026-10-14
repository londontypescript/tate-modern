/**
 * The score's measurements of one rendered candidate against the
 * reference, pixel by pixel in CIEDE2000:
 *
 * - `sheets`, `tile`: the mean distance over each of the reference's regions;
 * - `spill`: the summed distance over the reference's background, divided by
 *   the number of sheet pixels, so a pale wide spill and a dark narrow one
 *   compare, and the canvas's padding doesn't dilute it;
 * - `iou`: the overlap of the candidate's silhouette (pixels further than
 *   the foreground threshold from the background) with the reference's
 *   (sheets and tile).
 */
import { ciede2000, srgbToLab, type Lab } from './colour';
import type { RgbImage } from './image';
import { isForeground, packedColours, Region, type Reference } from './reference';

export interface Components {
  sheets: number;
  tile: number;
  spill: number;
  iou: number;
}

const labCache = new Map<number, Lab>();
function labOf(packed: number): Lab {
  let lab = labCache.get(packed);
  if (!lab) {
    lab = srgbToLab(packed >>> 16, (packed >>> 8) & 255, packed & 255);
    labCache.set(packed, lab);
  }
  return lab;
}

/** A pair of packed colours as one Map key (exact: under 2^53). */
const pairKey = (a: number, b: number) => a * 0x1000000 + b;

export function measure(image: RgbImage, reference: Reference): Components {
  if (image.width !== reference.width || image.height !== reference.height) {
    throw new Error(
      `candidate: expected ${reference.width} × ${reference.height}, got ${image.width} × ${image.height}`,
    );
  }
  const candidate = packedColours(image);
  const [br, bg, bb] = reference.registration.background;
  const background = (br << 16) | (bg << 8) | bb;
  // Rendered images repeat colours heavily, so each distinct pair is computed once.
  const distances = new Map<number, number>();
  const distance = (a: number, b: number) => {
    if (a === b) return 0;
    const key = pairKey(a, b);
    let d = distances.get(key);
    if (d === undefined) {
      d = ciede2000(labOf(a), labOf(b));
      distances.set(key, d);
    }
    return d;
  };

  const sums = [0, 0, 0];
  let intersection = 0;
  let union = 0;
  for (let p = 0; p < candidate.length; p++) {
    const c = candidate[p] as number;
    const region = reference.region[p] as number;
    sums[region] = (sums[region] as number) + distance(c, reference.colour[p] as number);
    const drawn = isForeground(distance(c, background));
    const inReference = region !== Region.background;
    if (drawn && inReference) intersection++;
    if (drawn || inReference) union++;
  }
  const { counts } = reference;
  return {
    sheets: (sums[Region.sheets] as number) / counts.sheets,
    tile: (sums[Region.tile] as number) / counts.tile,
    spill: (sums[Region.background] as number) / counts.sheets,
    iou: union === 0 ? 1 : intersection / union,
  };
}
