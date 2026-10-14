import { describe, expect, it } from 'vitest';
import { ciede2000, srgbToLab, type Lab } from './colour';

/**
 * The 34 pairs of Sharma, Wu and Dalal, "The CIEDE2000 Color-Difference
 * Formula: Implementation Notes, Supplementary Test Data, and Mathematical
 * Observations" (Color Research and Application, 2005), table 1: L1 a1 b1,
 * L2 a2 b2 and the published ΔE00.
 */
const sharma: readonly (readonly [number, number, number, number, number, number, number])[] = [
  [50.0, 2.6772, -79.7751, 50.0, 0.0, -82.7485, 2.0425],
  [50.0, 3.1571, -77.2803, 50.0, 0.0, -82.7485, 2.8615],
  [50.0, 2.8361, -74.02, 50.0, 0.0, -82.7485, 3.4412],
  [50.0, -1.3802, -84.2814, 50.0, 0.0, -82.7485, 1.0],
  [50.0, -1.1848, -84.8006, 50.0, 0.0, -82.7485, 1.0],
  [50.0, -0.9009, -85.5211, 50.0, 0.0, -82.7485, 1.0],
  [50.0, 0.0, 0.0, 50.0, -1.0, 2.0, 2.3669],
  [50.0, -1.0, 2.0, 50.0, 0.0, 0.0, 2.3669],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.0009, 7.1792],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.001, 7.1792],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.0011, 7.2195],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.0012, 7.2195],
  [50.0, -0.001, 2.49, 50.0, 0.0009, -2.49, 4.8045],
  [50.0, -0.001, 2.49, 50.0, 0.001, -2.49, 4.8045],
  [50.0, -0.001, 2.49, 50.0, 0.0011, -2.49, 4.7461],
  [50.0, 2.5, 0.0, 50.0, 0.0, -2.5, 4.3065],
  [50.0, 2.5, 0.0, 73.0, 25.0, -18.0, 27.1492],
  [50.0, 2.5, 0.0, 61.0, -5.0, 29.0, 22.8977],
  [50.0, 2.5, 0.0, 56.0, -27.0, -3.0, 31.903],
  [50.0, 2.5, 0.0, 58.0, 24.0, 15.0, 19.4535],
  [50.0, 2.5, 0.0, 50.0, 3.1736, 0.5854, 1.0],
  [50.0, 2.5, 0.0, 50.0, 3.2972, 0.0, 1.0],
  [50.0, 2.5, 0.0, 50.0, 1.8634, 0.5757, 1.0],
  [50.0, 2.5, 0.0, 50.0, 3.2592, 0.335, 1.0],
  [60.2574, -34.0099, 36.2677, 60.4626, -34.1751, 39.4387, 1.2644],
  [63.0109, -31.0961, -5.8663, 62.8187, -29.7946, -4.0864, 1.263],
  [61.2901, 3.7196, -5.3901, 61.4292, 2.248, -4.962, 1.8731],
  [35.0831, -44.1164, 3.7933, 35.0232, -40.0716, 1.5901, 1.8645],
  [22.7233, 20.0904, -46.694, 23.0331, 14.973, -42.5619, 2.0373],
  [36.4612, 47.858, 18.3852, 36.2715, 50.5065, 21.2231, 1.4146],
  [90.8027, -2.0831, 1.441, 91.1528, -1.6435, 0.0447, 1.4441],
  [90.9257, -0.5406, -0.9208, 88.6381, -0.8985, -0.7239, 1.5381],
  [6.7747, -0.2908, -2.4247, 5.8714, -0.0985, -2.2286, 0.6377],
  [2.0776, 0.0795, -1.135, 0.9033, -0.0636, -0.5514, 0.9082],
];

describe('ciede2000', () => {
  it('matches all 34 of Sharma, Wu and Dalal’s published pairs to 4 decimals', () => {
    expect(sharma).toHaveLength(34);
    const misses = sharma
      .map(([L1, a1, b1, L2, a2, b2, expected], i) => {
        const got = ciede2000({ L: L1, a: a1, b: b1 }, { L: L2, a: a2, b: b2 });
        return { pair: i + 1, expected, got: Number(got.toFixed(4)) };
      })
      .filter(({ expected, got }) => got !== expected);
    expect(misses, 'CIEDE2000 disagrees with the published test data').toEqual([]);
  });

  it('is symmetric and zero for identical colours', () => {
    const p: Lab = { L: 40, a: 10, b: -30 };
    const q: Lab = { L: 45, a: -5, b: 12 };
    expect(ciede2000(p, p)).toBe(0);
    expect(ciede2000(p, q)).toBeCloseTo(ciede2000(q, p), 12);
  });
});

describe('srgbToLab', () => {
  it('maps white to L 100 and black to L 0 under D65', () => {
    const white = srgbToLab(255, 255, 255);
    expect(white.L).toBeCloseTo(100, 3);
    expect(white.a).toBeCloseTo(0, 3);
    expect(white.b).toBeCloseTo(0, 3);
    expect(srgbToLab(0, 0, 0)).toEqual({ L: 0, a: 0, b: 0 });
  });

  it('matches published sRGB to CIELAB values (D65)', () => {
    // sRGB red, green and blue as CIELAB D65 (Bruce Lindbloom's calculator, 2° observer).
    const red = srgbToLab(255, 0, 0);
    expect([red.L, red.a, red.b].map((v) => Number(v.toFixed(2)))).toEqual([53.24, 80.09, 67.2]);
    const green = srgbToLab(0, 255, 0);
    expect([green.L, green.a, green.b].map((v) => Number(v.toFixed(2)))).toEqual([87.73, -86.18, 83.18]);
    const blue = srgbToLab(0, 0, 255);
    expect([blue.L, blue.a, blue.b].map((v) => Number(v.toFixed(2)))).toEqual([32.3, 79.19, -107.86]);
  });
});
