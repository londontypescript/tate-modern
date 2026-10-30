import { describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk } from '../../../scripts/node-fonts';
import { readPairKerning } from './kerning';

/**
 * Kerning Chrome applied to the pinned Exo 2 Bold (5.3.0), in font units:
 * the width of each pair at 1000 px less its two letters' widths, measured
 * on a canvas on 30 October 2026. With `fontKerning = 'none'` every pair
 * measured 0, so these are the font's kerning and nothing else. They span
 * both pair formats and the extension lookups opentype.js skips.
 */
const chrome = {
  Ty: -56,
  To: -100,
  AV: -36,
  Av: -21,
  LT: -97,
  LV: -75,
  Yo: -74,
  Te: -100,
  'P.': -72,
  'r.': -52,
  ky: 0,
  Wa: -12,
  VA: -36,
  yo: -9,
  Fo: -16,
  ov: -9,
  ke: -18,
  On: 0,
  nd: 0,
};

describe('reading GPOS kerning', () => {
  it('gives the kerning Chrome applies to Exo 2', async () => {
    const { font, kerning } = (await loadBubbleFontsFromDisk()).wordmark;
    const read = Object.fromEntries(
      Object.keys(chrome).map((pair) => {
        const [a = '', b = ''] = pair;
        return [pair, kerning(font.charToGlyph(a).index, font.charToGlyph(b).index)];
      }),
    );
    expect(read).toEqual(chrome);
    // The reason for this reader: opentype.js finds no kerning for "Ty".
    expect(font.getKerningValue(font.charToGlyph('T'), font.charToGlyph('y'))).toBe(0);
  });

  it('refuses a file that is not WOFF', async () => {
    await expect(readPairKerning(new ArrayBuffer(64))).rejects.toThrow('Not a WOFF font');
  });
});
