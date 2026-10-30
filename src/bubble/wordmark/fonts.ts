import * as opentypeNamespace from 'opentype.js';
import type { Font } from 'opentype.js';
import type { BubbleFontRole } from '../../shared/fonts';
import { readPairKerning, type PairKerning } from './kerning';

/** A parsed font with the kerning a browser would apply to it. */
export interface KernedFont {
  font: Font;
  kerning: PairKerning;
}

export interface BubbleFonts {
  /** Exo 2 Bold, for the wordmark. */
  wordmark: KernedFont;
}

// opentype.js ships a UMD build for Node and the browser, so the module
// namespace may hide its API behind `default` (as in shared/fonts.ts).
const opentype: typeof opentypeNamespace =
  (opentypeNamespace as unknown as { default?: typeof opentypeNamespace }).default ?? opentypeNamespace;

/**
 * Parses the bubble's font files (`bubbleFontFiles`). Each environment
 * loads the bytes its own way, as for the frozen concepts' fonts.
 */
export async function parseBubbleFonts(buffers: Record<BubbleFontRole, ArrayBuffer>): Promise<BubbleFonts> {
  return {
    wordmark: { font: opentype.parse(buffers.wordmark), kerning: await readPairKerning(buffers.wordmark) },
  };
}
