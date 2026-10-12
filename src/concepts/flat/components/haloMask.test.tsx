import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { LogoFonts } from '../../../shared';
import { buildLogo, defaultLogoConfig, type HaloConfig, type LogoConfig } from '../engine';
import { arcCentre, gradients, haloMarkup, levelAt, maskOf, maskSampler, type ArcPiece } from './haloSvg';
import { renderLogoSvg } from './renderSvg';
import { elements } from './svgParse';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

const on: HaloConfig = { strength: 0.8, reach: 20, offset: 8 };
const markupFor = (halo: HaloConfig, cornerRadius = 0.8, size = 100) => {
  const config: LogoConfig = { ...defaultLogoConfig, tile: { ...defaultLogoConfig.tile, cornerRadius, size, halo } };
  return haloMarkup(renderLogoSvg('mark', buildLogo(config, fonts)));
};
const corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
const sides = ['left', 'right', 'top', 'bottom'];
/** Shapes with fractional radius, reach and offset, a square tile, and the extremes. */
const shapes: [HaloConfig, number][] = [
  [on, 0.8],
  [{ strength: 0.5, reach: 13.37, offset: 7.77 }, 3.333],
  [{ strength: 1, reach: 0.5, offset: 0 }, 0],
  [{ strength: 1, reach: 40, offset: 20 }, 12],
  [{ strength: 0.6, reach: 21.1, offset: 0.3 }, 0],
];

describe('the halo’s mask as written', () => {
  it('is one navy shape at the strength, seen through a luminance mask of opaque greys', () => {
    const markup = markupFor(on);
    expect(markup).toMatch(/^<g id="lts-halo">/);
    expect(markup).not.toContain('crispEdges');
    const { attrs, pieces } = maskOf(markup);
    const box = { x: '-78', y: '-62', width: '140', height: '140' };
    expect(attrs).toEqual({
      id: 'lts-halo-mask',
      maskUnits: 'userSpaceOnUse',
      'mask-type': 'luminance',
      'color-interpolation': 'sRGB',
      ...box,
    });
    // Painted core, corners, then strips over them.
    expect(pieces.map((p) => p.attrs.id)).toEqual([
      'lts-halo-core',
      ...corners.map((c) => `lts-halo-corner-${c}`),
      ...sides.map((s) => `lts-halo-strip-${s}`),
    ]);
    expect(pieces.map((p) => p.attrs.fill)).toEqual([
      '#ffffff',
      ...[...corners, ...sides].map((n) => `url(#lts-halo-${n})`),
    ]);
    for (const p of pieces) expect(Object.keys(p.attrs).sort()).toEqual(['d', 'fill', 'id']);
    const shadow = elements(markup.slice(markup.indexOf('</defs>')), 'rect');
    expect(shadow).toEqual([
      {
        id: 'lts-halo-shadow',
        ...box,
        fill: '#06245c',
        'fill-opacity': '0.8',
        mask: 'url(#lts-halo-mask)',
      },
    ]);
  });

  it('grades every piece in user space and sRGB, with the same opaque grey stops, strictly increasing', () => {
    // The smallest reach on a big, fully rounded tile puts the stops closest together.
    const cases: [HaloConfig, number, number][] = [
      [on, 0.8, 100],
      [{ strength: 0.37, reach: 0.5, offset: 0 }, 50, 100],
      [{ strength: 0.37, reach: 0.5, offset: 0 }, 150, 300],
      [{ strength: 1, reach: 40, offset: 20 }, 0, 100],
    ];
    for (const [halo, cornerRadius, size] of cases) {
      const grads = [...gradients(markupFor(halo, cornerRadius, size)).values()];
      expect(grads.map((g) => g.kind)).toEqual([
        ...Array<string>(4).fill('linear'),
        ...Array<string>(4).fill('radial'),
      ]);
      for (const g of grads) {
        expect(g.attrs).toMatchObject({ gradientUnits: 'userSpaceOnUse', 'color-interpolation': 'sRGB' });
        expect(g.text).toBe(grads[0]?.text);
      }
      const stops = elements(grads[0]?.text ?? '', 'stop');
      expect(stops.map((s) => s['stop-color'])).toEqual(['#ffffff', '#8f8f8f', '#404040', '#101010', '#000000']);
      for (const s of stops) expect(Object.keys(s).sort()).toEqual(['offset', 'stop-color']);
      const offsets = stops.map((s) => Number(s.offset));
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i], `r ${cornerRadius} reach ${halo.reach}`).toBeGreaterThan(offsets[i - 1] ?? NaN);
      }
      expect(offsets.at(-1)).toBe(1);
    }
  });

  it('keeps within 1/64 + 1/255 of (1 − t)², read from the written stops', () => {
    for (const [halo, r] of shapes) {
      const grad = gradients(markupFor(halo, r)).get('lts-halo-left');
      const stops = grad?.stops ?? [];
      const R = r + halo.reach;
      let worst = 0;
      for (let d = r; d <= R; d += halo.reach / 2000) {
        const ideal = (1 - (d - r) / halo.reach) ** 2;
        worst = Math.max(worst, Math.abs(levelAt(stops, d / R) - ideal));
      }
      expect(worst, `r ${r} reach ${halo.reach}`).toBeLessThanOrEqual(1 / 64 + 1 / 255);
    }
  });

  it('covers the shadow to within strength / 32 of the stops at each point’s distance, overlaps included', () => {
    for (const [halo, r] of shapes) {
      const markup = markupFor(halo, r);
      const { pieces } = maskOf(markup);
      const core = pieces[0]?.shape;
      if (core?.kind !== 'rect') throw new Error('no core');
      const stops = gradients(markup).get('lts-halo-left')?.stops ?? [];
      const R = r + halo.reach;
      const ideal = (x: number, y: number) => {
        const d = Math.hypot(Math.max(core.minX - x, 0, x - core.maxX), Math.max(core.minY - y, 0, y - core.maxY));
        return levelAt(stops, d / R);
      };
      const lap = Math.min(0.5, halo.reach / 64);
      const points: [number, number][] = [];
      const [x0, x1, y0, y1] = [core.minX - R, core.maxX + R, core.minY - R, core.maxY + R];
      // A grid fine enough to catch the soft edge, but never more than about 300 steps a side.
      const [stepX, stepY] = [Math.max(R / 41.3, (x1 - x0) / 307), Math.max(R / 37.9, (y1 - y0) / 293)];
      for (let x = x0 - 0.5; x <= x1 + 0.5; x += stepX) {
        for (let y = y0 - 0.5; y <= y1 + 0.5; y += stepY) points.push([x, y]);
      }
      // Densely along every join between a corner and a strip, where the strips overlap the corners.
      for (const cx of [core.minX, core.maxX]) {
        for (const cy of [core.minY, core.maxY]) {
          for (let k = -2; k <= 202; k++) {
            const out = (R * k) / 200;
            for (let j = -3; j <= 13; j++) {
              const across = (lap * j) / 10;
              const sx = cx === core.minX ? -1 : 1;
              const sy = cy === core.minY ? -1 : 1;
              points.push([cx + sx * out, cy - sy * across], [cx - sx * across, cy + sy * out]);
            }
          }
        }
      }
      let worst = 0;
      const level = maskSampler(markup);
      for (const [x, y] of points) worst = Math.max(worst, Math.abs(level(x, y) - ideal(x, y)));
      expect(worst, `r ${r} reach ${halo.reach}`).toBeLessThanOrEqual(1 / 32);
    }
  });
});

describe('the halo’s written geometry', () => {
  it('draws each corner as the small arc about its first point, sweeping the right way, inside the box', () => {
    const sweeps: Record<string, number> = { 'top-left': 1, 'top-right': 0, 'bottom-right': 1, 'bottom-left': 0 };
    for (const [halo, r] of shapes) {
      const markup = markupFor(halo, r);
      const { attrs, pieces } = maskOf(markup);
      const box = { minX: Number(attrs.x), minY: Number(attrs.y) };
      const [maxX, maxY] = [
        Number((box.minX + Number(attrs.width)).toFixed(3)),
        Number((box.minY + Number(attrs.height)).toFixed(3)),
      ];
      const grads = gradients(markup);
      for (const corner of corners) {
        const label = `r ${r} reach ${halo.reach} ${corner}`;
        const arc = pieces.find((p) => p.attrs.id === `lts-halo-corner-${corner}`)?.shape as ArcPiece;
        expect([arc.large, arc.sweep], label).toEqual([0, sweeps[corner]]);
        expect(arcCentre(arc), label).toEqual(arc.from);
        // Radii are the written depths, so the arc ends exactly on the written lines.
        expect(arc.rx, label).toBe(Number(Math.abs(arc.start.x - arc.from.x).toFixed(3)));
        expect(arc.ry, label).toBe(Number(Math.abs(arc.end.y - arc.from.y).toFixed(3)));
        expect(Math.abs(arc.rx - arc.ry), label).toBeLessThanOrEqual(0.001 + 1e-9);
        const g = grads.get(`lts-halo-${corner}`)?.attrs ?? {};
        expect([Number(g.cx), Number(g.cy)], label).toEqual([arc.from.x, arc.from.y]);
        expect(Math.abs(Number(g.r) - arc.rx), label).toBeLessThanOrEqual(0.001 + 1e-9);
        // The arc's extremes: its ends on the box's edges, its middle outward from the core corner.
        const mid = {
          x: arc.from.x + Math.sign(arc.start.x - arc.from.x) * arc.rx * Math.SQRT1_2,
          y: arc.from.y + Math.sign(arc.end.y - arc.from.y) * arc.ry * Math.SQRT1_2,
        };
        expect([box.minX, maxX], label).toContain(arc.start.x);
        expect([box.minY, maxY], label).toContain(arc.end.y);
        for (const p of [arc.start, arc.end, mid]) {
          expect(p.x, label).toBeGreaterThanOrEqual(box.minX);
          expect(p.x, label).toBeLessThanOrEqual(maxX);
          expect(p.y, label).toBeGreaterThanOrEqual(box.minY);
          expect(p.y, label).toBeLessThanOrEqual(maxY);
        }
      }
    }
  });

  it('runs every strip’s gradient from the core’s edge out to the box’s', () => {
    for (const [halo, r] of shapes) {
      const markup = markupFor(halo, r);
      const { attrs, pieces } = maskOf(markup);
      const core = pieces[0]?.shape;
      if (core?.kind !== 'rect') throw new Error('no core');
      const [minX, minY] = [Number(attrs.x), Number(attrs.y)];
      const [maxX, maxY] = [
        Number((minX + Number(attrs.width)).toFixed(3)),
        Number((minY + Number(attrs.height)).toFixed(3)),
      ];
      const grads = gradients(markup);
      const expected: Record<string, [number, number, number, number]> = {
        left: [core.minX, core.minY, minX, core.minY],
        right: [core.maxX, core.minY, maxX, core.minY],
        top: [core.minX, core.minY, core.minX, minY],
        bottom: [core.minX, core.maxY, core.minX, maxY],
      };
      for (const side of sides) {
        const g = grads.get(`lts-halo-${side}`)?.attrs ?? {};
        expect(
          ['x1', 'y1', 'x2', 'y2'].map((k) => Number(g[k])),
          `r ${r} ${side}`,
        ).toEqual(expected[side]);
      }
    }
  });
});
