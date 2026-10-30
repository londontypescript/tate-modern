import { describe, expect, it } from 'vitest';
import { palette } from '../../shared/palette';

/** WCAG's relative luminance of a `#rrggbb` colour. */
function luminance(hex: string) {
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe('contrast', () => {
  // The maintainer's 3:1 target. The white TS sits on the tile's gradient,
  // so it is held against the tile's lightest end: rendered, the tile under
  // the letters is darker still (3.86 at its lightest).
  it('keeps the white TS at 3:1 or more against the lightest blue of its tile', () => {
    expect(contrast(palette.white, palette.liftedBlue)).toBeGreaterThanOrEqual(3);
    expect(contrast(palette.white, palette.blue)).toBeGreaterThanOrEqual(3);
  });
});
