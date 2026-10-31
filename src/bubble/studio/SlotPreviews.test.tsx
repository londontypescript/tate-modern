import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { edgeChoices, plainEdges, slotRecipes, tileLettering, type SlotEdges } from '../engine';
import { renderSlotSvg } from '../react/renderSlot';
import type { KernedFont } from '../wordmark/fonts';
import { slotFileName } from './slotDownload';
import { SlotFigure, SlotPreviews } from './SlotPreviews';

let lettering: string;
let font: KernedFont;
beforeAll(async () => {
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
  font = (await loadBubbleFontsFromDisk()).wordmark;
});

const recipe = slotRecipes.find((r) => r.id === 'meetupPhoto');
if (!recipe || recipe.detail === 'bySize') throw new Error('The Meetup photo draws a fixed step');
const meetup = { ...recipe, detail: recipe.detail };
const label = (e: SlotEdges) => `band ${e.band}, corners ${e.corners}`;

const figure = (edges: SlotEdges) =>
  renderToStaticMarkup(
    <SlotFigure recipe={meetup} lettering={lettering} font={font} edges={edges} onEdges={() => undefined} />,
  );

/** Each card's crop, its CSS radius, its caption and its drawing, in order. */
const cards = (html: string) =>
  html
    .split('data-crop="')
    .slice(1)
    .map((card) => ({
      crop: card.slice(0, card.indexOf('"')),
      radius: /border-radius:([\d.]+)/.exec(card)?.[1],
      caption: /<span class="font-mono[^"]*">([^<]*)<\/span>/.exec(card)?.[1] ?? '',
      svg: /<svg xmlns.*?<\/svg>(?=<\/div>)/.exec(card)?.[0] ?? '',
    }));

/** A drawing with its ids, its written size and its class taken out: what it draws, and nothing about where. */
const drawn = (svg: string) => {
  // An export's prefix is `lts-` and a hash; a live drawing's is `lts` and React's own id, with no dash.
  const prefix = / id="(lts-[0-9a-f]{32}|lts[A-Za-z0-9_]*)-/.exec(svg)?.[1];
  if (!prefix) throw new Error('No id prefix found');
  return svg
    .replace(/^<\?xml[^>]*>\n/, '')
    .trim()
    .replaceAll(prefix, 'ID')
    .replace(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="[\d.]+" height="[\d.]+"/, '<svg')
    .replace(' class="block"', '');
};

describe('the Meetup photo in the studio', () => {
  it('offers the band and corner toggles on that row alone, both off at first, with the two downloads', () => {
    const html = renderToStaticMarkup(<SlotPreviews lettering={lettering} font={font} />);
    expect(html.match(/data-edge-controls/g)).toHaveLength(1);
    const row = html.split('data-slot="meetupPhoto"')[1]?.split('data-slot=')[0] ?? '';
    expect(row).toContain('data-edge-controls');
    const pressed = [...row.matchAll(/aria-pressed="true"[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(pressed).toEqual(['Off', 'Off']);
    for (const group of ['Band', 'Rounded corners']) expect(row).toContain(`aria-label="${group}"`);
    for (const choice of ['Left', 'Right', 'Top', 'Bottom', 'On', 'SVG', 'PNG'])
      expect(row).toContain(`>${choice}</button>`);
  });

  it('shows the file itself unmasked at every size, and the place’s own crop apart, labelled as simulated', () => {
    const shown = cards(figure(plainEdges));
    expect(shown.map((c) => [c.crop, c.radius])).toEqual([
      ['none', '0'],
      ['none', '0'],
      ['simulated', '12'],
    ]);
    expect(shown[0]?.caption).toBe('300 px, the file itself');
    expect(shown[2]?.caption).toBe('600 px, as Meetup crops it (simulated, 12 px corners)');
  });

  it.each(edgeChoices.map((e) => [label(e), e] as const))(
    '%s: previews exactly what the download writes',
    (_, edges) => {
      const file = drawn(renderSlotSvg(meetup, 'dark', { lettering, font }, edges));
      const shown = cards(figure(edges));
      expect(shown).toHaveLength(3);
      for (const { svg, caption } of shown) expect(drawn(svg), caption).toBe(file);
    },
  );

  it('names each download for its band and corners, the plain one as the committed file', () => {
    const names = edgeChoices.flatMap((e) => (['svg', 'png'] as const).map((f) => slotFileName(meetup, e, f)));
    expect(new Set(names).size).toBe(names.length);
    expect(slotFileName(meetup, plainEdges, 'png')).toBe('london-typescript-meetup-photo.png');
    expect(slotFileName(meetup, { band: 'left', corners: 'on' }, 'svg')).toBe(
      'london-typescript-meetup-photo-band-left-rounded.svg',
    );
  });
});
