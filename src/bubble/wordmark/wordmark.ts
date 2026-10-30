import type { Glyph } from 'opentype.js';
import { idChar } from '../../shared/idChar';
import type { Box, PathShape } from '../../shared/types';
import { glyphBounds, layoutTextRun, type PlacedGlyph } from '../../shared/typography';
import type { Theme } from '../engine/types';
import { wordmarkColours } from './colours';
import type { KernedFont } from './fonts';

/**
 * The bubble's wordmark: "London" over "TypeScript", left-aligned, in Exo 2
 * Bold as drawn (no condensing, indent, letter spacing or flourishes), with
 * "Type" upright in ink and "Script" in blue.
 */
const wordmarkLines = [
  [{ text: 'London', colour: 'ink' }],
  [
    { text: 'Type', colour: 'ink' },
    { text: 'Script', colour: 'blue' },
  ],
] as const satisfies readonly (readonly { text: string; colour: 'ink' | 'blue' }[])[];

/** Line height in ems, as the reference lockup's CSS sets it. */
export const lineHeight = 1.05;

export interface BubbleWordmark {
  shapes: PathShape[];
  /** Pen position of each shape's glyph, in the same order. */
  pens: number[];
  /** Ink bounds of the letters. */
  inkBounds: Box;
  /**
   * The two line boxes a browser would lay out: x from the first pen
   * position to the longer line's advance, y from 0 to two line heights.
   */
  box: Box;
  /** Baseline of each line. */
  baselines: readonly [number, number];
  /** Advance width of each line. */
  lineWidths: readonly [number, number];
  fontSize: number;
}

/**
 * Lays out the wordmark at `fontSize`, as a browser sets it with
 * `line-height: 1.05`: each line's baseline sits half the leading below its
 * line box's top plus the font's ascent, the leading being the line height
 * less ascent and descent (negative here, since Exo 2's are 1.2 em). In
 * wordmark space the first line box starts at (0, 0).
 */
export function buildBubbleWordmark(
  { font, kerning }: KernedFont,
  { fontSize, theme }: { fontSize: number; theme: Theme },
): BubbleWordmark {
  const scale = fontSize / font.unitsPerEm;
  const ascent = font.ascender * scale;
  const descent = -font.descender * scale;
  const lineBox = lineHeight * fontSize;
  const firstBaseline = (lineBox - ascent - descent) / 2 + ascent;
  const baselines = [firstBaseline, firstBaseline + lineBox] as const;
  const colours = wordmarkColours[theme];

  const shapes: PathShape[] = [];
  const pens: number[] = [];
  const placed: PlacedGlyph[] = [];
  const setLine = (line: (typeof wordmarkLines)[number], lineIndex: 0 | 1) => {
    const baseline = baselines[lineIndex];
    let x = 0;
    let previous: Glyph | undefined;
    let glyphIndex = 0;
    for (const run of line) {
      for (const char of run.text) {
        const glyph = font.charToGlyph(char);
        if (previous) x += kerning(previous.index, glyph.index) * scale;
        // One glyph at a time with no `previous`, so typography.ts adds no
        // kerning of its own: opentype.js reads only part of Exo 2's, and
        // `kerning` already holds all of it.
        const layout = layoutTextRun(font, char, { x, baseline, fontSize, letterSpacing: 0 });
        for (const g of layout.glyphs) {
          placed.push(g);
          pens.push(g.x);
          shapes.push({
            id: `glyph-${lineIndex}-${glyphIndex++}-${idChar(g.char)}`,
            d: g.d,
            fill: colours[run.colour],
          });
        }
        x = layout.endX;
        previous = glyph;
      }
    }
    return x;
  };
  const lineWidths = [setLine(wordmarkLines[0], 0), setLine(wordmarkLines[1], 1)] as const;

  return {
    shapes,
    pens,
    inkBounds: glyphBounds(placed),
    box: { minX: 0, minY: 0, maxX: Math.max(...lineWidths), maxY: 2 * lineBox },
    baselines,
    lineWidths,
    fontSize,
  };
}
