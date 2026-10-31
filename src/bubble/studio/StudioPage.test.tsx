import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { palette } from '../../shared/palette';
import { tileLettering, type Theme } from '../engine';
import { StudioPage } from './StudioPage';

let markup: string;
beforeAll(async () => {
  const lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
  const font = (await loadBubbleFontsFromDisk()).wordmark;
  markup = renderToStaticMarkup(<StudioPage lettering={lettering} font={font} />);
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
  return { ground: /background-color:(#[0-9a-f]{6})/.exec(col)?.[1], named: [...named], images: words.length };
}

describe('the studio page', () => {
  it('shows every topic as a light column on white and a dark column on GitHub’s dark page, each with its own theme’s drawing', () => {
    const topics = sections().filter((s) => s.id !== 'mismatch');
    expect(topics.map((s) => s.id)).toEqual(['large', 'sizes', 'steps', 'crops', 'lockup', 'slots']);
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

  it('links the topic bar to every topic', () => {
    const nav = /<nav aria-label="Topics".*?<\/nav>/.exec(markup)?.[0] ?? '';
    const links = [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(links).toEqual(sections().map((s) => `#${s.id}`));
  });
});
