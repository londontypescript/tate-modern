import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { LogoFonts } from '../../../shared';
import { parsePresets } from '../../../studio/presets';
import { buildLogo, defaultLogoConfig, type HaloConfig, type LogoConfig } from '../engine';
import { fillMissing } from '../FlatStudio';
import { LondonTypeScriptLogo } from './LondonTypeScriptLogo';
import { renderLogoSvg, svgVariants } from './renderSvg';
import { elements, pathPoints, pointsBox, viewBox } from './svgParse';
import { TypeScriptMark } from './TypeScriptMark';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

const on: HaloConfig = { strength: 0.8, reach: 20, offset: 8 };
const withHalo = (halo: unknown, tile: Partial<LogoConfig['tile']> = {}, emblem: Partial<LogoConfig['emblem']> = {}) =>
  ({
    ...defaultLogoConfig,
    emblem: { ...defaultLogoConfig.emblem, ...emblem },
    tile: { ...defaultLogoConfig.tile, ...tile, halo },
  }) as LogoConfig;

/** The halo group as written: from its opening tag to the tile's. */
const haloMarkup = (svg: string) => /<g id="[^"]*halo"[^>]*>.*?<\/g>/.exec(svg)?.[0] ?? '';
const haloPaths = (svg: string) => elements(haloMarkup(svg), 'path');
/** Each gradient's stops, as the text written inside it. */
const stopLists = (svg: string) =>
  [...haloMarkup(svg).matchAll(/<(linear|radial)Gradient ([^>]*)>(.*?)<\/\1Gradient>/g)].map((m) => ({
    kind: m[1],
    id: /id="([^"]+)"/.exec(m[2] ?? '')?.[1],
    stops: m[3] ?? '',
  }));

describe('the halo as written to the SVG', () => {
  it('is nine pieces drawn crisply in one group, the core flat at the strength', () => {
    const svg = renderLogoSvg('mark', buildLogo(withHalo(on), fonts));
    expect(haloMarkup(svg)).toMatch(/^<g id="lts-halo" shape-rendering="crispEdges">/);
    const paths = haloPaths(svg);
    expect(paths).toHaveLength(9);
    expect(paths[0]).toMatchObject({ id: 'lts-halo-core', fill: '#06245c', 'fill-opacity': '0.8' });
    expect(paths.slice(1).map((p) => p.fill)).toEqual(
      ['left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-right', 'bottom-left'].map(
        (n) => `url(#lts-halo-${n})`,
      ),
    );
  });

  it('writes the same stop list into every strip and corner, strictly increasing', () => {
    const cases: [HaloConfig, number][] = [
      [on, 0.8],
      [{ strength: 0.37, reach: 0.5, offset: 0 }, 50],
      [{ strength: 1, reach: 40, offset: 20 }, 12],
    ];
    for (const [halo, cornerRadius] of cases) {
      const lists = stopLists(renderLogoSvg('mark', buildLogo(withHalo(halo, { cornerRadius }), fonts)));
      expect(lists.map((l) => l.kind)).toEqual([
        ...Array<string>(4).fill('linear'),
        ...Array<string>(4).fill('radial'),
      ]);
      for (const list of lists) expect(list.stops).toBe(lists[0]?.stops);
      const stops = elements(lists[0]?.stops ?? '', 'stop');
      expect(stops.map((s) => s['stop-color'])).toEqual(Array<string>(5).fill('#06245c'));
      const offsets = stops.map((s) => Number(s.offset));
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i], `r ${cornerRadius} reach ${halo.reach}`).toBeGreaterThan(offsets[i - 1] ?? NaN);
      }
      expect(offsets.at(-1)).toBe(1);
      expect(stops.map((s) => Number(s['stop-opacity']))).toEqual(
        [1, 0.5625, 0.25, 0.0625, 0].map((k) => Number((halo.strength * k).toFixed(3))),
      );
    }
  });

  it('grades every piece in user space, the strips across their depth', () => {
    const svg = renderLogoSvg('mark', buildLogo(withHalo(on), fonts));
    for (const tag of ['linearGradient', 'radialGradient']) {
      for (const g of elements(haloMarkup(svg), tag)) expect(g.gradientUnits).toBe('userSpaceOnUse');
    }
  });

  it('meets on exactly the same written coordinates: four lines across and four down', () => {
    for (const [halo, cornerRadius] of [
      [on, 0.8],
      [{ strength: 0.5, reach: 13.3, offset: 3.7 }, 7.77],
    ] as const) {
      const svg = renderLogoSvg('mark', buildLogo(withHalo(halo, { cornerRadius }), fonts));
      const points = haloPaths(svg).flatMap((p) => pathPoints(p.d ?? ''));
      expect(new Set(points.map((p) => p.x)).size).toBe(4);
      expect(new Set(points.map((p) => p.y)).size).toBe(4);
    }
  });

  it('is drawn after the sheets, outside their isolated group, with normal blending, before the tile', () => {
    const svg = renderLogoSvg('mark', buildLogo(withHalo(on), fonts));
    const layersEnd = svg.indexOf('</g>', svg.indexOf('id="lts-layers"'));
    const halo = svg.indexOf('id="lts-halo"');
    expect(layersEnd).toBeGreaterThan(0);
    expect(halo).toBeGreaterThan(layersEnd);
    expect(svg.indexOf('id="lts-tile"')).toBeGreaterThan(halo);
    expect(haloMarkup(svg)).not.toMatch(/blend|isolation| opacity="/);
  });

  it('stays still while the sheets turn', () => {
    const logo = buildLogo(withHalo(on), fonts);
    const still = haloMarkup(renderToStaticMarkup(<TypeScriptMark emblem={logo.emblem} idPrefix="t" />));
    for (const step of [1, 13, 50]) {
      const rotations = logo.emblem.layers.map((l, i) => l.rotation + step * (i + 1));
      const svg = renderToStaticMarkup(
        <TypeScriptMark emblem={logo.emblem} rotations={rotations} framing="rotation-safe" idPrefix="t" />,
      );
      expect(haloMarkup(svg)).toBe(still);
    }
  });

  it('uses no filter in any export', () => {
    const logo = buildLogo(withHalo({ strength: 1, reach: 40, offset: 20 }, {}, { fade: 0.5 }), fonts);
    for (const variant of svgVariants) {
      for (const background of [undefined, '#fcf6e9']) {
        const svg = renderLogoSvg(variant, logo, { background });
        expect(svg, variant).not.toMatch(/<filter|filter=|filter:/);
      }
    }
    expect(renderLogoSvg('mark', logo)).toContain('lts-halo');
  });
});

describe('halo gradient ids', () => {
  /** Each `<svg>` of a page, with its own ids, the ids its fills point at and its gradients' stops. */
  const perSvg = (html: string) =>
    html
      .split('<svg')
      .slice(1)
      .map((svg) => ({
        ids: [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] ?? ''),
        refs: [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1] ?? ''),
        opacity: /-halo-left"[^>]*><stop [^>]*stop-opacity="([^"]+)"/.exec(svg)?.[1],
      }));

  it('are unique on a page of logos with different halos, and resolve inside their own SVG', () => {
    const a = buildLogo(withHalo(on, {}, { fade: 0.6 }), fonts);
    const b = buildLogo(withHalo({ strength: 0.3, reach: 6, offset: 2 }), fonts);
    const html = renderToStaticMarkup(
      <>
        <TypeScriptMark emblem={a.emblem} />
        <TypeScriptMark emblem={b.emblem} />
        <LondonTypeScriptLogo logo={a} />
        <LondonTypeScriptLogo logo={b} idPrefix="second" />
        <TypeScriptMark emblem={b.emblem} idPrefix="third" />
      </>,
    );
    const svgs = perSvg(html);
    expect(svgs).toHaveLength(5);
    const all = svgs.flatMap((s) => s.ids);
    expect(new Set(all).size).toBe(all.length);
    svgs.forEach((svg, i) => {
      expect(svg.refs.filter((r) => r.includes('-halo-'))).toHaveLength(8);
      for (const ref of svg.refs) expect(svg.ids, `svg ${i} -> #${ref}`).toContain(ref);
    });
    // Each SVG's gradients carry its own halo's strength.
    expect(svgs.map((s) => s.opacity)).toEqual(['0.8', '0.3', '0.8', '0.3', '0.3']);
  });
});

describe('the frame with the halo on', () => {
  const TOLERANCE = 0.01;
  const big: HaloConfig = { strength: 1, reach: 40, offset: 20 };
  const small = { layerCount: 2, squareSize: 100 };

  it('is the union with the halo’s exact box, in both framings', () => {
    for (const [halo, emblem] of [
      [on, {}],
      [big, small],
      [big, { layerCount: 0 }],
    ] as const) {
      const logo = buildLogo(withHalo(halo, {}, emblem), fonts);
      const [ox, oy, e] = [-halo.offset, halo.offset, 50 + halo.reach];
      const without = buildLogo(withHalo({ ...halo, strength: 0 }, {}, emblem), fonts).emblem;
      for (const key of ['bounds', 'rotationSafeBounds'] as const) {
        const box = logo.emblem[key];
        expect(box.minX, key).toBeCloseTo(Math.min(without[key].minX, ox - e), 9);
        expect(box.minY, key).toBeCloseTo(Math.min(without[key].minY, oy - e), 9);
        expect(box.maxX, key).toBeCloseTo(Math.max(without[key].maxX, ox + e), 9);
        expect(box.maxY, key).toBeCloseTo(Math.max(without[key].maxY, oy + e), 9);
      }
    }
    // Where the halo sets the frame, it is exactly the halo's box on that side.
    const set = buildLogo(withHalo(big, {}, { layerCount: 0 }), fonts).emblem.bounds;
    expect(set.minX).toBeCloseTo(-20 - 90, 9);
    expect(set.maxY).toBeCloseTo(20 + 90, 9);
    expect(set.maxX).toBeCloseTo(-20 + 90, 9);
    expect(set.minY).toBeCloseTo(20 - 90, 9);
  });

  it('holds every halo piece as written, in every export and framing', () => {
    for (const [halo, emblem] of [
      [on, {}],
      [big, small],
      [
        { strength: 0.5, reach: 33.3, offset: 13.7 },
        { layerCount: 1, squareSize: 100 },
      ],
    ] as const) {
      const logo = buildLogo(withHalo(halo, { cornerRadius: 3.33 }, emblem), fonts);
      const pages = [
        renderLogoSvg('mark', logo),
        renderLogoSvg('logo', logo),
        renderToStaticMarkup(<TypeScriptMark emblem={logo.emblem} framing="rotation-safe" idPrefix="t" />),
        renderToStaticMarkup(<LondonTypeScriptLogo logo={logo} framing="rotation-safe" idPrefix="t" />),
      ];
      for (const svg of pages) {
        const frame = viewBox(svg);
        const pieces = haloPaths(svg);
        expect(pieces).toHaveLength(9);
        for (const piece of pieces) {
          const box = pointsBox(pathPoints(piece.d ?? ''));
          expect(box.minX, piece.id).toBeGreaterThanOrEqual(frame.minX - TOLERANCE);
          expect(box.minY, piece.id).toBeGreaterThanOrEqual(frame.minY - TOLERANCE);
          expect(box.maxX, piece.id).toBeLessThanOrEqual(frame.maxX + TOLERANCE);
          expect(box.maxY, piece.id).toBeLessThanOrEqual(frame.maxY + TOLERANCE);
        }
      }
    }
  });

  it('keeps the wordmark beside the tight bounds, aligned to the tile', () => {
    const gap = defaultLogoConfig.layout.horizontalGap * defaultLogoConfig.tile.size;
    for (const [halo, emblem] of [
      [on, {}],
      [big, small],
    ] as const) {
      const logo = buildLogo(withHalo(halo, {}, emblem), fonts);
      const plain = buildLogo(withHalo({ ...halo, strength: 0 }, {}, emblem), fonts);
      const wordmarkLeft = logo.wordmark.bounds.minX + logo.wordmarkOffset.x;
      expect(wordmarkLeft - logo.emblem.bounds.maxX).toBeCloseTo(gap, 9);
      expect(logo.wordmarkOffset.y).toBe(plain.wordmarkOffset.y);
      expect(logo.wordmarkOffset.x - plain.wordmarkOffset.x).toBeCloseTo(
        logo.emblem.bounds.maxX - plain.emblem.bounds.maxX,
        9,
      );
    }
    // A halo past the sheets on the right pushes the wordmark out with it.
    const pushed = buildLogo(withHalo({ strength: 1, reach: 40, offset: 0 }, {}, small), fonts);
    expect(pushed.wordmark.bounds.minX + pushed.wordmarkOffset.x).toBeCloseTo(50 + 40 + gap, 9);
  });
});

describe('halo inputs from untrusted saved configurations', () => {
  /** The halo a saved configuration draws, read back from its exported SVG. */
  const drawn = (config: LogoConfig) => {
    const logo = buildLogo(config, fonts);
    for (const variant of svgVariants) {
      expect(renderLogoSvg(variant, logo)).not.toMatch(/NaN|Infinity|undefined/);
    }
    const svg = renderLogoSvg('mark', logo);
    const core = haloPaths(svg)[0];
    const box = core ? pointsBox(pathPoints(core.d ?? '')) : undefined;
    return {
      model: logo.emblem.halo,
      strength: core?.['fill-opacity'],
      // The core's left edge is -offset - 50 + r, its size 100 - 2r.
      offset: box && Number((-(box.minX + 50 - 0.8)).toFixed(3)),
      reach: stopLists(svg)[0] && Number(elements(svg, 'radialGradient')[0]?.r) - 0.8,
    };
  };
  const load = (halo: string) =>
    parsePresets(`[{"id":"x","name":"Edited","config":{"tile":{"halo":${halo}}}}]`, defaultLogoConfig, fillMissing)[0]!
      .config;

  it('give a value that is not a finite number its neutral value, through the saved path and the export', () => {
    expect(drawn(load('{"strength":1e400,"reach":20,"offset":5}')).model).toBeUndefined();
    const reach = drawn(load('{"strength":0.5,"reach":1e400,"offset":5}'));
    expect([reach.strength, reach.reach, reach.offset]).toEqual(['0.5', 14, 5]);
    const offset = drawn(load('{"strength":0.5,"reach":10,"offset":-1e400}'));
    expect([offset.reach, offset.offset]).toEqual([10, 5]);
    const text = drawn(load('{"strength":0.5,"reach":"far","offset":"left"}'));
    expect([text.reach, text.offset]).toEqual([14, 5]);
    expect(drawn(load('{"strength":"strong","reach":20,"offset":5}')).model).toBeUndefined();
  });

  it('clamp values outside their range', () => {
    expect(drawn(load('{"strength":0.5,"reach":-3,"offset":5}')).model).toBeUndefined();
    expect(drawn(load('{"strength":-1,"reach":10,"offset":5}')).model).toBeUndefined();
    const over = drawn(load('{"strength":7,"reach":900,"offset":-4}'));
    expect([over.strength, over.reach, over.offset]).toEqual(['1', 40, 0]);
  });

  it('draw no halo when the halo is missing or not an object', () => {
    for (const halo of [undefined, null, 5, 'on']) {
      const config = withHalo(halo);
      expect(drawn(config).model).toBeUndefined();
      expect(renderLogoSvg('logo', buildLogo(config, fonts))).toBe(
        renderLogoSvg('logo', buildLogo(defaultLogoConfig, fonts)),
      );
    }
  });

  it('draw no halo for a tile size that is not a finite positive number', () => {
    for (const size of [JSON.parse('1e400') as number, NaN, -100, 0]) {
      const logo = buildLogo(withHalo(on, { size }, { layerCount: 2 }), fonts);
      expect(logo.emblem.halo, `size ${size}`).toBeUndefined();
      expect(renderLogoSvg('mark', logo)).not.toContain('halo');
    }
  });
});
