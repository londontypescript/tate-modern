import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import { capHeightRatio, layoutTextRun, type LogoFonts } from '../../../shared';
import { defaultLogoConfig } from './config';
import { sheetBox } from './bounds';
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

  it('frames the tile alone when there are no sheets', () => {
    const logo = buildLogo({ ...defaultLogoConfig, emblem: { ...defaultLogoConfig.emblem, layerCount: 0 } }, fonts);
    const tile = { minX: -50, minY: -50, maxX: 50, maxY: 50 };
    expect(logo.emblem.bounds).toEqual(tile);
    expect(logo.emblem.rotationSafeBounds).toEqual(tile);
  });
});

describe('the wordmark beside varied sheets', () => {
  it('sits beside the static sheets, never over them, however they are shifted and stretched', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const emblem = {
        ...defaultLogoConfig.emblem,
        seed,
        rotationJitter: 20,
        sizeJitter: 0.3,
        aspectJitter: 0.3,
        offsetJitter: 20,
      };
      const logo = buildLogo({ ...defaultLogoConfig, emblem }, fonts);
      const wordmarkLeft = logo.wordmark.bounds.minX + logo.wordmarkOffset.x;
      const gap = defaultLogoConfig.layout.horizontalGap * defaultLogoConfig.tile.size;
      expect(wordmarkLeft - logo.emblem.bounds.maxX).toBeCloseTo(gap);
      for (const layer of logo.emblem.layers) {
        expect(sheetBox(layer).maxX, `seed ${seed} ${layer.id}`).toBeLessThanOrEqual(wordmarkLeft - gap + 1e-9);
      }
      // While animating the sheets may pass under the wordmark, but the frame still holds them all.
      expect(logo.rotationSafeBounds.minX).toBeLessThanOrEqual(logo.emblem.rotationSafeBounds.minX);
      expect(logo.rotationSafeBounds.maxY).toBeGreaterThanOrEqual(logo.emblem.rotationSafeBounds.maxY);
      expect(logo.rotationSafeBounds.minY).toBeLessThanOrEqual(logo.emblem.rotationSafeBounds.minY);
    }
  });
});
