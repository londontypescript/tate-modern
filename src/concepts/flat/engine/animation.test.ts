import { describe, expect, it } from 'vitest';
import {
  advanceRotations,
  easeInOutCubic,
  layerSymmetry,
  layerVelocities,
  settleRotations,
  symmetricDelta,
} from './animation';
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

/** How far an angle is from the target pose, allowing for the symmetry: 0 means it already looks static. */
const offPose = (angle: number, target: number, symmetry: number) =>
  Math.abs(((((angle - target) % symmetry) + symmetry * 1.5) % symmetry) - symmetry / 2);

describe('settling back to the static composition', () => {
  it("takes the shortest path allowed by a square's 90° symmetry", () => {
    expect(symmetricDelta(10, 20, 90)).toBe(10);
    expect(symmetricDelta(20, 10, 90)).toBe(-10);
    expect(symmetricDelta(100, 7.5, 90)).toBeCloseTo(-2.5);
    expect(symmetricDelta(-80, 7.5, 90)).toBeCloseTo(-2.5);
  });

  it('stays within half a symmetry turn, from negative angles and several full turns away', () => {
    for (const symmetry of [90, 180, 360] as const) {
      for (let from = -1100; from < 1100; from += 13.7) {
        const d = symmetricDelta(from, 7.5, symmetry);
        expect(d).toBeGreaterThanOrEqual(-symmetry / 2);
        expect(d).toBeLessThan(symmetry / 2);
        expect(offPose(from + d, 7.5, symmetry)).toBeLessThan(1e-9);
      }
    }
  });

  it('turns a rectangle by its 180° symmetry and a faded sheet by a full turn', () => {
    expect(symmetricDelta(100, 7.5, 180)).toBeCloseTo(87.5);
    expect(symmetricDelta(190, 7.5, 180)).toBeCloseTo(-2.5);
    expect(symmetricDelta(190, 7.5, 360)).toBeCloseTo(177.5);
    expect(symmetricDelta(-350, 7.5, 360)).toBeCloseTo(-2.5);
  });

  it('gives each sheet its true symmetry, judging squareness as written to the SVG', () => {
    expect(layerSymmetry({ width: 100, height: 100 })).toBe(90);
    expect(layerSymmetry({ width: 100, height: 100.0004 })).toBe(90);
    expect(layerSymmetry({ width: 100, height: 100.001 })).toBe(180);
    expect(layerSymmetry({ width: 120, height: 80 })).toBe(180);
    const fade = { angle: 0, strength: 0.5, colour: '#fff' };
    expect(layerSymmetry({ width: 100, height: 100, fade })).toBe(360);
    expect(layerSymmetry({ width: 120, height: 80, fade })).toBe(360);
  });

  it('begins where the sheets are and ends exactly on the static angles', () => {
    const from = [130.2, -12, 55];
    const targets = [7.5, 22.5, 37.5];
    const symmetries = [90, 180, 360] as const;
    expect(settleRotations(from, targets, symmetries, 0)).toEqual(from);
    expect(settleRotations(from, targets, symmetries, 1)).toEqual(targets);
  });

  it('nears a pose identical to the static one just before the end, for mixed sheets', () => {
    const from = [90, 90, 90, -275, 1000.5, -721];
    const targets = [0, 0, 0, 7.5, 7.5, 37.5];
    const symmetries = [360, 180, 90, 360, 180, 360] as const;
    const near = settleRotations(from, targets, symmetries, 0.99);
    near.forEach((angle, i) => {
      expect(offPose(angle, targets[i] ?? NaN, symmetries[i] ?? NaN), `sheet ${i} at ${angle}`).toBeLessThan(0.1);
    });
    // A faded sheet at 90° heading for 0° nears 0°, not 90° and then a snap.
    expect(near[0]).toBeCloseTo(0, 1);
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
