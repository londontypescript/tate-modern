import { describe, expect, it } from 'vitest';
import type { RgbImage } from './image';
import { edgePosition, fillHoles, sampleBackground } from './referenceMake';

/** A one-channel profile with a step from `from` to `to` at a fractional position. */
function step(length: number, at: number, from: number, to: number) {
  return Array.from({ length }, (_, i) => {
    const covered = Math.min(Math.max(i + 1 - at, 0), 1); // share of pixel i past the edge
    return [from + (to - from) * covered, 0, 0] as const;
  });
}

describe('edgePosition', () => {
  it('finds a rising edge to a fraction of a pixel, the tile after it', () => {
    expect(edgePosition(step(20, 10.3, 0, 200), 10, 'after')).toBeCloseTo(10.3, 6);
  });

  it('finds a falling edge, the tile before it', () => {
    expect(edgePosition(step(20, 9.75, 180, 40), 9, 'before')).toBeCloseTo(9.75, 6);
  });

  it('uses the channel with the most contrast', () => {
    const profile = step(20, 10.5, 0, 200).map(([r]) => [5, 255 - r, 7] as const);
    expect(edgePosition(profile, 10, 'after')).toBeCloseTo(10.5, 6);
  });
});

describe('cleaning a mask', () => {
  // 0 = background, 1 = foreground, on a 6 × 5 grid.
  const grid = [
    [0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0, 1],
    [0, 1, 0, 1, 0, 0],
    [0, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0],
  ];
  const mask = Uint8Array.from(grid.flat());

  it('fills background enclosed by foreground', () => {
    const filled = fillHoles(mask, 6, 5);
    expect(filled[2 * 6 + 2]).toBe(1);
    expect(filled[0]).toBe(0);
    expect(filled[1 * 6 + 5]).toBe(1); // a lone speck stays
    expect(filled[1 * 6 + 4]).toBe(0); // cream open to the border stays
  });
});

describe('sampleBackground', () => {
  it('takes the most common colour of the corners and how far the rest stray', () => {
    const data = new Uint8Array(4 * 4 * 3).fill(250);
    data.set([240, 250, 250], 0); // one odd pixel in the top-left corner
    const image: RgbImage = { width: 4, height: 4, data };
    const sampled = sampleBackground(image, { x: 0, y: 0, width: 4, height: 4 }, 2);
    expect(sampled.colour).toEqual([250, 250, 250]);
    expect(sampled.spread).toBeGreaterThan(2);
  });
});
