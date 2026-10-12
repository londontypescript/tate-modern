import { describe, expect, it } from 'vitest';
import { defaultThreeConfig } from './config';
import { placeSlabs, scrambledAngle, slabFaceHalfWidth, slabHalfWidth } from './stack';

const { stack, slab, material } = defaultThreeConfig;

describe('placeSlabs', () => {
  it('reproduces the prototype stack: turned, grown and pushed back per slab', () => {
    const slabs = placeSlabs(stack, slab, material);
    expect(slabs).toHaveLength(30);
    const third = slabs[3]!;
    expect(third.rotation).toBeCloseTo(3 * 0.15);
    expect(third.scale[0]).toBeCloseTo(0.3 + 3 * 0.1);
    expect(third.scale[2]).toBeCloseTo(1 + 0.6);
    expect(third.position[2]).toBeCloseTo(-0.6);
    expect(third.opacity).toBe(0.75);
  });

  it('drifts slabs sideways and fades them towards the back when asked', () => {
    const slabs = placeSlabs({ ...stack, count: 4, offsetX: 0.1, offsetY: -0.05 }, slab, {
      ...material,
      opacity: 0.9,
      opacityFalloff: 0.4,
    });
    expect(slabs[2]!.position[0]).toBeCloseTo(0.2);
    expect(slabs[2]!.position[1]).toBeCloseTo(-0.1);
    [0.9, 0.5, 0.1, 0].forEach((opacity, i) => expect(slabs[i]!.opacity).toBeCloseTo(opacity));
  });

  it('uses the fixed scrambled angles instead of an even fan', () => {
    const slabs = placeSlabs({ ...stack, scramble: true, count: 3 }, slab, material);
    expect(slabs.map((s) => s.rotation)).toEqual([0, 1, 2].map(scrambledAngle));
    for (const s of slabs) expect(s.rotation).toBeGreaterThanOrEqual(0);
    for (const s of slabs) expect(s.rotation).toBeLessThan(2 * Math.PI);
  });

  it('handles degenerate counts', () => {
    expect(placeSlabs({ ...stack, count: 0 }, slab, material)).toEqual([]);
    expect(placeSlabs({ ...stack, count: -2 }, slab, material)).toEqual([]);
  });
});

describe('slab measurements', () => {
  it('adds the chamfer to the core square', () => {
    expect(slabFaceHalfWidth(slab)).toBeCloseTo(0.7);
    expect(slabHalfWidth(slab)).toBeCloseTo(0.9);
  });
});
