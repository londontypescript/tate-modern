import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../scripts/node-fonts';
import { defaultLogoConfig } from './config';
import type { LogoFonts } from './fonts';
import { buildLogo, buildWordmark, wordmarkFontSizeForHeight } from './geometry';
import { crossbarRight, flattenCommands, horizontalStrokeEnd } from './outline';
import { capHeightRatio, curlGeometry, layoutTextRun, xHeightRatio } from './typography';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

describe('wordmark', () => {
  it('spans exactly the requested cap-top-to-baseline height', () => {
    const { lineSpacing } = defaultLogoConfig.wordmark;
    const size = wordmarkFontSizeForHeight(fonts.serif, lineSpacing, 100);
    const wordmark = buildWordmark(defaultLogoConfig.wordmark, fonts.serif, size);
    expect(wordmark.lastBaseline - wordmark.capTop).toBeCloseTo(100);
  });

  it('draws one outline per glyph plus two flourishes', () => {
    const size = 80;
    const wordmark = buildWordmark(defaultLogoConfig.wordmark, fonts.serif, size);
    const glyphs = wordmark.shapes.filter((s) => s.id.startsWith('glyph-'));
    expect(glyphs).toHaveLength('London'.length + 'TypeScript'.length);
    expect(wordmark.shapes.filter((s) => s.id.startsWith('flourish-'))).toHaveLength(4);
    const noFlourish = buildWordmark({ ...defaultLogoConfig.wordmark, flourishScale: 0 }, fonts.serif, size);
    expect(noFlourish.shapes).toHaveLength(glyphs.length);
  });

  it('colours "Script" with the accent and "Type" with ink', () => {
    const wordmark = buildWordmark(defaultLogoConfig.wordmark, fonts.serif, 80);
    const [type, script] = defaultLogoConfig.wordmark.lines[1].runs;
    const line2 = wordmark.shapes.filter((s) => s.id.startsWith('glyph-1-'));
    expect(line2.slice(0, 4).every((s) => s.fill === type?.colour)).toBe(true);
    expect(line2.slice(4).every((s) => s.fill === script?.colour)).toBe(true);
  });
});

describe('curl flourishes', () => {
  it('mirror each other horizontally', () => {
    const base = { origin: { x: 0, y: 0 }, rootWidth: 2, capHeight: 50, scale: 1 };
    const left = curlGeometry({ ...base, direction: -1 });
    const right = curlGeometry({ ...base, direction: 1 });
    expect(left.ballCentre.x).toBeCloseTo(-right.ballCentre.x);
    expect(left.bounds.minX).toBeCloseTo(-right.bounds.maxX);
    expect(left.bounds.minY).toBeCloseTo(right.bounds.minY);
  });

  it('starts flush with the stroke it continues', () => {
    const curl = curlGeometry({ origin: { x: 10, y: 20 }, rootWidth: 3, direction: 1, capHeight: 50, scale: 1 });
    const first = curl.stroke[0];
    const last = curl.stroke.at(-1);
    expect(first).toEqual({ x: 10, y: 21.5 });
    expect(last).toEqual({ x: 10, y: 18.5 });
  });
});

describe('flourish joins', () => {
  const measure = (char: string) => {
    const [glyph] = layoutTextRun(fonts.serif, char, { x: 0, baseline: 0, fontSize: 1000, letterSpacing: 0 }).glyphs;
    return { glyph: glyph!, contours: flattenCommands(glyph!.commands) };
  };

  it('finds the top-left serif of the L at the cap line', () => {
    const { glyph, contours } = measure('L');
    const join = horizontalStrokeEnd(contours, glyph.bounds.minY + 15, 'left', 40);
    expect(join).toBeDefined();
    expect(join!.top).toBeCloseTo(glyph.bounds.minY, -1);
    expect(join!.origin.x).toBeCloseTo(glyph.bounds.minX + 40);
    expect(join!.thickness).toBeGreaterThan(5);
    expect(join!.thickness).toBeLessThan(80);
  });

  it('finds the crossbar of the t near the x-height, right of the stem', () => {
    const { glyph, contours } = measure('t');
    const xHeight = xHeightRatio(fonts.serif) * 1000;
    const join = crossbarRight(contours, -xHeight / 2, 20, 40);
    expect(join).toBeDefined();
    expect(join!.top).toBeGreaterThan(-xHeight - 60);
    expect(join!.top).toBeLessThan(-xHeight + 60);
    expect(join!.origin.x).toBeGreaterThan(glyph.bounds.maxX - 100);
    expect(join!.thickness).toBeLessThan(60);
  });
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
