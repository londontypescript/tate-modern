import type { Glyph } from 'opentype.js';
import { idChar } from '../../shared/idChar';
import type { Box, PathShape } from '../../shared/types';
import { glyphBounds, layoutTextRun, type PlacedGlyph } from '../../shared/typography';
import type { KernedFont } from '../wordmark/fonts';

/** A banner's text, outlined on one line. */
export interface BannerTextRun {
  shapes: PathShape[];
  /** Ink bounds of the letters that have any (a space has none). */
  ink: Box;
  baseline: number;
  fontSize: number;
}

/**
 * Refuses text the font can't draw. opentype.js gives a missing character
 * the font's blank `.notdef` glyph (index 0), which would leave a silent gap
 * in an outlined banner; a clear error is better than a banner that quietly
 * says something else.
 */
function assertDrawable({ font }: KernedFont, text: string) {
  for (const char of text) {
    if (font.charToGlyph(char).index !== 0) continue;
    const code = char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0');
    throw new Error(
      `Exo 2 Light (Latin) has no glyph for ${JSON.stringify(char)} (U+${code}), so it can't be outlined`,
    );
  }
}

/**
 * Sets `text` on one line with its pen starting at `x` on `baseline`,
 * kerned as a browser kerns it. As the wordmark does, each character is laid
 * out alone with no `previous` glyph, so typography.ts adds no kerning of
 * its own (opentype.js reads only part of Exo 2's), and the full pair
 * kerning from the font's GPOS table is added between them.
 */
export function setBannerText(
  { font, kerning }: KernedFont,
  text: string,
  { x: start, baseline, fontSize, fill }: { x: number; baseline: number; fontSize: number; fill: string },
): BannerTextRun {
  assertDrawable({ font, kerning }, text);
  const scale = fontSize / font.unitsPerEm;
  const inked: PlacedGlyph[] = [];
  const shapes: PathShape[] = [];
  let x = start;
  let previous: Glyph | undefined;
  for (const char of text) {
    const glyph = font.charToGlyph(char);
    if (previous) x += kerning(previous.index, glyph.index) * scale;
    const layout = layoutTextRun(font, char, { x, baseline, fontSize, letterSpacing: 0 });
    for (const g of layout.glyphs) {
      // A blank glyph's bounding box is (0, 0, 0, 0), not empty, so it would pull the ink box to the origin.
      if (g.commands.length === 0) continue;
      inked.push(g);
      shapes.push({ id: `text-${shapes.length}-${idChar(g.char)}`, d: g.d, fill });
    }
    x = layout.endX;
    previous = glyph;
  }
  // Never measure no glyphs at all: their bounds would be infinite.
  if (inked.length === 0) throw new Error(`${JSON.stringify(text)} has no letters to draw`);
  return { shapes, ink: glyphBounds(inked), baseline, fontSize };
}
