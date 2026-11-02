import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bubbleFontFiles } from '../../shared/fonts';
import type { KernedFont } from './fonts';
import { loadBubbleFonts } from './fonts.browser';

const require = createRequire(import.meta.url);

afterEach(() => {
  vi.unstubAllGlobals();
});

const kerns = ({ font, kerning }: KernedFont, [left = '', right = '']: string) =>
  kerning(font.charToGlyph(left).index, font.charToGlyph(right).index);

describe('the browser loader', () => {
  it('fetches the pinned Exo 2 Bold and Light once each, and parses them with their kerning', async () => {
    const files = [
      ['exo-2-latin-700-normal.woff', await readFile(require.resolve(bubbleFontFiles.wordmark))],
      ['exo-2-latin-300-normal.woff', await readFile(require.resolve(bubbleFontFiles.bannerText))],
    ] as const;
    const fetch = vi.fn((url: string) => {
      const bytes = files.find(([name]) => url.includes(name))?.[1];
      return Promise.resolve(bytes ? new Response(bytes) : new Response(null, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetch);

    const [first, second] = await Promise.all([loadBubbleFonts(), loadBubbleFonts()]);
    expect(second).toBe(first);
    // One request per font file, however many callers ask: the wordmark's Bold and the banner text's Light.
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining('exo-2-latin-700-normal.woff'),
      expect.stringContaining('exo-2-latin-300-normal.woff'),
    ]);
    expect(kerns(first.wordmark, 'Ty')).toBe(-56);
    expect(kerns(first.bannerText, 'Ty')).toBe(-75);
  });
});
