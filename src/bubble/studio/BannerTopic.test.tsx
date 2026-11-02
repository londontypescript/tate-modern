import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { layoutBanner, type BannerOptions } from '../banner';
import { tileLettering } from '../engine';
import type { BubbleFonts } from '../wordmark/fonts';
import { bannerFiles, BannerTopic } from './BannerTopic';

let fonts: BubbleFonts;
let lettering: string;
beforeAll(async () => {
  fonts = await loadBubbleFontsFromDisk();
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
});

const topic = (initial?: Partial<BannerOptions>) =>
  renderToStaticMarkup(<BannerTopic fonts={fonts} lettering={lettering} initial={initial} />);
const options = (o: Partial<BannerOptions> = {}): BannerOptions => ({
  text: '',
  theme: 'light',
  band: 'off',
  align: 'left',
  framing: 'strip',
  ...o,
});

/** The pressed choice in each group, and whether the group's buttons are off. */
function groups(html: string) {
  return Object.fromEntries(
    [...html.matchAll(/role="group" aria-label="([^"]+)"(.*?)<\/div>/g)].map(([, name = '', body = '']) => [
      name,
      { pressed: /aria-pressed="true"[^>]*>([^<]+)</.exec(body)?.[1], disabled: body.includes('disabled=""') },
    ]),
  );
}

/** The download buttons' attributes, by label. */
const buttons = (html: string): Partial<Record<'SVG' | 'PNG', string>> =>
  Object.fromEntries(
    [...html.matchAll(/<button type="button"([^>]*)>(SVG|PNG)<\/button>/g)].map((m) => [m[2] ?? '', m[1] ?? '']),
  );

/** The preview's drawing with its ids, written size and class taken out: what it draws, and nothing about where. */
const drawn = (svg: string) => {
  const prefix = / id="(lts-[0-9a-f]{32}|lts[A-Za-z0-9_]*)-/.exec(svg)?.[1];
  if (!prefix) throw new Error('No id prefix found');
  return svg
    .replace(/^<\?xml[^>]*>\n/, '')
    .trim()
    .replaceAll(prefix, 'ID')
    .replace(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="[\d.]+" height="[\d.]+"/,
      '<svg xmlns="http://www.w3.org/2000/svg"',
    )
    .replace(' class="block h-auto w-full"', '');
};
const preview = (html: string) => /<svg xmlns.*<\/svg>/.exec(html)?.[0] ?? '';

describe('the studio’s Banner topic', () => {
  it('opens on the command’s defaults: the light lockup alone as a strip, ready to download', () => {
    const html = topic();
    expect(groups(html)).toEqual({
      Theme: { pressed: 'Light', disabled: false },
      Band: { pressed: 'Off', disabled: false },
      Alignment: { pressed: 'Left', disabled: false },
      Framing: { pressed: 'Strip, 1200 × 208', disabled: false },
    });
    expect(html).toMatch(/<input [^>]*type="text"[^>]*value=""/);
    expect(buttons(html).SVG).not.toContain('disabled=""');
    expect(preview(html)).toContain('<title>London TypeScript</title>');
  });

  // With text the lockup is always on the left; an alignment that looked changeable would silently do nothing.
  it('turns the alignment off while there is text', () => {
    expect(groups(topic({ text: 'Tate Modern' })).Alignment?.disabled).toBe(true);
    expect(groups(topic({ text: '   ' })).Alignment?.disabled).toBe(false);
  });

  it.each([
    options(),
    options({ text: 'Tate Modern', band: 'bottom' }),
    options({ text: 'Little Venice', theme: 'dark', band: 'left' }),
    options({ align: 'centre', framing: 'meetup', theme: 'dark', band: 'bottom' }),
    options({ text: 'Grand Union', framing: 'meetup', band: 'left' }),
  ])('previews exactly what the download writes: %o', (o) => {
    const file = bannerFiles(layoutBanner(fonts, o), lettering).svg();
    expect(drawn(preview(topic(o)))).toBe(drawn(file));
  });

  it('downloads the README’s own banner byte for byte, under the name the README uses', () => {
    for (const theme of ['light', 'dark'] as const) {
      const files = bannerFiles(
        layoutBanner(fonts, options({ text: 'Tate Modern', band: 'bottom', theme })),
        lettering,
      );
      const svg = files.svg();
      const name = files.fileName('svg', svg);
      expect(name).toMatch(new RegExp(`^tate-modern-${theme}-band-bottom-[0-9a-f]{8}\\.svg$`));
      expect(readFileSync(new URL(`../../../docs/images/${name}`, import.meta.url), 'utf8')).toBe(svg);
    }
  });

  it('names the PNG as its SVG, at the framing’s own size, and never lets the text steer the name', () => {
    for (const framing of ['strip', 'meetup'] as const) {
      const files = bannerFiles(layoutBanner(fonts, options({ text: '../../etc/passwd', framing })), lettering);
      const svg = files.svg();
      expect(files.fileName('svg', svg)).toMatch(/^etc-passwd-(?:meetup-)?light-[0-9a-f]{8}\.svg$/);
      expect(files.fileName('png', svg)).toBe(files.fileName('svg', svg).replace(/\.svg$/, '.png'));
      expect(files.size).toEqual(framing === 'strip' ? { width: 1200, height: 208 } : { width: 1200, height: 675 });
    }
  });

  it('shows the text only as React escapes it: markup typed in stays text', () => {
    const typed = '"><img src=x onerror=alert(1)>';
    const html = topic({ text: typed });
    expect(html).not.toMatch(/<img/);
    expect(html).toContain('value="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"');
    expect(preview(html)).toContain('<title>London TypeScript: &quot;&gt;&lt;img src=x onerror=alert(1)&gt;</title>');
  });

  it('shows an error naming a character the font lacks, never a blank, and offers no download', () => {
    const html = topic({ text: 'Łódź' });
    expect(html).toMatch(
      /role="alert"[^>]*>The banner can’t be drawn: Exo 2 Light \(Latin\) has no glyph for &quot;Ł&quot; \(U\+0141\)/,
    );
    expect(preview(html)).toBe('');
    expect(buttons(html).SVG).toContain('disabled=""');
    expect(buttons(html).PNG).toContain('disabled=""');
  });
});
