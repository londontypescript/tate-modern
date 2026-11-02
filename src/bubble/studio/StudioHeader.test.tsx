import { use } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { bandColours, tileLettering } from '../engine';
import type { BubbleFonts } from '../wordmark/fonts';
import { HeaderBanner, StudioHeader } from './StudioHeader';
import { pageColumn } from './TopicLayout';

let fonts: BubbleFonts;
let lettering: string;
beforeAll(async () => {
  fonts = await loadBubbleFontsFromDisk();
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
});

/** Never resolves, as the fonts are while they load. */
const loading = new Promise<never>(() => undefined);
function StillLoading(): null {
  use(loading);
  return null;
}

const drawnHeader = () =>
  renderToStaticMarkup(<StudioHeader banner={<HeaderBanner fonts={fonts} lettering={lettering} />} />);
const loadingHeader = () => renderToStaticMarkup(<StudioHeader banner={<StillLoading />} />);

const heading = (html: string) => /<h1[^>]*>(.*)<\/h1>/.exec(html)?.[1] ?? '';

/** The heading's name as assistive technology reads it: its text, leaving out whatever is hidden from it. */
const accessibleName = (html: string) =>
  heading(html)
    .replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>.*?<\/\1>/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();

/** The box the banner is drawn in, as the page lays it out. */
const bannerBox = (html: string) => /<span aria-hidden="true" data-header-banner="true"[^>]*>/.exec(html)?.[0];

describe('the studio’s header', () => {
  it('keeps the heading’s name, "London TypeScript Studio", whether or not the fonts are in', () => {
    expect(accessibleName(drawnHeader())).toBe('London TypeScript Studio');
    expect(accessibleName(loadingHeader())).toBe('London TypeScript Studio');
  });

  it('draws the light banner with the text "Studio" and a bottom band, in place of a border', () => {
    const html = drawnHeader();
    const svg = /<svg .*<\/svg>/.exec(heading(html))?.[0] ?? '';
    expect(svg).toContain('<title>London TypeScript: Studio</title>');
    expect(svg).toContain('viewBox="0 0 1200 208"');
    // The band's rectangle runs the strip's whole width along its foot, in the sunset's colours.
    expect(svg).toMatch(/<rect x="0" y="194" width="1200" height="14" fill="url\(#[^)]+-band\)"/);
    for (const colour of bandColours) expect(svg.toLowerCase()).toContain(colour.toLowerCase());
    expect(/<header class="([^"]*)"/.exec(html)?.[1]).not.toMatch(/\bborder/);
  });

  it('holds the strip’s shape while the fonts load, so nothing below moves when the banner appears', () => {
    const box = 'style="aspect-ratio:1200 / 208"';
    // An inline box ignores aspect-ratio and would collapse to no height, so the box must be a block too.
    for (const html of [loadingHeader(), drawnHeader()]) {
      expect(bannerBox(html)).toContain(box);
      expect(/class="([^"]*)"/.exec(bannerBox(html) ?? '')?.[1]?.split(' ')).toContain('block');
    }
    expect(heading(loadingHeader())).not.toContain('<svg');
  });

  // The link to the 0.4.0 studio is in the topic bar, so the banner has the header, and the page's width, to itself.
  it('holds only the heading, its banner spanning the page’s content column', () => {
    for (const html of [drawnHeader(), loadingHeader()]) {
      expect(/<header[^>]*>(.*)<\/header>/.exec(html)?.[1]).toMatch(new RegExp(`^<h1 class="${pageColumn}">.*</h1>$`));
      expect(bannerBox(html)).toMatch(/class="block w-full"/);
    }
  });
});
