import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { themes, tileLettering } from '../engine';
import { bubbleFileName, renderBubbleSvg } from './renderSvg';

let lettering: string;
beforeAll(async () => {
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
});

const pixels = (svg: string, width: number) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().pixels;

describe('the exported bubble', () => {
  it.each(themes)('%s: renders exactly as the committed reference, through resvg', (theme) => {
    const reference = readFileSync(`docs/references/bubble/emblem-${theme}.svg`, 'utf8');
    for (const width of [56, 480]) {
      const expected = pixels(reference, width);
      const actual = pixels(renderBubbleSvg(theme, lettering), width);
      expect(actual.length).toBe(expected.length);
      let differing = 0;
      for (let i = 0; i < actual.length; i++) if (actual[i] !== expected[i]) differing++;
      expect(differing, `channels that differ at ${width} px`).toBe(0);
    }
  });

  it.each(themes)('%s: is self-contained, with only concrete values', (theme) => {
    const svg = renderBubbleSvg(theme, lettering);
    // No CSS (so no custom properties), no symbols or files from outside, no fonts.
    for (const banned of ['var(', 'style', 'class=', '<use', 'href', '<text', '<image', '@import']) {
      expect(svg, banned).not.toContain(banned);
    }
    expect(svg).toContain('width="240" height="240" viewBox="0 0 240 240"');
    expect(svg).toContain(`<title>London TypeScript bubble logo, emblem only, ${theme} theme</title>`);
  });

  it.each(themes)('%s: prefixes every id with its content hash, and every reference finds one of them', (theme) => {
    const svg = renderBubbleSvg(theme, lettering);
    const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] ?? '');
    const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1] ?? '');
    const prefix = /^(lts-[0-9a-f]{32})-/.exec(ids[0] ?? '')?.[1];
    expect(prefix).toBeDefined();
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) expect(id.startsWith(`${prefix}-`), id).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ref of refs) expect(ids, ref).toContain(ref);
  });

  it('gives the same file every time, and the two themes different ids', () => {
    expect(renderBubbleSvg('light', lettering)).toBe(renderBubbleSvg('light', lettering));
    const prefixOf = (svg: string) => / id="(lts-[0-9a-f]{32})-/.exec(svg)?.[1];
    expect(prefixOf(renderBubbleSvg('light', lettering))).not.toBe(prefixOf(renderBubbleSvg('dark', lettering)));
    expect(bubbleFileName('dark')).toBe('london-typescript-bubble-dark.svg');
  });
});
