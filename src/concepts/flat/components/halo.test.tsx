import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { LogoFonts } from '../../../shared';
import { parsePresets } from '../../../studio/presets';
import { buildLogo, defaultLogoConfig, type HaloConfig, type LogoConfig } from '../engine';
import { fillMissing } from '../FlatStudio';
import { LondonTypeScriptLogo } from './LondonTypeScriptLogo';
import { renderLogoSvg, svgVariants } from './renderSvg';
import { haloMarkup } from './haloSvg';
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

/** The halo's mask pieces and the shadow seen through it, as written. */
const haloPaths = (svg: string) => elements(haloMarkup(svg), 'path');
const shadowOf = (svg: string) => elements(haloMarkup(svg), 'rect')[0];

describe('the halo as written to the SVG', () => {
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
    // Everything between the sheets and the tile: the halo and anything wrapped round it.
    const between = (svg: string) =>
      svg.slice(svg.indexOf('</g>', svg.indexOf('id="t-layers"')), svg.indexOf('<g id="t-tile"'));
    const still = between(renderToStaticMarkup(<TypeScriptMark emblem={logo.emblem} idPrefix="t" />));
    expect(still).toContain('t-halo-core');
    for (const step of [1, 13, 50]) {
      const rotations = logo.emblem.layers.map((l, i) => l.rotation + step * (i + 1));
      const svg = renderToStaticMarkup(
        <TypeScriptMark emblem={logo.emblem} rotations={rotations} framing="rotation-safe" idPrefix="t" />,
      );
      expect(between(svg)).toBe(still);
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
        opacity: /<rect [^>]*fill-opacity="([^"]+)"[^>]*mask="/.exec(svg)?.[1],
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
      // Eight gradients and the mask.
      expect(svg.refs.filter((r) => r.includes('-halo-'))).toHaveLength(9);
      for (const ref of svg.refs) expect(svg.ids, `svg ${i} -> #${ref}`).toContain(ref);
    });
    // Each SVG's shadow carries its own halo's strength.
    expect(svgs.map((s) => s.opacity)).toEqual(['0.8', '0.3', '0.8', '0.3', '0.3']);
  });
});

describe('the frame with the halo on', () => {
  const TOLERANCE = 0.01;
  const big: HaloConfig = { strength: 1, reach: 40, offset: 20 };
  const small = { layerCount: 2, squareSize: 100 };

  /** Within half a written rounding step: the halo's lines are rounded as they are written. */
  const near = (actual: number, expected: number, label: string) =>
    expect(Math.abs(actual - expected), label).toBeLessThanOrEqual(0.0005 + 1e-9);

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
        near(box.minX, Math.min(without[key].minX, ox - e), key);
        near(box.minY, Math.min(without[key].minY, oy - e), key);
        near(box.maxX, Math.max(without[key].maxX, ox + e), key);
        near(box.maxY, Math.max(without[key].maxY, oy + e), key);
      }
    }
    // Where the halo sets the frame, it is exactly the halo's box on that side.
    const set = buildLogo(withHalo(big, {}, { layerCount: 0 }), fonts).emblem.bounds;
    near(set.minX, -20 - 90, 'minX');
    near(set.maxY, 20 + 90, 'maxY');
    near(set.maxX, -20 + 90, 'maxX');
    near(set.minY, 20 - 90, 'minY');
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
        const shadow = shadowOf(svg) ?? {};
        const [x, y] = [Number(shadow.x), Number(shadow.y)];
        const boxes = [
          ...pieces.map((p) => ({ id: p.id, ...pointsBox(pathPoints(p.d ?? '')) })),
          { id: 'shadow', minX: x, minY: y, maxX: x + Number(shadow.width), maxY: y + Number(shadow.height) },
        ];
        for (const { id, ...box } of boxes) {
          const piece = { id };
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
    near(pushed.wordmark.bounds.minX + pushed.wordmarkOffset.x, 50 + 40 + gap, 'wordmark');
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
      strength: shadowOf(svg)?.['fill-opacity'],
      // The core's left edge is -offset - 50 + r, its size 100 - 2r.
      offset: box && Number((-(box.minX + 50 - 0.8)).toFixed(3)),
      reach: core && Number((Number(elements(svg, 'radialGradient')[0]?.r) - 0.8).toFixed(3)),
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
