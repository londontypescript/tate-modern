import { describe, expect, it } from 'vitest';
import {
  detailForDiameter,
  details,
  fullFrame,
  paintedBounds,
  sphereBounds,
  sphereDiameterInFrame,
  squareFrame,
  stepBounds,
  themes,
  type Detail,
} from '.';

describe('detailForDiameter', () => {
  it('swaps steps at the approved sphere diameters: none, tiny from 21, small from 28, full from 52', () => {
    const cases: [number, Detail][] = [
      [1, 'none'],
      [20.99, 'none'],
      [21, 'tiny'],
      [27.99, 'tiny'],
      [28, 'small'],
      [51.99, 'small'],
      [52, 'full'],
      [4096, 'full'],
    ];
    for (const [diameter, detail] of cases) expect(detailForDiameter(diameter), `⌀ ${diameter}`).toBe(detail);
  });

  it('gives each square frame the step its sphere’s diameter chooses, not its own size', () => {
    const forFrame = (size: number) => detailForDiameter(sphereDiameterInFrame(size));
    // A 56 px frame holds a 52.3 px sphere: the reference lockup's emblem keeps the full bubble.
    const cases: [number, Detail][] = [
      [16, 'none'],
      [20, 'none'],
      [22, 'none'],
      [23, 'tiny'],
      [29, 'tiny'],
      [30, 'small'],
      [55, 'small'],
      [56, 'full'],
      [64, 'full'],
    ];
    for (const [size, detail] of cases) expect(forFrame(size), `${size} px frame`).toBe(detail);
  });

  it('refuses a size that is not a display diameter', () => {
    for (const diameter of [0, -20, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => detailForDiameter(diameter)).toThrow(/Not a display diameter/);
    }
  });
});

describe('the bubble’s boxes', () => {
  it('measures the sphere’s diameter inside its frame, by the frame’s width, not its size', () => {
    expect(sphereDiameterInFrame(240)).toBe(224);
    expect(sphereDiameterInFrame(20)).toBeCloseTo(18.667, 3);
  });

  it('keeps the sphere, the painted area and the frames apart', () => {
    expect(sphereBounds).toEqual({ minX: 8, minY: 8, maxX: 232, maxY: 232 });
    expect(squareFrame).toEqual({ minX: 0, minY: 0, maxX: 240, maxY: 240 });
    // The rim stroke reaches half a unit past the sphere on every side; dark's caustic fades out by y 253, and
    // light's shadow sooner.
    expect(paintedBounds('dark')).toEqual({ minX: 7.5, minY: 7.5, maxX: 232.5, maxY: 253 });
    expect(paintedBounds('light')).toEqual({ minX: 7.5, minY: 7.5, maxX: 232.5, maxY: 247 });
    // The full frame grows downwards only, to hold either ground: as wide as the square, its top where it was.
    expect(fullFrame).toEqual({ minX: 0, minY: 0, maxX: 240, maxY: 253 });
  });

  it('frames the full step taller than the square, and every smaller step in the square', () => {
    for (const theme of themes) {
      expect(stepBounds('full', theme).frame, theme).toEqual(fullFrame);
      for (const detail of ['small', 'tiny', 'none'] as const) {
        expect(stepBounds(detail, theme).frame, `${theme} ${detail}`).toEqual(squareFrame);
      }
    }
  });

  it('aligns every step by the same sphere, so a swap keeps the logo’s centre and optical size', () => {
    for (const theme of themes) {
      for (const detail of details) expect(stepBounds(detail, theme).align, detail).toEqual(sphereBounds);
    }
  });

  it('states where each step paints: full as the reference, small to the sphere’s edge, the bare fan inside it', () => {
    for (const theme of themes) expect(stepBounds('full', theme).painted).toEqual(paintedBounds(theme));
    expect(stepBounds('small', 'dark').painted).toEqual(sphereBounds);
    // The widest pane (turned 46°) reaches (46 × (cos 46° + sin 46°) + 14) × 1.3 from the centre.
    const turn = (46 * Math.PI) / 180;
    const reach = (46 * (Math.cos(turn) + Math.sin(turn)) + 14) * 1.3;
    for (const detail of ['tiny', 'none'] as const) {
      const { painted } = stepBounds(detail, 'light');
      expect(painted.minX).toBeCloseTo(120 - reach, 2);
      expect(painted.maxY).toBeCloseTo(120 + reach, 2);
      expect(painted.minX).toBeGreaterThan(sphereBounds.minX);
    }
  });
});
