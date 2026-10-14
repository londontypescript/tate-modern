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
  /** The largest difference in the region: a local maximum, reported apart from the mean. */
  max: number;
  over32: number;
}

type RegionName = keyof typeof Region;
export type Stats = Record<RegionName, RegionStats>;

/**
 * The acceptance limits the brief sets (ε by its second amendment); they are
 * never tuned to pass.
 */
export const limits = { mean: 2, p99: 8, backgroundMean: 1, over32Share: 0.001, epsilon: 0.2 } as const;

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
    let max = 0;
    h.forEach((count, d) => {
      pixels += count;
      sum += count * d;
      if (d > 32) over32 += count;
      if (count > 0) max = d;
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
    return [name, { pixels, mean: pixels ? sum / pixels : 0, p99, max, over32 }] as const;
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

interface RendererScore {
  label: string;
  objective: number;
  eligible: boolean;
}

/**
 * Whether two renderers' scores of the same candidates agree: eligibility
 * the same, each objective within `limits.epsilon`, and every pair whose
 * gap under either renderer exceeds the two candidates' own differences
 * ordered the same way. Pairs within that bound are ambiguous: reported,
 * not failed.
 *
 * Note: with each candidate's difference as its own bound, a gap can move
 * by at most that bound, so the pair condition follows from the
 * differences themselves; it is checked anyway, as the contract states it.
 */
export function rendererAgreement(resvg: readonly RendererScore[], chrome: readonly RendererScore[]) {
  const failures: string[] = [];
  const epsilon: Record<string, number> = {};
  const other = new Map(chrome.map((c) => [c.label, c]));
  for (const a of resvg) {
    const b = other.get(a.label);
    if (!b) throw new Error(`rendererAgreement: ${a.label} has no Chrome score`);
    if (a.eligible !== b.eligible) failures.push(`${a.label}: eligible under ${a.eligible ? 'resvg' : 'Chrome'} only`);
    const e = Math.abs(a.objective - b.objective);
    epsilon[a.label] = e;
    if (e > limits.epsilon) failures.push(`${a.label}: objective differs by ${e.toFixed(3)} > ${limits.epsilon}`);
  }
  const ambiguous: [string, string][] = [];
  for (let i = 0; i < resvg.length; i++) {
    for (let j = i + 1; j < resvg.length; j++) {
      const [a, b] = [resvg[i], resvg[j]] as [RendererScore, RendererScore];
      const [c, d] = [other.get(a.label), other.get(b.label)] as [RendererScore, RendererScore];
      const gapR = a.objective - b.objective;
      const gapC = c.objective - d.objective;
      const bound = (epsilon[a.label] ?? 0) + (epsilon[b.label] ?? 0);
      if (Math.abs(gapR) > bound || Math.abs(gapC) > bound) {
        if (Math.sign(gapR) !== Math.sign(gapC)) {
          failures.push(
            `${a.label}, ${b.label}: ordered differently (gaps ${gapR.toFixed(3)} and ${gapC.toFixed(3)}, bound ${bound.toFixed(3)})`,
          );
        }
      } else {
        ambiguous.push([a.label, b.label]);
      }
    }
  }
  return { failures, epsilon, ambiguous };
}
