/**
 * Pixel agreement between two renders of the same candidate, per region of
 * the reference, for the renderer acceptance: the absolute difference in
 * each channel (0-255), its largest over R, G and B per pixel, then the
 * mean and 99th percentile (nearest rank) over the region and the count of
 * pixels differing by more than 32.
 */
import type { RgbImage } from './image';
import { Region } from './reference';

interface RegionStats {
  pixels: number;
  mean: number;
  p99: number;
  over32: number;
}

type RegionName = keyof typeof Region;
export type Stats = Record<RegionName, RegionStats>;

/** The acceptance limits the brief sets; they are not tuned to pass. */
export const limits = { mean: 2, p99: 8, backgroundMean: 1, over32Share: 0.001 } as const;

const names: RegionName[] = ['background', 'sheets', 'tile'];

export function differenceStats(a: RgbImage, b: RgbImage, region: Uint8Array): Stats {
  if (a.width !== b.width || a.height !== b.height) throw new Error('differenceStats: images differ in size');
  // Differences are whole numbers 0..255, so a histogram per region gives exact percentiles.
  const histograms = names.map(() => new Uint32Array(256));
  for (let p = 0; p < region.length; p++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs((a.data[p * 3 + c] ?? 0) - (b.data[p * 3 + c] ?? 0)));
    const h = histograms[region[p] ?? 0] as Uint32Array;
    h[d] = (h[d] ?? 0) + 1;
  }
  const stats = names.map((name, i) => {
    const h = histograms[i] as Uint32Array;
    let pixels = 0;
    let sum = 0;
    let over32 = 0;
    h.forEach((count, d) => {
      pixels += count;
      sum += count * d;
      if (d > 32) over32 += count;
    });
    // Nearest rank: the smallest value with at least ceil(0.99 n) values at or below it.
    const rank = Math.ceil(0.99 * pixels);
    let p99 = 0;
    for (let d = 0, seen = 0; d < 256 && pixels > 0; d++) {
      seen += h[d] ?? 0;
      if (seen >= rank) {
        p99 = d;
        break;
      }
    }
    return [name, { pixels, mean: pixels ? sum / pixels : 0, p99, over32 }] as const;
  });
  return Object.fromEntries(stats) as Stats;
}

/** Every limit the stats break, in words; empty when they pass. */
export function accepts(stats: Stats): string[] {
  const broken: string[] = [];
  for (const name of names) {
    const s = stats[name];
    const meanLimit = name === 'background' ? limits.backgroundMean : limits.mean;
    if (s.mean > meanLimit) broken.push(`${name} mean ${s.mean.toFixed(3)} > ${meanLimit}`);
    if (name !== 'background' && s.p99 > limits.p99) broken.push(`${name} p99 ${s.p99} > ${limits.p99}`);
    if (s.over32 > limits.over32Share * s.pixels) broken.push(`${name} ${s.over32} pixels over 32 > 0.1%`);
  }
  return broken;
}
