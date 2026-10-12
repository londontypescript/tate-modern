import { describe, expect, it } from 'vitest';
import { defaultLogoConfig, type EmblemConfig } from './config';
import {
  clampCornerRadius,
  generateFacets,
  generateLayers,
  layersBounds,
  rotatedHalfExtent,
  rotationSafeRadius,
} from './geometry';

const emblem: EmblemConfig = { ...defaultLogoConfig.emblem };

describe('generateLayers', () => {
  it('creates one centred layer per count, rotated by a fixed increment', () => {
    const layers = generateLayers({ ...emblem, layerCount: 6, initialRotation: 7.5, rotationIncrement: 15 });
    expect(layers.map((l) => l.rotation)).toEqual([7.5, 22.5, 37.5, 52.5, 67.5, 82.5]);
    expect(layers.map((l) => l.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(new Set(layers.map((l) => l.id)).size).toBe(6);
  });

  it('is deterministic', () => {
    expect(generateLayers(emblem)).toEqual(generateLayers(emblem));
  });

  it('cycles the palette from back to front', () => {
    const layers = generateLayers({ ...emblem, layerCount: 5, colours: ['a', 'b'] });
    expect(layers.map((l) => l.fill)).toEqual(['a', 'b', 'a', 'b', 'a']);
  });

  it('tapers sizes linearly from the back layer to the front one', () => {
    const layers = generateLayers({ ...emblem, layerCount: 3, squareSize: 100, sizeTaper: 0.2 });
    expect(layers.map((l) => l.size)).toEqual([100, 90, 80]);
  });

  it('handles degenerate counts', () => {
    expect(generateLayers({ ...emblem, layerCount: 0 })).toEqual([]);
    expect(generateLayers({ ...emblem, layerCount: 1, sizeTaper: 0.5 })[0]?.size).toBe(emblem.squareSize);
  });

  it('never lets the corner radius exceed half the side', () => {
    expect(clampCornerRadius(10, 40)).toBe(5);
    expect(clampCornerRadius(10, -1)).toBe(0);
  });
});

describe('square extents', () => {
  it('matches the closed forms for sharp squares', () => {
    expect(rotatedHalfExtent(100, 0, 0)).toBeCloseTo(50);
    expect(rotatedHalfExtent(100, 0, 45)).toBeCloseTo(50 * Math.SQRT2);
    expect(rotatedHalfExtent(100, 0, 90)).toBeCloseTo(50);
  });

  it('shrinks the corner reach as rounding grows', () => {
    expect(rotatedHalfExtent(100, 10, 45)).toBeLessThan(rotatedHalfExtent(100, 0, 45));
    expect(rotatedHalfExtent(100, 50, 30)).toBeCloseTo(50); // a circle
  });

  it('has the 90° symmetry of a square', () => {
    for (const angle of [3, 17, 44, 61]) {
      expect(rotatedHalfExtent(80, 2, angle)).toBeCloseTo(rotatedHalfExtent(80, 2, angle + 90));
      expect(rotatedHalfExtent(80, 2, angle)).toBeCloseTo(rotatedHalfExtent(80, 2, -angle));
    }
  });

  it('keeps every rotation inside the rotation-safe radius', () => {
    const safe = rotationSafeRadius(145, 1.6);
    for (let angle = 0; angle <= 90; angle += 0.5) {
      expect(rotatedHalfExtent(145, 1.6, angle)).toBeLessThanOrEqual(safe + 1e-9);
    }
    expect(rotatedHalfExtent(145, 1.6, 45)).toBeCloseTo(safe);
  });

  it('bounds the composition symmetrically about the origin', () => {
    const box = layersBounds(generateLayers(emblem));
    expect(box.minX).toBeCloseTo(-box.maxX);
    expect(box.minY).toBeCloseTo(-box.maxY);
  });
});

describe('generateFacets', () => {
  const shading = { apexX: 0.5, apexY: 0.4, top: 0.3, right: 0, bottom: -0.2, left: 0.1 };

  it('makes four facets meeting at the apex', () => {
    const facets = generateFacets(-50, -50, 100, 0, shading);
    expect(facets.map((f) => f.id)).toEqual(['facet-top', 'facet-right', 'facet-bottom', 'facet-left']);
    for (const facet of facets) expect(facet.d).toContain('L0 -10Z');
  });

  it('lightens with white and darkens with navy', () => {
    const [top, , bottom] = generateFacets(-50, -50, 100, 0, shading);
    expect(top).toMatchObject({ fill: '#ffffff', opacity: 0.3 });
    expect(bottom?.fill).not.toBe('#ffffff');
    expect(bottom?.opacity).toBeCloseTo(0.2);
  });

  it('follows rounded corners with arcs', () => {
    const facets = generateFacets(-50, -50, 100, 4, shading);
    for (const facet of facets) expect(facet.d.match(/A/g)).toHaveLength(2);
  });
});
