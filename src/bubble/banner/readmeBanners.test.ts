import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { themes, tileLettering } from '../engine';
import { layoutBanner, type BannerOptions } from './framing';
import { bannerFileName, renderBannerSvg } from './renderBanner';

/**
 * tate-modern's own README banners, kept in docs/images/ rather than
 * public/assets/ since they belong to this repo's README, not the logo's
 * asset set. Regenerated here, so a change to the logo or the banner's rules
 * can't leave the README showing a stale drawing.
 */
const readme = { text: 'Tate Modern', band: 'bottom', align: 'left', framing: 'strip' } as const;
const imagesDir = new URL('../../../docs/images/', import.meta.url);
const regenerate = [
  'The README’s banners are stale. Regenerate them with',
  '  pnpm banner --text "Tate Modern" --band bottom --out docs/images',
  'then point README.md’s <picture> at the new files and git rm the old ones.',
].join('\n');

let banners: { theme: string; name: string; svg: string }[];
beforeAll(async () => {
  const fonts = await loadBubbleFontsFromDisk();
  const lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
  banners = themes.map((theme) => {
    const options: BannerOptions = { ...readme, theme };
    const svg = renderBannerSvg(layoutBanner(fonts, options), lettering);
    return { theme, name: bannerFileName(options, svg, 'svg'), svg };
  });
});

describe('the README’s banners', () => {
  it('are the banner command’s current output, byte for byte', () => {
    const stale = banners
      .filter(
        ({ name, svg }) =>
          !existsSync(new URL(name, imagesDir)) || readFileSync(new URL(name, imagesDir), 'utf8') !== svg,
      )
      .map(({ name }) => name);
    expect(stale, regenerate).toEqual([]);
  });

  it('are what the README shows: the dark file for a dark page, the light one otherwise', () => {
    const readmeText = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');
    const picture = /<picture>([\s\S]*?)<\/picture>/.exec(readmeText)?.[1] ?? '';
    const dark = /<source media="\(prefers-color-scheme: dark\)" srcset="docs\/images\/([^"]+)">/.exec(picture)?.[1];
    const light = /<img [^>]*src="docs\/images\/([^"]+)"/.exec(picture)?.[1];
    const named = Object.fromEntries(banners.map((b) => [b.theme, b.name]));
    expect({ dark, light }, regenerate).toEqual({ dark: named.dark, light: named.light });
  });

  it('leave no earlier banner behind in docs/images', () => {
    const kept = readdirSync(imagesDir).filter((file) => file.startsWith('tate-modern-') && file.endsWith('.svg'));
    expect(kept.sort(), regenerate).toEqual(banners.map((b) => b.name).sort());
  });
});
