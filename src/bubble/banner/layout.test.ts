import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk } from '../../../scripts/node-fonts';
import { palette } from '../../shared/palette';
import type { Box } from '../../shared/types';
import { capHeightRatio } from '../../shared/typography';
import { bandColours, boxSize, sphereBounds, type Theme } from '../engine';
import type { BubbleFonts } from '../wordmark/fonts';
import { layoutBanner, type BannerOptions } from './framing';
import { bannerInk, strip, stripCanvas } from './layout';
import { setBannerText } from './text';

let fonts: BubbleFonts;
beforeAll(async () => {
  fonts = await loadBubbleFontsFromDisk();
});

const options = (o: Partial<BannerOptions> = {}): BannerOptions => ({
  text: 'Tate Modern',
  theme: 'light',
  band: 'off',
  align: 'left',
  framing: 'strip',
  ...o,
});
const banner = (o: Partial<BannerOptions> = {}) => layoutBanner(fonts, options(o)).content;
const placed = (box: Box, at: { x: number; y: number }): Box => ({
  minX: box.minX + at.x,
  minY: box.minY + at.y,
  maxX: box.maxX + at.x,
  maxY: box.maxY + at.y,
});
/** The wordmark's ink on the strip. */
const wordmarkInk = (content: ReturnType<typeof banner>) => placed(content.lockup.wordmarkInk, content.lockupAt);
/** Where the bubble's glass starts, on the strip. */
const glassLeft = (content: ReturnType<typeof banner>) =>
  content.lockupAt.x + sphereBounds.minX * (content.lockup.emblem.size / boxSize);
const text = (content: ReturnType<typeof banner>) => {
  if (!content.text) throw new Error('This banner has text');
  return content.text;
};

describe('the banner strip', () => {
  it('is 1200 × 208: the lockup’s 120-high layout box with 44 above and below', () => {
    expect(stripCanvas).toEqual({ width: 1200, height: 208 });
    const { lockup, lockupAt } = banner();
    const box = placed(lockup.box, lockupAt);
    expect(box.minY).toBe(44);
    expect(box.maxY).toBe(164);
    expect(box.maxX - box.minX).toBeCloseTo(385.46, 2);
  });

  it('keeps the lockup at half its 240 reference, so the wordmark is set at 48 and the bubble’s frame isn’t squeezed', () => {
    const { lockup } = banner();
    expect(lockup.emblem.size).toBe(120);
    expect(lockup.wordmark.fontSize).toBe(48);
  });

  it.each(['light', 'dark'] as const)(
    '%s: has no side margins: the glass meets the left edge, the text ends on the right',
    (theme) => {
      const content = banner({ theme });
      expect(glassLeft(content)).toBeCloseTo(0, 9);
      expect(text(content).ink.maxX).toBeCloseTo(1200, 9);
    },
  );

  it('sets the text’s capitals as tall as the wordmark’s, on the baseline of “TypeScript”, both from the lockup’s data', () => {
    const content = banner();
    const { lockup, lockupAt } = content;
    const run = text(content);
    expect(run.baseline).toBeCloseTo(lockupAt.y + lockup.offset.y + lockup.wordmark.baselines[1], 9);
    expect(run.baseline).toBeCloseTo(148.352, 3);
    // Exo 2's T stands on the baseline and reaches the cap height exactly, in both weights.
    const capOf = (font: typeof fonts.wordmark.font, size: number) =>
      -font.charToGlyph('T').getPath(0, 0, size).getBoundingBox().y1;
    expect(capOf(fonts.bannerText.font, run.fontSize)).toBeCloseTo(
      capOf(fonts.wordmark.font, lockup.wordmark.fontSize),
      9,
    );
    expect(capOf(fonts.bannerText.font, run.fontSize)).toBeCloseTo(
      capHeightRatio(fonts.wordmark.font) * lockup.wordmark.fontSize,
      9,
    );
    // "Tate Modern" opens with that T: its outline's lowest point is the baseline.
    const [first] = run.shapes;
    expect(first?.id).toBe('text-0-T');
    const ys = [...(first?.d ?? '').matchAll(/-?[\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...ys)).toBeCloseTo(run.baseline, 2);
  });

  it('inks the text in the wordmark’s own near-white on dark and pure black on light', () => {
    expect(bannerInk).toEqual({ light: '#000000', dark: palette.darkInk });
    for (const theme of ['light', 'dark'] as Theme[]) {
      const fills = new Set(text(banner({ theme })).shapes.map((s) => s.fill));
      expect(fills, theme).toEqual(new Set([theme === 'dark' ? '#f0f6fc' : '#000000']));
    }
  });

  it('leaves a short text at the wordmark’s cap height, however far it is from the wordmark', () => {
    for (const name of ['Tate Modern', 'Studio', 'A']) {
      const content = banner({ text: name });
      expect(text(content).fontSize, name).toBe(48);
      expect(text(content).ink.minX - wordmarkInk(content).maxX, name).toBeGreaterThan(strip.textGap);
    }
  });

  it('shrinks a long text only as far as keeps it 56 from the wordmark, still on the right edge and the baseline', () => {
    const content = banner({ text: 'A Very Long Repository Name Indeed' });
    expect(text(content).fontSize).toBeLessThan(48);
    expect(text(content).ink.minX - wordmarkInk(content).maxX).toBeCloseTo(56, 6);
    expect(text(content).ink.maxX).toBeCloseTo(1200, 6);
  });

  it('kerns the text as a browser does, from the font’s GPOS table, not opentype.js’s partial kerning', () => {
    const { font, kerning } = fonts.bannerText;
    const [t, a] = [font.charToGlyph('T'), font.charToGlyph('a')];
    // opentype.js reads none of Exo 2 Light's "Ta"; the table holds -99 units.
    expect(font.getKerningValue(t, a)).toBe(0);
    expect(kerning(t.index, a.index)).toBe(-99);
    const at = { x: 0, baseline: 0, fontSize: 48, fill: '#000000' };
    const width = (run: { ink: Box }) => run.ink.maxX - run.ink.minX;
    const kerned = setBannerText(fonts.bannerText, 'Ta', at);
    const unkerned = setBannerText({ font, kerning: () => 0 }, 'Ta', at);
    expect(width(unkerned) - width(kerned)).toBeCloseTo((99 * 48) / font.unitsPerEm, 9);
  });

  it('with no text, aligns the lockup left, centre or right, its glass and wordmark ink touching the chosen edges', () => {
    const left = banner({ text: '', align: 'left' });
    expect(left.text).toBeUndefined();
    expect(glassLeft(left)).toBeCloseTo(0, 9);
    const right = banner({ text: '', align: 'right' });
    expect(wordmarkInk(right).maxX).toBeCloseTo(1200, 9);
    const centre = banner({ text: '', align: 'centre' });
    expect((glassLeft(centre) + wordmarkInk(centre).maxX) / 2).toBeCloseTo(600, 9);
    for (const content of [left, right, centre]) expect(content.lockupAt.y).toBe(44);
  });

  it('treats text of only spaces as no text, and ignores the alignment when there is text', () => {
    expect(banner({ text: '   ' }).text).toBeUndefined();
    expect(banner({ text: '  ', align: 'right' }).lockupAt).toEqual(banner({ text: '', align: 'right' }).lockupAt);
    expect(banner({ align: 'right' }).lockupAt).toEqual(banner({ align: 'left' }).lockupAt);
  });

  it('names the banner by its text, or the lockup alone', () => {
    expect(banner().title).toBe('London TypeScript: Tate Modern');
    expect(banner({ text: '' }).title).toBe('London TypeScript');
  });
});

describe('the strip’s band', () => {
  it('is off, along the left or along the bottom, 14 thick, the full length of its edge', () => {
    expect(layoutBanner(fonts, options()).band).toBeUndefined();
    expect(layoutBanner(fonts, options({ band: 'left' })).band).toEqual({
      x: 0,
      y: 0,
      width: 14,
      height: 208,
      runs: 'down',
    });
    expect(layoutBanner(fonts, options({ band: 'bottom' })).band).toEqual({
      x: 0,
      y: 194,
      width: 1200,
      height: 14,
      runs: 'across',
    });
  });

  it('runs through the fan’s colours, back to front', () => {
    expect(bandColours).toEqual([
      palette.sunsetPlum,
      palette.sunsetMagenta,
      palette.sunsetPink,
      palette.sunsetOrange,
      palette.sunsetGold,
    ]);
  });

  it('beside a left band, starts the glass 40 clear of it, and leaves the text where it was', () => {
    const withBand = banner({ band: 'left' });
    expect(glassLeft(withBand)).toBeCloseTo(14 + 40, 9);
    expect(text(withBand).ink.maxX).toBeCloseTo(1200, 9);
    expect(glassLeft(banner({ band: 'bottom' }))).toBeCloseTo(0, 9);
  });

  it('keeps the lockup’s glow clear of a bottom band', () => {
    const { lockup, lockupAt } = banner({ band: 'bottom' });
    // The full bubble's frame hangs below its 240 box, to 253 in the drawing's units.
    const glowBottom = lockupAt.y + (253 * lockup.emblem.size) / boxSize;
    expect(glowBottom).toBeLessThanOrEqual(194);
  });
});
