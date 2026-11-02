import { describe, expect, it } from 'vitest';
import type { BannerOptions } from './framing';
import { bannerFileName, bannerSlug } from './renderBanner';

const options = (o: Partial<BannerOptions> = {}): BannerOptions => ({
  text: 'Tate Modern',
  theme: 'light',
  band: 'bottom',
  align: 'left',
  framing: 'strip',
  ...o,
});

describe('a banner’s file name', () => {
  it('slugs the text to lower-case letters and digits joined by hyphens, accents dropped', () => {
    expect(bannerSlug('Tate Modern')).toBe('tate-modern');
    expect(bannerSlug('  Café Société 2026  ')).toBe('cafe-societe-2026');
    expect(bannerSlug('Grand_Union/Canal')).toBe('grand-union-canal');
  });

  it('never lets the text steer the path: no dots, slashes or other characters survive', () => {
    for (const text of ['../../etc/passwd', '..\\..\\Windows', '/abs/path', 'a\0b', '.hidden', 'CON', '‮gnp.exe']) {
      expect(bannerSlug(text), text).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
    expect(bannerSlug('../../etc/passwd')).toBe('etc-passwd');
  });

  it('falls back to the lockup’s own name when the text gives nothing to slug', () => {
    expect(bannerSlug('')).toBe('london-typescript');
    expect(bannerSlug('“…”')).toBe('london-typescript');
  });

  it('keeps a long text’s part of the name to 40 characters, never ending on a hyphen', () => {
    const slug = bannerSlug('The Quite Remarkably Long Name Of A Repository Somewhere');
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug).not.toMatch(/-$/);
  });

  it('names what the banner shows, then the drawing’s hash', () => {
    expect(bannerFileName(options(), 'drawing', 'svg')).toMatch(/^tate-modern-light-band-bottom-[0-9a-f]{8}\.svg$/);
    expect(bannerFileName(options({ framing: 'meetup', theme: 'dark', band: 'off' }), 'd', 'png')).toMatch(
      /^tate-modern-meetup-dark-[0-9a-f]{8}\.png$/,
    );
    // With no text the alignment is part of what it shows; with text it changes nothing.
    expect(bannerFileName(options({ text: '', align: 'centre', band: 'off' }), 'd', 'svg')).toMatch(
      /^london-typescript-light-centre-[0-9a-f]{8}\.svg$/,
    );
  });

  it('changes when the drawing changes, so caches by address never show a stale banner, and not otherwise', () => {
    const a = bannerFileName(options(), '<svg>one</svg>', 'svg');
    expect(bannerFileName(options(), '<svg>one</svg>', 'svg')).toBe(a);
    expect(bannerFileName(options(), '<svg>two</svg>', 'svg')).not.toBe(a);
    // The PNG is its SVG rasterised, so it takes the same name.
    expect(bannerFileName(options(), '<svg>one</svg>', 'png')).toBe(a.replace(/\.svg$/, '.png'));
  });
});
