import { describe, expect, it } from 'vitest';
import { accepts, differenceStats, limits } from './compare';
import type { RgbImage } from './image';

const image = (...pixels: number[][]): RgbImage => ({
  width: pixels.length,
  height: 1,
  data: Uint8Array.from(pixels.flat()),
});

describe('differenceStats', () => {
  it('takes the largest channel difference per pixel, then the mean, nearest-rank 99th percentile and count over 32', () => {
    const a = image([0, 0, 0], [10, 10, 10], [100, 100, 100], [50, 50, 50]);
    const b = image([0, 3, 1], [10, 10, 50], [100, 100, 100], [50, 50, 50]);
    const region = Uint8Array.from([0, 0, 1, 1]);
    const stats = differenceStats(a, b, region);
    expect(stats.background).toEqual({ pixels: 2, mean: (3 + 40) / 2, p99: 40, over32: 1 });
    expect(stats.sheets).toEqual({ pixels: 2, mean: 0, p99: 0, over32: 0 });
    expect(stats.tile).toEqual({ pixels: 0, mean: 0, p99: 0, over32: 0 });
  });

  it('uses the nearest rank: the 99th percentile of 1..200 is 198', () => {
    const n = 200;
    const a = image(...Array.from({ length: n }, () => [0, 0, 0]));
    const b = image(...Array.from({ length: n }, (_, i) => [i + 1, 0, 0]));
    expect(differenceStats(a, b, new Uint8Array(n)).background.p99).toBe(198);
  });
});

describe('accepts', () => {
  const ok = { pixels: 1000, mean: 1, p99: 4, over32: 1 };
  it('passes within every limit', () => {
    expect(accepts({ background: { ...ok, mean: 1 }, sheets: ok, tile: ok })).toEqual([]);
  });

  it('names each limit broken', () => {
    expect(
      accepts({ background: { ...ok, mean: 1.5 }, sheets: { ...ok, mean: 2.5, p99: 9 }, tile: { ...ok, over32: 2 } }),
    ).toEqual([
      'background mean 1.500 > 1',
      'sheets mean 2.500 > 2',
      'sheets p99 9 > 8',
      'tile 2 pixels over 32 > 0.1%',
    ]);
  });

  it('states the brief’s limits', () => {
    expect(limits).toEqual({ mean: 2, p99: 8, backgroundMean: 1, over32Share: 0.001 });
  });
});
