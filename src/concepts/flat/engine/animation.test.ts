import { describe, expect, it } from 'vitest';
import { advanceRotations, easeInOutCubic, layerVelocities, settleRotations, symmetricDelta } from './animation';
import { defaultLogoConfig } from './config';

const config = defaultLogoConfig.animation;

describe('layerVelocities', () => {
  it('gives every layer a distinct, deterministic speed', () => {
    const v = layerVelocities(8, config);
    expect(v).toEqual(layerVelocities(8, config));
    expect(new Set(v).size).toBe(8);
  });

  it('keeps speeds within the configured variation', () => {
    for (const v of layerVelocities(16, config)) {
      expect(Math.abs(v)).toBeGreaterThanOrEqual(config.baseVelocity * (1 - config.variation) - 1e-9);
      expect(Math.abs(v)).toBeLessThanOrEqual(config.baseVelocity * (1 + config.variation));
    }
  });

  it('can alternate directions and stop entirely', () => {
    const v = layerVelocities(4, { ...config, alternateDirection: true });
    expect(v.map(Math.sign)).toEqual([1, -1, 1, -1]);
    expect(layerVelocities(3, { ...config, speed: 0 }).every((x) => x === 0)).toBe(true);
  });
});

describe('advanceRotations', () => {
  it('starts exactly from the current rotations', () => {
    expect(advanceRotations([7.5, 22.5], [3, -2], 0)).toEqual([7.5, 22.5]);
  });

  it('integrates each layer independently', () => {
    expect(advanceRotations([0, 10], [4, -2], 0.5)).toEqual([2, 9]);
  });
});

describe('settling back to the static composition', () => {
  it('takes the shortest path allowed by the 90° symmetry', () => {
    expect(symmetricDelta(10, 20)).toBe(10);
    expect(symmetricDelta(20, 10)).toBe(-10);
    expect(symmetricDelta(100, 7.5)).toBeCloseTo(-2.5);
    expect(symmetricDelta(-80, 7.5)).toBeCloseTo(-2.5);
    for (let from = -400; from < 400; from += 13.7) {
      const d = symmetricDelta(from, 7.5);
      expect(d).toBeGreaterThanOrEqual(-45);
      expect(d).toBeLessThan(45);
    }
  });

  it('begins where the squares are and ends exactly on the static angles', () => {
    const from = [130.2, -12, 55];
    const targets = [7.5, 22.5, 37.5];
    expect(settleRotations(from, targets, 0)).toEqual(from);
    expect(settleRotations(from, targets, 1)).toEqual(targets);
  });

  it('eases monotonically', () => {
    let previous = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      expect(easeInOutCubic(t)).toBeGreaterThanOrEqual(previous);
      previous = easeInOutCubic(t);
    }
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });
});
