import { describe, expect, it } from 'vitest';
import { detailForDiameter, paintedBounds, sphereBounds, sphereDiameterInFrame, squareFrame } from '.';

describe('detailForDiameter', () => {
  it('draws the full bubble at every size until smaller steps are approved', () => {
    for (const diameter of [1, 14.9, 18.7, 29.9, 224, 4096]) expect(detailForDiameter(diameter)).toBe('full');
  });

  it('refuses a size that is not a display diameter', () => {
    for (const diameter of [0, -20, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => detailForDiameter(diameter)).toThrow(/Not a display diameter/);
    }
  });
});

describe('the bubble’s boxes', () => {
  it('measures the sphere’s diameter inside its square frame, not the frame’s size', () => {
    expect(sphereDiameterInFrame(240)).toBe(224);
    expect(sphereDiameterInFrame(20)).toBeCloseTo(18.667, 3);
  });

  it('keeps the sphere, the painted area and the square frame apart', () => {
    expect(sphereBounds).toEqual({ minX: 8, minY: 8, maxX: 232, maxY: 232 });
    expect(squareFrame).toEqual({ minX: 0, minY: 0, maxX: 240, maxY: 240 });
    // The rim stroke reaches half a unit past the sphere on every side.
    expect(paintedBounds).toMatchObject({ minX: 7.5, minY: 7.5, maxX: 232.5 });
    // The ground shadow's blur reaches past the frame at the bottom (resvg saw it to about y 246).
    expect(paintedBounds.maxY).toBeGreaterThanOrEqual(246);
    expect(paintedBounds.maxY).toBeGreaterThan(squareFrame.maxY);
  });
});
