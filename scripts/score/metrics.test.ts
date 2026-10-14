import { describe, expect, it } from 'vitest';
import { ciede2000, srgbToLab } from './colour';
import type { RgbImage } from './image';
import { measure } from './metrics';
import { isForeground, packedColours, Region, type Reference } from './reference';

describe('isForeground', () => {
  it('is strictly greater than 2.0: below and exactly 2.0 are background, above is foreground', () => {
    expect(isForeground(1.999), 'just under 2.0 is background').toBe(false);
    expect(isForeground(2.0), 'exactly 2.0 is background: the threshold is strictly greater').toBe(false);
    expect(isForeground(2.001), 'just over 2.0 is foreground').toBe(true);
  });
});

const BG = [254, 247, 234] as const;
const SHEET = [80, 160, 240] as const;
const TILE = [20, 130, 240] as const;

/** A 4 × 1 reference: background, sheets, sheets, tile. */
function reference(): Reference {
  const mark: RgbImage = { width: 4, height: 1, data: Uint8Array.from([...BG, ...SHEET, ...SHEET, ...TILE]) };
  return {
    width: 4,
    height: 1,
    registration: { background: [...BG] } as Reference['registration'],
    colour: packedColours(mark),
    region: Uint8Array.from([Region.background, Region.sheets, Region.sheets, Region.tile]),
    counts: { background: 1, sheets: 2, tile: 1 },
    hashes: { 'mark.png': '', 'regions.png': '', 'registration.json': '' },
  };
}

const image = (...pixels: (readonly number[])[]): RgbImage => ({
  width: pixels.length,
  height: 1,
  data: Uint8Array.from(pixels.flat()),
});
const de = (p: readonly number[], q: readonly number[]) =>
  ciede2000(srgbToLab(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0), srgbToLab(q[0] ?? 0, q[1] ?? 0, q[2] ?? 0));

describe('measure', () => {
  it('scores an exact copy of the reference as zero, with full overlap', () => {
    expect(measure(image(BG, SHEET, SHEET, TILE), reference())).toEqual({ sheets: 0, tile: 0, spill: 0, iou: 1 });
  });

  it('averages sheets and tile over their regions', () => {
    const got = measure(image(BG, BG, SHEET, [255, 255, 255]), reference());
    expect(got.sheets).toBeCloseTo(de(BG, SHEET) / 2, 12);
    expect(got.tile).toBeCloseTo(de([255, 255, 255], TILE), 12);
    // A sheet pixel left as cream drops out of the candidate's silhouette: 2 of 3 overlap.
    expect(got.iou).toBeCloseTo(2 / 3, 12);
  });

  it('sums spill over the background and divides by the sheet pixels, whatever its size', () => {
    const got = measure(image(SHEET, SHEET, SHEET, TILE), reference());
    expect(got.spill).toBeCloseTo(de(SHEET, BG) / 2, 12);
    expect(got.iou).toBeCloseTo(3 / 4, 12);
  });
});
