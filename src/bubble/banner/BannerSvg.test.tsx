import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { bandColours, tileLettering } from '../engine';
import type { BubbleFonts } from '../wordmark/fonts';
import { BannerSvg } from './BannerSvg';
import { layoutBanner, type BannerOptions } from './framing';
import { renderBannerSvg } from './renderBanner';

let fonts: BubbleFonts;
let lettering: string;
beforeAll(async () => {
  fonts = await loadBubbleFontsFromDisk();
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
});

const layout = (o: Partial<BannerOptions> = {}) =>
  layoutBanner(fonts, { text: 'Tate Modern', theme: 'light', band: 'bottom', align: 'left', framing: 'strip', ...o });
const file = (o: Partial<BannerOptions> = {}) => renderBannerSvg(layout(o), lettering);
const ids = (svg: string) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] ?? '');
const refs = (svg: string) => [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1] ?? '');
const raster = (svg: string) => PNG.sync.read(new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng());

describe('the banner’s SVG', () => {
  it.each(['strip', 'meetup'] as const)('%s: needs no font and links to nothing outside itself', (framing) => {
    for (const theme of ['light', 'dark'] as const) {
      const svg = file({ framing, theme });
      expect(svg).not.toMatch(/<text|font-family|@font-face|<image|<use|href=/);
      for (const ref of refs(svg)) expect(ids(svg), ref).toContain(ref);
    }
  });

  it('is the same file every run', () => {
    expect(file()).toBe(file());
  });

  it('carries its pixel size, and the canvas as its viewBox', () => {
    expect(file()).toMatch(/^<\?xml[^>]*>\n<svg [^>]*width="1200" height="208" viewBox="0 0 1200 208"/);
    expect(file({ framing: 'meetup' })).toMatch(
      /^<\?xml[^>]*>\n<svg [^>]*width="1200" height="675" viewBox="0 0 1200 675"/,
    );
  });

  it('gives two banners on one page their own ids, each referring only to its own', () => {
    const html = renderToStaticMarkup(
      <>
        <BannerSvg layout={layout()} lettering={lettering} />
        <BannerSvg layout={layout()} lettering={lettering} />
        <BannerSvg layout={layout({ framing: 'meetup', band: 'left' })} lettering={lettering} />
      </>,
    );
    const all = ids(html);
    expect(all.filter((id, i) => all.indexOf(id) !== i)).toEqual([]);
    const banners = html.split('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200').slice(1);
    expect(banners).toHaveLength(3);
    for (const banner of banners) for (const ref of refs(banner)) expect(ids(banner), ref).toContain(ref);
  });

  it('escapes the text in its accessible name, and draws it only as outlines', () => {
    const svg = file({ text: '<b>&"Tate"' });
    expect(svg).toContain('aria-label="London TypeScript: &lt;b&gt;&amp;&quot;Tate&quot;"');
    expect(svg).toContain('<title>London TypeScript: &lt;b&gt;&amp;&quot;Tate&quot;</title>');
    expect(svg).not.toContain('<b>');
  });

  it('paints the band with the fan’s colours in order', () => {
    const svg = file({ band: 'left' });
    const gradient = /<linearGradient id="[^"]+-band"[^>]*>(.*?)<\/linearGradient>/.exec(svg)?.[1] ?? '';
    const stops = [...gradient.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1]);
    expect(stops).toEqual(bandColours);
    expect(file({ band: 'off' })).not.toMatch(/-band"/);
  });

  it('gives the lockup room for its glow below the layout box, not squeezing the bubble’s frame into it', () => {
    // The full bubble's frame is 253 of its 240 units tall: 126.5 at the strip's 120.
    expect(file()).toMatch(/<svg x="-4" y="44" width="385\.4\d" height="126\.5"/);
  });

  it('draws the full bubble, glass and glow, in both framings, however large the Meetup framing makes it', () => {
    for (const framing of ['strip', 'meetup'] as const) expect(file({ framing })).toContain('<feGaussianBlur');
  });

  it('rasterises the strip with a transparent ground, and the Meetup framing as an opaque 1200 × 675', () => {
    const strip = raster(file({ band: 'off' }));
    expect({ width: strip.width, height: strip.height }).toEqual({ width: 1200, height: 208 });
    expect(strip.data[3]).toBe(0);
    for (const theme of ['light', 'dark'] as const) {
      for (const band of ['off', 'left', 'bottom'] as const) {
        const png = raster(file({ framing: 'meetup', theme, band }));
        expect({ width: png.width, height: png.height }).toEqual({ width: 1200, height: 675 });
        let translucent = 0;
        for (let i = 3; i < png.data.length; i += 4) if (png.data[i] !== 255) translucent++;
        expect(translucent, `${theme} ${band}`).toBe(0);
      }
    }
  });
});
