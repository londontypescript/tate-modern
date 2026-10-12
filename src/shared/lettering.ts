import type { Font } from 'opentype.js';
import { capHeightRatio, glyphBounds, layoutTextRun, type PlacedGlyph } from './typography';

export interface TileLetteringOptions {
  text: string;
  /** Cap height as a fraction of the tile. */
  textScale: number;
  /** Gap to the right edge and below the baseline, as fractions of the tile. */
  offsetX: number;
  offsetY: number;
  /** Extra space between letters, in ems. */
  letterSpacing: number;
}

/** The tile's "TS", as in the flat concept's defaults. */
export const defaultTileLettering: TileLetteringOptions = {
  text: 'TS',
  textScale: 0.35,
  offsetX: 0.07,
  offsetY: 0.06,
  letterSpacing: -0.01,
};

/**
 * The tile lettering as outlines in a 100-unit tile centred on the origin
 * (y down), flush to the bottom-right margins. Renderers map this tile onto
 * whatever face carries the lettering.
 */
export function tileLettering(font: Font, options: TileLetteringOptions = defaultTileLettering): PlacedGlyph[] {
  const size = 100;
  const fontSize = (options.textScale * size) / capHeightRatio(font);
  const baseline = size / 2 - options.offsetY * size;
  const run = { baseline, fontSize, letterSpacing: options.letterSpacing };
  const measured = layoutTextRun(font, options.text, { ...run, x: 0 });
  const right = size / 2 - options.offsetX * size;
  return layoutTextRun(font, options.text, { ...run, x: right - glyphBounds(measured.glyphs).maxX }).glyphs;
}
