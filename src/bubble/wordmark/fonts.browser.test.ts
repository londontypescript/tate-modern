import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bubbleFontFiles } from '../../shared/fonts';
import { loadBubbleFonts } from './fonts.browser';

const require = createRequire(import.meta.url);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the browser loader', () => {
  it('fetches the pinned Exo 2 Bold once, and parses it with its kerning', async () => {
    const bytes = await readFile(require.resolve(bubbleFontFiles.wordmark));
    const fetch = vi.fn(() => Promise.resolve(new Response(bytes)));
    vi.stubGlobal('fetch', fetch);

    const [first, second] = await Promise.all([loadBubbleFonts(), loadBubbleFonts()]);
    expect(second).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toEqual([expect.stringContaining('exo-2-latin-700-normal.woff')]);
    const { font, kerning } = first.wordmark;
    expect(kerning(font.charToGlyph('T').index, font.charToGlyph('y').index)).toBe(-56);
  });
});
