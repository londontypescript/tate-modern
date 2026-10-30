import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { buildBubble, tileLettering, type Theme } from '../engine';
import { BubbleSvg } from './BubbleSvg';

let lettering: string;
beforeAll(async () => {
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
});

const drawing = (theme: Theme) => buildBubble({ theme, detail: 'full', lettering });

const ids = (html: string) => [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] ?? '');

describe('live bubbles', () => {
  it('give each drawing on a page its own ids, and keep each one’s references inside it', () => {
    // The studio shows the same theme many times over: large, on two grounds, and at every size.
    const html = renderToStaticMarkup(
      <>
        <BubbleSvg drawing={drawing('light')} />
        <BubbleSvg drawing={drawing('light')} size={16} />
        <BubbleSvg drawing={drawing('dark')} />
      </>,
    );
    const all = ids(html);
    expect(all.filter((id, i) => all.indexOf(id) !== i)).toEqual([]);
    const svgs = html.split('<svg').slice(1);
    expect(svgs).toHaveLength(3);
    for (const svg of svgs) {
      const own = ids(svg);
      const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1] ?? '');
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) expect(own, ref).toContain(ref);
    }
  });

  it('use a given prefix as it is', () => {
    const named = ids(renderToStaticMarkup(<BubbleSvg drawing={drawing('dark')} idPrefix="given" />));
    expect(named.length).toBeGreaterThan(0);
    for (const id of named) expect(id).toMatch(/^given-[A-Za-z0-9]+$/);
  });
});
