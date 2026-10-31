import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { themes, tileLettering, type Theme } from '../engine';
import { bubbleFileName, renderBubbleSvg } from './renderSvg';

let lettering: string;
beforeAll(async () => {
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
});

/** The reference with its TS path scaled as the departure records it. */
function withLargerTs(reference: string) {
  const ts = /<path d="[^"]+" fill="#fff"\/><\/g>/.exec(reference)?.[0];
  if (!ts) throw new Error('The reference’s TS path was not found');
  return reference.replace(ts, ts.replace('/>', ' transform="translate(178 178) scale(1.3) translate(-178 -178)"/>'));
}

/** Swaps a markup fragment, failing loudly if the reference no longer holds it. */
function swap(svg: string, from: string, to: string) {
  if (!svg.includes(from)) throw new Error(`The reference no longer holds: ${from}`);
  return svg.replace(from, to);
}

/**
 * The reference reframed as the full step now is: the 240 box grown
 * downwards to y 253, so the ground fades out instead of being cut at 240.
 */
const reframed = (reference: string) =>
  swap(reference, 'width="240" height="240" viewBox="0 0 240 240"', 'width="240" height="253" viewBox="0 0 240 253"');

/**
 * The dark reference with its white ground shadow swapped for the warm
 * caustic, written out here from the decided values rather than taken from
 * the engine, so the test holds the engine to them.
 */
function withCaustic(reference: string) {
  const gradient =
    '<radialGradient id="lts-bubble-dark-caustic" cx=".5" cy=".5" r=".5">' +
    '<stop offset="0" stop-color="#ffcf7a" stop-opacity=".9"/><stop offset=".45" stop-color="#ff9a5c" stop-opacity=".55"/>' +
    '<stop offset=".8" stop-color="#ff5fa2" stop-opacity=".2"/><stop offset="1" stop-color="#ff5fa2" stop-opacity="0"/>' +
    '</radialGradient>';
  const withBlur = swap(
    reference,
    '<filter id="lts-bubble-dark-blur4" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="4"/></filter>',
    `${gradient}<filter id="lts-bubble-dark-blur5" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="5"/></filter>`,
  );
  return swap(
    withBlur,
    '<ellipse cx="120" cy="230" rx="72" ry="7" fill="#fff" fill-opacity=".2" filter="url(#lts-bubble-dark-blur4)"/>',
    '<ellipse cx="120" cy="233" rx="84" ry="8.5" fill="url(#lts-bubble-dark-caustic)" filter="url(#lts-bubble-dark-blur5)"/>',
  );
}

/** The reference as the logo departs from it, by its README's "Departures" and nothing else. */
function withDepartures(theme: Theme, reference: string) {
  const departed = reframed(withLargerTs(reference));
  return theme === 'dark' ? withCaustic(departed) : departed;
}

const pixels = (svg: string, width: number) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().pixels;

describe('the exported bubble', () => {
  // The recorded departures from the reference (its README, "Departures"): the TS 1.3× larger, the frame grown
  // downwards to y 253, which shows the light shadow's tail, and in dark the caustic in place of the white shadow.
  it.each(themes)(
    '%s: renders exactly as the committed reference with its recorded departures, through resvg',
    (theme) => {
      const reference = withDepartures(theme, readFileSync(`docs/references/bubble/emblem-${theme}.svg`, 'utf8'));
      for (const width of [56, 480]) {
        const expected = pixels(reference, width);
        const actual = pixels(renderBubbleSvg(theme, lettering, { detail: 'full' }), width);
        expect(actual.length).toBe(expected.length);
        let differing = 0;
        for (let i = 0; i < actual.length; i++) if (actual[i] !== expected[i]) differing++;
        expect(differing, `channels that differ at ${width} px`).toBe(0);
      }
    },
  );

  it.each(themes)('%s: is self-contained, with only concrete values', (theme) => {
    const svg = renderBubbleSvg(theme, lettering);
    // No CSS (so no custom properties), no symbols or files from outside, no fonts.
    for (const banned of ['var(', 'style', 'class=', '<use', 'href', '<text', '<image', '@import']) {
      expect(svg, banned).not.toContain(banned);
    }
    expect(svg).toContain('width="240" height="253" viewBox="0 0 240 253"');
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
