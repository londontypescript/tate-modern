import { describe, expect, it } from 'vitest';
import type { Box } from '../../../shared';
import {
  clampCornerRadius,
  layersBounds,
  rotationSafeLayersBounds,
  sheetBox,
  sheetHalfExtents,
  sheetSafeRadius,
} from './bounds';
import { defaultLogoConfig, neutralVariation } from './config';
import { generateLayers } from './geometry';
import type { SheetLayer } from './types';

const DEG = Math.PI / 180;

const sheet = (over: Partial<SheetLayer>): SheetLayer => ({
  id: 'layer-0',
  index: 0,
  width: 100,
  height: 100,
  x: 0,
  y: 0,
  rotation: 0,
  cornerRadius: 0,
  fill: '#000',
  opacity: 1,
  blendMode: 'normal',
  ...over,
});

/**
 * The box found by walking the outline: a rounded rectangle is its four
 * corner circles' hull, so its extremes lie on those circles.
 */
function walkedBox(s: SheetLayer, rotation = s.rotation) {
  const r = clampCornerRadius(Math.min(s.width, s.height), s.cornerRadius);
  const a = s.width / 2 - r;
  const b = s.height / 2 - r;
  const [cos, sin] = [Math.cos(rotation * DEG), Math.sin(rotation * DEG)];
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [cx, cy] of [
    [a, b],
    [-a, b],
    [a, -b],
    [-a, -b],
  ] as const) {
    for (let step = 0; step < 1440; step++) {
      const px = cx + r * Math.cos((step / 4) * DEG);
      const py = cy + r * Math.sin((step / 4) * DEG);
      const x = s.x + px * cos - py * sin;
      const y = s.y + px * sin + py * cos;
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y);
      box.maxY = Math.max(box.maxY, y);
    }
  }
  return box;
}

const expectBoxClose = (actual: Box, expected: Box) => {
  for (const key of ['minX', 'minY', 'maxX', 'maxY'] as const) expect(actual[key], key).toBeCloseTo(expected[key], 2);
};

describe('sheet bounds', () => {
  const cases: [string, Partial<SheetLayer>][] = [
    ['unequal sides', { width: 140, height: 90, cornerRadius: 3 }],
    ['a positive offset', { width: 120, height: 100, x: 12.5, y: 7, cornerRadius: 2 }],
    ['a negative offset', { width: 90, height: 130, x: -15, y: -4.25, cornerRadius: 1.6 }],
    ['heavy rounding', { width: 150, height: 110, cornerRadius: 40 }],
    ['a fully rounded smaller side', { width: 160, height: 80, cornerRadius: 999, x: 3, y: -9 }],
    ['sharp corners', { width: 130, height: 70, cornerRadius: 0, x: -2 }],
  ];

  for (const [name, over] of cases) {
    it(`matches the outline at every angle for ${name}`, () => {
      const s = sheet(over);
      for (let angle = -370; angle <= 370; angle += 7.3) expectBoxClose(sheetBox(s, angle), walkedBox(s, angle));
    });

    it(`keeps ${name} inside its rotation-safe box, touching it at some angle`, () => {
      const s = sheet(over);
      const safe = rotationSafeLayersBounds([s]);
      let reach = 0;
      for (let angle = 0; angle < 360; angle += 0.25) {
        const box = sheetBox(s, angle);
        expect(box.minX).toBeGreaterThanOrEqual(safe.minX - 1e-9);
        expect(box.maxX).toBeLessThanOrEqual(safe.maxX + 1e-9);
        expect(box.minY).toBeGreaterThanOrEqual(safe.minY - 1e-9);
        expect(box.maxY).toBeLessThanOrEqual(safe.maxY + 1e-9);
        reach = Math.max(reach, box.maxX - s.x);
      }
      expect(reach).toBeCloseTo(sheetSafeRadius(s.width, s.height, s.cornerRadius), 3);
    });
  }

  it('uses the closed forms for rectangles', () => {
    expect(sheetHalfExtents(140, 60, 0, 0)).toEqual({ hx: 70, hy: 30 });
    const turned = sheetHalfExtents(140, 60, 0, 90);
    expect(turned.hx).toBeCloseTo(30);
    expect(turned.hy).toBeCloseTo(70);
    expect(sheetSafeRadius(140, 60, 0)).toBeCloseTo(Math.hypot(70, 30));
    expect(sheetSafeRadius(160, 80, 999)).toBeCloseTo(40 + 40); // a stadium: a = 40, b = 0, r = 40
  });

  it('reduces exactly to the square formulas for a centred square', () => {
    // The formulas before sheets could be non-square, kept here verbatim.
    const oldHalf = (size: number, r: number, rotation: number) =>
      (size / 2 - r) * (Math.abs(Math.cos(rotation * DEG)) + Math.abs(Math.sin(rotation * DEG))) + r;
    const oldSafe = (size: number, r: number) => (size / 2 - r) * Math.SQRT2 + r;
    for (const [size, r] of [
      [158, 1.6],
      [145, 0],
      [120, 12],
      [80, 40],
    ] as const) {
      for (let angle = -200; angle <= 200; angle += 3.7) {
        const s = sheet({ width: size, height: size, cornerRadius: r, rotation: angle });
        const half = oldHalf(size, r, angle);
        expect(sheetBox(s)).toEqual({ minX: -half, minY: -half, maxX: half, maxY: half });
      }
      expect(sheetSafeRadius(size, size, r)).toBe(oldSafe(size, r));
    }
  });

  it('unions every sheet at the rotations given', () => {
    const a = sheet({ width: 60, height: 40, x: 30 });
    const b = sheet({ width: 50, height: 50, y: -40 });
    expect(layersBounds([a, b])).toEqual({ minX: -25, minY: -65, maxX: 60, maxY: 20 });
    const turned = layersBounds([a, b], [90, 0]);
    expect(turned.maxX).toBeCloseTo(50);
    expect(turned.maxY).toBeCloseTo(30);
  });

  it('bounds a neutral composition symmetrically about the origin', () => {
    const box = layersBounds(generateLayers({ ...defaultLogoConfig.emblem, ...neutralVariation }));
    expect(box.minX).toBe(-box.maxX);
    expect(box.minY).toBe(-box.maxY);
  });
});
