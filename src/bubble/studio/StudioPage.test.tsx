import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { palette } from '../../shared/palette';
import { details, tileLettering, type Theme } from '../engine';
import { previewSizes } from './Previews';
import { StudioPage } from './StudioPage';
import { pageColumn } from './TopicLayout';

let markup: string;
beforeAll(async () => {
  const lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
  const fonts = await loadBubbleFontsFromDisk();
  markup = renderToStaticMarkup(<StudioPage lettering={lettering} fonts={fonts} />);
});

/** Each topic's section, by id, in page order. */
function sections() {
  return markup
    .split('<section ')
    .slice(1)
    .map((html) => ({ id: /^id="([\w-]+)"/.exec(html)?.[1] ?? '', html: html.split('</section>')[0] ?? '' }));
}

/** A section's column for `theme`: its panel's colour, and the themes its images are titled or described with. */
function column(html: string, theme: Theme) {
  const col = html.split(`data-theme="${theme}"`)[1]?.split('data-theme=')[0];
  if (col === undefined) throw new Error(`no ${theme} column`);
  const words = [...col.matchAll(/<title>([^<]*)<\/title>|alt="([^"]*)"/g)].map((m) => m[1] ?? m[2] ?? '');
  const named = new Set(words.flatMap((w) => /\b(light|dark)\b/.exec(w)?.[1] ?? []));
  return {
    ground: /background-color:(#[0-9a-f]{6})/.exec(col)?.[1],
    named: [...named],
    images: words.length,
    classes: /^ class="([^"]*)"/.exec(col)?.[1] ?? '',
    html: col,
  };
}

/** Topics that take the full width rather than light and dark columns: each has a reason in StudioPage. */
const fullWidth = new Set(['banner', 'slots']);

describe('the studio page', () => {
  it('has every topic, in order, with the mismatch check last', () => {
    expect(sections().map((s) => s.id)).toEqual([
      'large',
      'sizes',
      'steps',
      'crops',
      'lockup',
      'banner',
      'slots',
      'mismatch',
    ]);
  });

  it('shows every topic as a light column on white and a dark column on GitHub’s dark page, each with its own theme’s drawing', () => {
    const topics = sections().filter((s) => s.id !== 'mismatch' && !fullWidth.has(s.id));
    expect(topics.map((s) => s.id)).toEqual(['large', 'sizes', 'steps', 'crops', 'lockup']);
    for (const { id, html } of topics) {
      expect(column(html, 'light'), id).toMatchObject({ ground: palette.white, named: ['light'] });
      expect(column(html, 'dark'), id).toMatchObject({ ground: palette.darkPage, named: ['dark'] });
    }
  });

  it('ends with the mismatch check, each theme on the other background', () => {
    const last = sections().at(-1);
    expect(last?.id).toBe('mismatch');
    expect(last?.html).toMatch(/<h2[^>]*>Mismatch check/);
    expect(column(last?.html ?? '', 'light')).toMatchObject({ ground: palette.darkPage, named: ['light'] });
    expect(column(last?.html ?? '', 'dark')).toMatchObject({ ground: palette.white, named: ['dark'] });
  });

  it('puts the columns side by side from md up, and on a narrow window shows only the chosen theme (light at first)', () => {
    for (const { id, html } of sections().filter((s) => !fullWidth.has(s.id))) {
      expect(html, id).toContain('grid gap-4 md:grid-cols-2');
      expect(column(html, 'light').classes, id).toContain('min-w-0');
      expect(column(html, 'light').classes, id).not.toContain('hidden');
      expect(column(html, 'dark').classes, id).toContain('hidden md:block');
    }
  });

  // Enough drawings that a topic can't shrink to one correctly titled picture and still pass.
  it('keeps every preview in each column: the reference, every size, every step at every size, every crop', () => {
    const byId = Object.fromEntries(sections().map((s) => [s.id, s.html]));
    for (const theme of ['light', 'dark'] as const) {
      expect(column(byId.large ?? '', theme).html).toContain(`alt="The committed ${theme} reference"`);
      expect(column(byId.mismatch ?? '', theme).html).not.toContain('alt="The committed');
      expect(column(byId.sizes ?? '', theme).images).toBeGreaterThanOrEqual(previewSizes.length);
      expect(column(byId.steps ?? '', theme).images).toBeGreaterThanOrEqual(previewSizes.length * details.length);
      expect(column(byId.crops ?? '', theme).images).toBeGreaterThanOrEqual(6 * details.length);
    }
  });

  // Some slots exist only on their fixed dark background, so this topic is one row per slot, not two columns.
  it('shows where the logo lands full width: a pair together where a slot has one, once where its background is fixed', () => {
    const slots = sections().find((s) => s.id === 'slots')?.html ?? '';
    expect(slots).not.toContain('md:grid-cols-2');
    const rows = [...slots.matchAll(/data-slot="(\w+)"/g)].map((m) => m[1]);
    expect(rows).toEqual(['favicon', 'appleTouchIcon', 'githubAvatar', 'readmeHeader', 'meetupPhoto']);
    const panels = (slot: string) =>
      [...(slots.split(`data-slot="${slot}"`)[1]?.split('data-slot=')[0] ?? '').matchAll(/data-theme="(\w+)"/g)].map(
        (m) => m[1],
      );
    expect(panels('readmeHeader')).toEqual(['light', 'dark']);
    for (const slot of ['appleTouchIcon', 'githubAvatar', 'meetupPhoto']) expect(panels(slot), slot).toEqual(['dark']);
    expect(slots.match(/on its fixed GitHub-dark background/g)?.length).toBe(3);
  });

  it('links the topic bar to every topic', () => {
    const nav = /<nav aria-label="Topics".*?<\/nav>/.exec(markup)?.[0] ?? '';
    const links = [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(links).toEqual(sections().map((s) => `#${s.id}`));
  });

  // On a wide window the topics stay in the same centred column as the header's banner and the bar's links.
  it('keeps the topic bar’s contents and every topic in the page’s one content column', () => {
    expect(markup).toMatch(new RegExp(`<div class="${pageColumn} flex h-12[^"]*"><div role="group"`));
    expect(markup).toMatch(new RegExp(`<main class="p-6"><div class="${pageColumn} space-y-10">`));
  });

  it('ends the topic bar with the link to the 0.4.0 studio, outside the topics', () => {
    const bar = /<nav aria-label="Topics".*?<\/nav>(.*?)<\/div>/.exec(markup)?.[1] ?? '';
    expect(bar).toMatch(/^<a href="\.\/legacy\.html"[^>]*>0\.4\.0 studio<span aria-hidden="true"> ↗<\/span><\/a>$/);
  });
});
