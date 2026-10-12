import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../scripts/node-fonts';
import type { LogoFonts } from './fonts';
import { crossbarRight, flattenCommands, horizontalStrokeEnd } from './outline';
import { curlGeometry, layoutTextRun, xHeightRatio } from './typography';
import { buildWordmark, defaultWordmarkConfig, wordmarkFontSizeForHeight } from './wordmark';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

describe('wordmark', () => {
  it('spans exactly the requested cap-top-to-baseline height', () => {
    const { lineSpacing } = defaultWordmarkConfig;
    const size = wordmarkFontSizeForHeight(fonts.serif, lineSpacing, 100);
    const wordmark = buildWordmark(defaultWordmarkConfig, fonts.serif, size);
    expect(wordmark.lastBaseline - wordmark.capTop).toBeCloseTo(100);
  });

  it('draws one outline per glyph plus two flourishes', () => {
    const size = 80;
    const wordmark = buildWordmark(defaultWordmarkConfig, fonts.serif, size);
    const glyphs = wordmark.shapes.filter((s) => s.id.startsWith('glyph-'));
    expect(glyphs).toHaveLength('London'.length + 'TypeScript'.length);
    expect(wordmark.shapes.filter((s) => s.id.startsWith('flourish-'))).toHaveLength(4);
    const noFlourish = buildWordmark({ ...defaultWordmarkConfig, flourishScale: 0 }, fonts.serif, size);
    expect(noFlourish.shapes).toHaveLength(glyphs.length);
  });

  it('colours "Script" with the accent and "Type" with ink', () => {
    const wordmark = buildWordmark(defaultWordmarkConfig, fonts.serif, 80);
    const [type, script] = defaultWordmarkConfig.lines[1].runs;
    const line2 = wordmark.shapes.filter((s) => s.id.startsWith('glyph-1-'));
    expect(line2.slice(0, 4).every((s) => s.fill === type?.colour)).toBe(true);
    expect(line2.slice(4).every((s) => s.fill === script?.colour)).toBe(true);
  });
});

describe('condensing', () => {
  it('narrows the letters by the requested factor without changing their height', () => {
    const glyphs = (condense: number) =>
      buildWordmark({ ...defaultWordmarkConfig, condense, flourishScale: 0 }, fonts.serif, 100);
    const wide = glyphs(1);
    const narrow = glyphs(0.8);
    const width = (w: typeof wide) => w.bounds.maxX - w.bounds.minX;
    expect(width(narrow) / width(wide)).toBeCloseTo(0.8, 1);
    expect(narrow.bounds.minY).toBeCloseTo(wide.bounds.minY);
    expect(narrow.bounds.maxY).toBeCloseTo(wide.bounds.maxY);
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
