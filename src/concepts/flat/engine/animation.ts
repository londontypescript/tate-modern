import type { AnimationConfig } from './config';

/**
 * Pure rotation-over-time maths for the background squares. Geometry says
 * where each square starts; these functions say how it moves from there.
 */

/** Squares look identical every 90°. */
const SYMMETRY = 90;
const GOLDEN = 0.6180339887498949;

/**
 * Angular velocity of each layer in degrees per second. Speeds are spread
 * around `baseVelocity` with a golden-ratio sequence so neighbours never
 * move in lockstep, and the result is deterministic for a given count.
 */
export function layerVelocities(count: number, config: AnimationConfig): number[] {
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
 * using the square's 90° symmetry. Always within [-45, 45).
 */
export function symmetricDelta(from: number, to: number): number {
  const d = (((to - from) % SYMMETRY) + SYMMETRY) % SYMMETRY;
  return d >= SYMMETRY / 2 ? d - SYMMETRY : d;
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Rotations part-way through settling back to the static composition.
 * At progress 1 the result is exactly `targets`.
 */
export function settleRotations(from: readonly number[], targets: readonly number[], progress: number): number[] {
  if (progress >= 1) return [...targets];
  const e = easeInOutCubic(Math.max(0, progress));
  return targets.map((target, i) => {
    const start = from[i] ?? target;
    const delta = symmetricDelta(start, target);
    return start + delta * e;
  });
}

/** How long the squares take to glide back to their static pose, in seconds. */
export const SETTLE_DURATION = 1.4;
