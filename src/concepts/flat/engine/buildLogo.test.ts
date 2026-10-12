import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import { capHeightRatio, layoutTextRun, type LogoFonts } from '../../../shared';
import { defaultLogoConfig } from './config';
import { buildLogo } from './geometry';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

describe('buildLogo', () => {
  it('aligns the tile with the top of "London" and the baseline of "TypeScript"', () => {
    for (const tileSize of [60, 100, 140]) {
      const config = { ...defaultLogoConfig, tile: { ...defaultLogoConfig.tile, size: tileSize } };
      const logo = buildLogo(config, fonts);
      const capTop = logo.wordmarkOffset.y + logo.wordmark.capTop;
      const baseline = logo.wordmarkOffset.y + logo.wordmark.lastBaseline;
      expect(capTop).toBeCloseTo(logo.emblem.tile.y);
      expect(baseline).toBeCloseTo(logo.emblem.tile.y + tileSize);
    }
  });

  it('measures alignment from the real top of the capital L', () => {
    const [l] = layoutTextRun(fonts.serif, 'L', { x: 0, baseline: 0, fontSize: 100, letterSpacing: 0 }).glyphs;
    expect(l?.bounds.minY).toBeCloseTo(-capHeightRatio(fonts.serif) * 100, 0);
  });

  it('separates emblem and wordmark by the configured gap', () => {
    const logo = buildLogo(defaultLogoConfig, fonts);
    const wordmarkLeft = logo.wordmark.bounds.minX + logo.wordmarkOffset.x;
    const gap = defaultLogoConfig.layout.horizontalGap * defaultLogoConfig.tile.size;
    expect(wordmarkLeft - logo.emblem.bounds.maxX).toBeCloseTo(gap);
  });

  it('contains every part in its bounds', () => {
    const logo = buildLogo(defaultLogoConfig, fonts);
    expect(logo.bounds.minX).toBeCloseTo(logo.emblem.bounds.minX);
    expect(logo.bounds.maxX).toBeCloseTo(logo.wordmark.bounds.maxX + logo.wordmarkOffset.x);
    expect(logo.rotationSafeBounds.minY).toBeLessThanOrEqual(logo.bounds.minY);
  });

  it('is deterministic', () => {
    expect(buildLogo(defaultLogoConfig, fonts)).toEqual(buildLogo(defaultLogoConfig, fonts));
  });
});
