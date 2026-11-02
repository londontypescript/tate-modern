import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk } from '../../../scripts/node-fonts';
import type { BubbleFonts } from '../wordmark/fonts';
import { layoutBanner } from './framing';
import { setBannerText } from './text';

let fonts: BubbleFonts;
beforeAll(async () => {
  fonts = await loadBubbleFontsFromDisk();
});

const at = { x: 100, baseline: 50, fontSize: 48, fill: '#000000' };

describe('a banner’s text', () => {
  it('is set in Exo 2 Light', () => {
    const names = fonts.bannerText.font.names as unknown as { windows: { fullName: { en: string } } };
    expect(names.windows.fullName.en).toBe('Exo 2 Light');
  });

  it('refuses a character the font lacks, naming it, rather than drawing a blank', () => {
    expect(() => setBannerText(fonts.bannerText, 'Łódź', at)).toThrow(/no glyph for "Ł" \(U\+0141\)/);
    expect(() => setBannerText(fonts.bannerText, 'Line\nbreak', at)).toThrow(/U\+000A/);
    expect(() => setBannerText(fonts.bannerText, 'Smile 😀', at)).toThrow(/U\+1F600/);
    const options = { text: '中文', theme: 'light', band: 'off', align: 'left', framing: 'strip' } as const;
    expect(() => layoutBanner(fonts, options)).toThrow(/no glyph/);
  });

  it('draws accented Latin letters and punctuation the font has', () => {
    const run = setBannerText(fonts.bannerText, 'Café & “Bar” <3', at);
    expect(run.shapes.length).toBe('Café&“Bar”<3'.length);
  });

  it('measures only the letters that have ink, so a space never pulls the bounds to the origin', () => {
    const run = setBannerText(fonts.bannerText, 'A B', at);
    expect(run.shapes.map((s) => s.id)).toEqual(['text-0-A', 'text-1-B']);
    expect(run.ink.minX).toBeGreaterThan(at.x - 1);
    expect(run.ink.maxY).toBeLessThanOrEqual(at.baseline + 1);
    expect(Number.isFinite(run.ink.minX + run.ink.minY + run.ink.maxX + run.ink.maxY)).toBe(true);
  });

  it('refuses text with no ink at all, which has no bounds to place', () => {
    expect(() => setBannerText(fonts.bannerText, '   ', at)).toThrow(/no letters to draw/);
    expect(() => setBannerText(fonts.bannerText, '', at)).toThrow(/no letters to draw/);
  });

  it('writes its outlines through the shared formatter: two decimals, never NaN, at awkward sizes too', () => {
    for (const fontSize of [48, 46.760055648400126, 33.3333, 7.1]) {
      for (const shape of setBannerText(fonts.bannerText, 'Tate Modern', { ...at, fontSize }).shapes) {
        expect(shape.d, `${fontSize} ${shape.id}`).toMatch(/^(?:[MLQCZ](?:-?\d+(?:\.\d{1,2})?(?: |(?=[MLQCZ]|$)))*)+$/);
        expect(shape.d).not.toContain('NaN');
      }
    }
  });

  it('gives each glyph an id safe in an attribute, whatever the text', () => {
    const run = setBannerText(fonts.bannerText, 'a"<b', at);
    for (const shape of run.shapes) expect(shape.id).toMatch(/^text-\d+-[A-Za-z0-9_-]+$/);
  });
});
