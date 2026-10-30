import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk } from '../../../scripts/node-fonts';
import { layoutTextRun } from '../../shared/typography';
import { wordmarkColours } from './colours';
import type { BubbleFonts } from './fonts';
import { buildBubbleWordmark, lineHeight } from './wordmark';

let fonts: BubbleFonts;
beforeAll(async () => {
  fonts = await loadBubbleFontsFromDisk();
});

const lineOf = (id: string) => Number(id.split('-')[1]);
const charOf = (id: string) => id.split('-')[3] ?? '';

describe('the bubble wordmark', () => {
  it('is set in Exo 2 Bold', () => {
    // opentype.js 2.0 keeps the name table per platform; its types predate that.
    const names = fonts.wordmark.font.names as unknown as { windows: { fullName: { en: string } } };
    expect(names.windows.fullName.en).toBe('Exo 2 Bold');
  });

  it('reads "London" over "TypeScript", one outline per letter', () => {
    const { shapes } = buildBubbleWordmark(fonts.wordmark, { fontSize: 40, theme: 'light' });
    const line = (n: number) =>
      shapes
        .filter((s) => lineOf(s.id) === n)
        .map((s) => charOf(s.id))
        .join('');
    expect(line(0)).toBe('London');
    expect(line(1)).toBe('TypeScript');
    expect(shapes).toHaveLength(16);
  });

  it.each(['light', 'dark'] as const)('colours "London" and "Type" in ink and "Script" in blue (%s)', (theme) => {
    const { shapes } = buildBubbleWordmark(fonts.wordmark, { fontSize: 40, theme });
    const { ink, blue } = wordmarkColours[theme];
    const fills = shapes.map((s) => s.fill);
    expect(fills.slice(0, 'LondonType'.length).every((f) => f === ink)).toBe(true);
    expect(fills.slice('LondonType'.length).every((f) => f === blue)).toBe(true);
  });

  it('draws every letter exactly as the font does, with no letter spacing', () => {
    const fontSize = 40;
    const { font, kerning } = fonts.wordmark;
    const scale = fontSize / font.unitsPerEm;
    const { shapes, pens, baselines } = buildBubbleWordmark(fonts.wordmark, { fontSize, theme: 'light' });
    shapes.forEach((shape, i) => {
      const char = charOf(shape.id);
      const baseline = baselines[lineOf(shape.id) as 0 | 1];
      const asDrawn = layoutTextRun(font, char, { x: pens[i] ?? NaN, baseline, fontSize, letterSpacing: 0 });
      expect(shape.d).toBe(asDrawn.glyphs[0]?.d);
      const next = shapes[i + 1];
      if (next && lineOf(next.id) === lineOf(shape.id)) {
        const [a, b] = [font.charToGlyph(char), font.charToGlyph(charOf(next.id))];
        const advance = ((a.advanceWidth ?? 0) + kerning(a.index, b.index)) * scale;
        expect((pens[i + 1] ?? NaN) - (pens[i] ?? NaN)).toBeCloseTo(advance, 9);
      }
    });
  });

  it('spaces its lines 1.05 em apart within two line heights', () => {
    const fontSize = 50;
    const { baselines, box } = buildBubbleWordmark(fonts.wordmark, { fontSize, theme: 'dark' });
    expect(baselines[1] - baselines[0]).toBeCloseTo(lineHeight * fontSize);
    expect(box.maxY - box.minY).toBeCloseTo(2 * lineHeight * fontSize);
    // Exo 2's ascent and descent are 0.999 and 0.201 em, so the half
    // leading is (1.05 - 1.2) / 2 em and the first baseline 0.924 em down.
    expect(baselines[0]).toBeCloseTo(0.924 * fontSize, 9);
  });

  it('matches the line widths Chrome measured for the reference lockup', () => {
    // Chrome, 30 October 2026: the reference lockup's CSS with the pinned
    // Exo 2 5.3.0 at 22.4 px (a 56 emblem) sets "London" 78.719 px and
    // "TypeScript" 113.891 px wide; Chrome rounds to 1/64 px.
    const { lineWidths } = buildBubbleWordmark(fonts.wordmark, { fontSize: 22.4, theme: 'light' });
    expect(Math.abs(lineWidths[0] - 78.719)).toBeLessThan(1 / 32);
    expect(Math.abs(lineWidths[1] - 113.891)).toBeLessThan(1 / 32);
  });
});
