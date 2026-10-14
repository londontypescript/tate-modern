import type { AnimationConfig } from './config';
import { sanitizeAnimation } from './sanitize';
import type { SheetLayer } from './types';

/**
 * Pure rotation-over-time maths for the background sheets. Geometry says
 * where each sheet starts; these functions say how it moves from there.
 */

/** The turn after which a sheet looks the same again, in degrees. */
export type Symmetry = 90 | 180 | 360;

/** A length as the SVG writes it (three decimals, like `num`). */
const written = (v: number) => Number(v.toFixed(3));

/**
 * A sheet's true symmetry: an unfaded square repeats every 90°, an unfaded
 * rectangle every 180°, and a faded sheet only after a full turn, since its
 * fade points one way. "Square" means equal sides as written to the SVG, so
 * a difference too small to be drawn doesn't change how it settles.
 */
export function layerSymmetry(layer: Pick<SheetLayer, 'width' | 'height' | 'fade'>): Symmetry {
  if (layer.fade) return 360;
  return written(layer.width) === written(layer.height) ? 90 : 180;
}

const GOLDEN = 0.6180339887498949;

/**
 * Angular velocity of each layer in degrees per second. Speeds are spread
 * around `baseVelocity` with a golden-ratio sequence so neighbours never
 * move in lockstep, and the result is deterministic for a given count.
 * Every caller (the studio, `useLayerRotations`, `AnimatedTypeScriptMark`)
 * comes through here, so the speeds are checked here: a saved `1e400`
 * would otherwise turn every sheet to Infinity.
 */
export function layerVelocities(count: number, input: AnimationConfig): number[] {
  const config = sanitizeAnimation(input);
  return Array.from({ length: count }, (_, i) => {
    const spread = ((i * GOLDEN) % 1) * 2 - 1; // in [-1, 1)
    const direction = config.alternateDirection && i % 2 === 1 ? -1 : 1;
    return direction * config.speed * config.baseVelocity * (1 + config.variation * spread);
  });
}

/** Advances each rotation by its velocity over `dt` seconds. */
export function advanceRotations(rotations: readonly number[], velocities: readonly number[], dt: number): number[] {
  return rotations.map((r, i) => r + (velocities[i] ?? 0) * dt);
}

/**
 * Smallest rotation that takes `from` to a pose visually identical to `to`,
 * for a sheet with the given symmetry. Always within [-symmetry/2, symmetry/2).
 */
export function symmetricDelta(from: number, to: number, symmetry: Symmetry): number {
  const d = (((to - from) % symmetry) + symmetry) % symmetry;
  return d >= symmetry / 2 ? d - symmetry : d;
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Rotations part-way through settling back to the static composition. Each
 * sheet glides the short way round its own symmetry, so it arrives at a
 * pose that already looks like its static one. At progress 1 the result is
 * exactly `targets`.
 */
export function settleRotations(
  from: readonly number[],
  targets: readonly number[],
  symmetries: readonly Symmetry[],
  progress: number,
): number[] {
  if (progress >= 1) return [...targets];
  const e = easeInOutCubic(Math.max(0, progress));
  return targets.map((target, i) => {
    const start = from[i] ?? target;
    return start + symmetricDelta(start, target, symmetries[i] ?? 360) * e;
  });
}

/** How long the sheets take to glide back to their static pose, in seconds. */
export const SETTLE_DURATION = 1.4;
