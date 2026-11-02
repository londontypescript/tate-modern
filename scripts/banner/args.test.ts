import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseBannerArgs } from './args';
import { outputPath } from './output';

describe('the banner command’s arguments', () => {
  it('default to both themes of a plain strip with no text, as SVG', () => {
    expect(parseBannerArgs(['--out', 'x'])).toEqual({
      banners: [
        { text: '', theme: 'light', band: 'off', align: 'left', framing: 'strip' },
        { text: '', theme: 'dark', band: 'off', align: 'left', framing: 'strip' },
      ],
      formats: ['svg'],
      outDir: 'x',
    });
  });

  it('take the text, one theme, a band, the framing and both formats', () => {
    const command = parseBannerArgs([
      '--text',
      'Tate Modern',
      '--theme',
      'dark',
      '--band',
      'bottom',
      '--framing',
      'meetup',
      '--format',
      'both',
      '--out',
      'docs/images',
    ]);
    expect(command).toEqual({
      banners: [{ text: 'Tate Modern', theme: 'dark', band: 'bottom', align: 'left', framing: 'meetup' }],
      formats: ['svg', 'png'],
      outDir: 'docs/images',
    });
  });

  it('take an alignment for a banner with no text, and refuse one with text, where it would do nothing', () => {
    expect(parseBannerArgs(['--align', 'centre', '--out', 'x'])?.banners[0]?.align).toBe('centre');
    // A newline is text (and an error when drawn), not an empty banner the alignment would apply to.
    expect(() => parseBannerArgs(['--text', '\n', '--align', 'right', '--out', 'x'])).toThrow(/only to a banner/);
    expect(() => parseBannerArgs(['--text', 'Tate', '--align', 'right', '--out', 'x'])).toThrow(
      /only to a banner with no text/,
    );
  });

  it('refuse a value outside the choices, naming them', () => {
    expect(() => parseBannerArgs(['--band', 'top', '--out', 'x'])).toThrow('--band must be one of off, left, bottom');
    expect(() => parseBannerArgs(['--theme', 'blue', '--out', 'x'])).toThrow(/light, dark, both/);
    expect(() => parseBannerArgs(['--format', 'jpg', '--out', 'x'])).toThrow(/svg, png, both/);
    expect(() => parseBannerArgs(['--framing', 'poster', '--out', 'x'])).toThrow(/strip, meetup/);
  });

  it('need a folder to write into, and refuse anything unknown', () => {
    expect(() => parseBannerArgs([])).toThrow(/--out is required/);
    expect(() => parseBannerArgs(['--out', 'x', '--colour', 'red'])).toThrow();
    expect(() => parseBannerArgs(['--out', 'x', 'stray'])).toThrow();
  });

  it('ask only for help when given --help', () => {
    expect(parseBannerArgs(['--help'])).toBeUndefined();
  });
});

describe('where the banner command writes', () => {
  it('puts a banner’s file directly inside the folder given', () => {
    expect(outputPath('docs/images', 'tate-modern-light-1a2b3c4d.svg')).toBe(
      join(resolve('docs/images'), 'tate-modern-light-1a2b3c4d.svg'),
    );
  });

  it('refuses any name that isn’t a slug, so nothing lands outside the folder', () => {
    for (const name of ['../x.svg', 'a/b.svg', '/abs.svg', '.svg', 'x.html', 'X.svg', 'a--b.svg', 'a\\b.svg', '']) {
      expect(() => outputPath('out', name), name).toThrow(/Not a safe banner file name/);
    }
  });
});
