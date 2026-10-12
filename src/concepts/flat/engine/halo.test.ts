import { describe, expect, it } from 'vitest';
import { palette } from '../../../shared';
import { defaultLogoConfig, haloRanges, neutralHalo, type HaloConfig, type TileConfig } from './config';
import { buildHalo, sanitizeHalo, type HaloModel } from './halo';

/** What `JSON.parse` gives for a hand-edited saved value. */
const huge = JSON.parse('1e400') as number;
const on: HaloConfig = { strength: 0.8, reach: 20, offset: 8 };
const tileWith = (halo: unknown, over: Partial<TileConfig> = {}) =>
  ({ ...defaultLogoConfig.tile, ...over, halo }) as TileConfig;

describe('sanitizeHalo', () => {
  it('returns valid values unchanged', () => {
    expect(sanitizeHalo(on)).toEqual(on);
    expect(sanitizeHalo(neutralHalo)).toEqual(neutralHalo);
  });

  it('gives a value that is not a finite number its neutral value', () => {
    for (const field of ['strength', 'reach', 'offset'] as const) {
      for (const value of [huge, -huge, NaN, 'lots', undefined, null, {}]) {
        expect(sanitizeHalo({ ...on, [field]: value })[field], `${field} = ${JSON.stringify(value)}`).toBe(
          neutralHalo[field],
        );
      }
    }
  });

  it('clamps every value to its range', () => {
    for (const field of ['strength', 'reach', 'offset'] as const) {
      const { min, max } = haloRanges[field];
      expect(sanitizeHalo({ ...on, [field]: min - 5 })[field]).toBe(min);
      expect(sanitizeHalo({ ...on, [field]: max + 1e300 })[field]).toBe(max);
    }
  });

  it('treats a missing or non-object halo as neutral', () => {
    for (const value of [undefined, null, 3, 'on', [0.5, 10, 2]]) expect(sanitizeHalo(value)).toEqual(neutralHalo);
  });
});

describe('buildHalo', () => {
  const w = (v: number) => Number(v.toFixed(3));

  it('is absent at the neutral values, and when strength or reach is 0', () => {
    expect(buildHalo(tileWith(neutralHalo))).toBeUndefined();
    expect(buildHalo(tileWith({ ...on, strength: 0 }))).toBeUndefined();
    expect(buildHalo(tileWith({ ...on, reach: 0 }))).toBeUndefined();
    expect(buildHalo(tileWith(undefined))).toBeUndefined();
  });

  it('is absent for a size that is not finite and positive, or a corner radius not finite and not negative', () => {
    for (const size of [huge, -huge, NaN, 0, -100, 'big']) {
      expect(buildHalo(tileWith(on, { size: size as number })), `size ${String(size)}`).toBeUndefined();
    }
    for (const cornerRadius of [huge, NaN, -1, 'round']) {
      const tile = tileWith(on, { cornerRadius: cornerRadius as number });
      expect(buildHalo(tile), `cornerRadius ${String(cornerRadius)}`).toBeUndefined();
    }
    expect(buildHalo(tileWith(on, { cornerRadius: 0 }))).toBeDefined();
  });

  it('is navy at the configured strength', () => {
    const halo = buildHalo(tileWith(on)) as HaloModel;
    expect(halo.colour).toBe(palette.navy);
    expect(halo.strength).toBe(0.8);
  });

  const shapes: [HaloConfig, number][] = [
    [on, 0.8],
    [on, 0],
    [{ strength: 0.5, reach: 13.37, offset: 7.77 }, 3.333],
    // More decimals than are written, so every line and depth is rounded.
    [{ strength: 0.45, reach: 13.3717, offset: 7.7777 }, 3.33333],
    [{ strength: 1, reach: 0.5, offset: 0.5 }, 0],
    [{ strength: 1, reach: 0.1, offset: 0 }, 0],
  ];

  it('places every piece about the tile moved left and down, on four written lines each way', () => {
    for (const [config, r] of shapes) {
      const label = `r ${r} reach ${config.reach}`;
      const [h, a, R] = [50, 50 - r, r + config.reach];
      const [ox, oy] = [-config.offset, config.offset];
      const [x0 = NaN, x1 = NaN, x2 = NaN, x3 = NaN] = [ox - a - R, ox - a, ox + a, ox + a + R].map(w);
      const [y0 = NaN, y1 = NaN, y2 = NaN, y3 = NaN] = [oy - a - R, oy - a, oy + a, oy + a + R].map(w);
      const halo = buildHalo(tileWith(config, { cornerRadius: r })) as HaloModel;
      expect(halo.core, label).toEqual({ minX: x1, minY: y1, maxX: x2, maxY: y2 });
      const strip = Object.fromEntries(halo.strips.map((s) => [s.side, s.rect]));
      expect(strip.left, label).toEqual({ minX: x0, minY: y1, maxX: x1, maxY: y2 });
      expect(strip.right, label).toEqual({ minX: x2, minY: y1, maxX: x3, maxY: y2 });
      expect(strip.top, label).toEqual({ minX: x1, minY: y0, maxX: x2, maxY: y1 });
      expect(strip.bottom, label).toEqual({ minX: x1, minY: y2, maxX: x2, maxY: y3 });
      const corners = Object.fromEntries(halo.patches.map((p) => [p.corner, p]));
      expect(corners['top-left']).toMatchObject({
        centre: { x: x1, y: y1 },
        start: { x: x0, y: y1 },
        end: { x: x1, y: y0 },
      });
      expect(corners['top-right']).toMatchObject({
        centre: { x: x2, y: y1 },
        start: { x: x3, y: y1 },
        end: { x: x2, y: y0 },
      });
      expect(corners['bottom-right']).toMatchObject({
        centre: { x: x2, y: y2 },
        start: { x: x3, y: y2 },
        end: { x: x2, y: y3 },
      });
      expect(corners['bottom-left']).toMatchObject({
        centre: { x: x1, y: y2 },
        start: { x: x0, y: y2 },
        end: { x: x1, y: y3 },
      });
      for (const p of halo.patches) {
        // Each arc's radii are its written depths, so it ends exactly on the lines.
        expect(p.rx, `${label} ${p.corner}`).toBe(w(Math.abs(p.start.x - p.centre.x)));
        expect(p.ry, `${label} ${p.corner}`).toBe(w(Math.abs(p.end.y - p.centre.y)));
        expect(Math.abs(p.rx - p.ry), `${label} ${p.corner}`).toBeLessThanOrEqual(0.001 + 1e-9);
        expect(Math.abs(p.radius - R), `${label} ${p.corner}`).toBeLessThanOrEqual(0.001 + 1e-9);
      }
      // The box is the halo's exact box, to within a written rounding step.
      const exact = {
        minX: ox - h - config.reach,
        minY: oy - h - config.reach,
        maxX: ox + h + config.reach,
        maxY: oy + h + config.reach,
      };
      expect(halo.box).toEqual({ minX: x0, minY: y0, maxX: x3, maxY: y3 });
      for (const key of ['minX', 'minY', 'maxX', 'maxY'] as const) {
        expect(Math.abs(halo.box[key] - exact[key]), `${label} ${key}`).toBeLessThanOrEqual(0.0005 + 1e-9);
      }
    }
  });

  // Both edges of a lap are rounded as written, so it is within 0.001 of its intended size.
  it('grows each strip over the core and into both neighbouring corners, but never the core', () => {
    for (const [config, r] of shapes) {
      const halo = buildHalo(tileWith(config, { cornerRadius: r })) as HaloModel;
      const [lapIn, lapAlong] = [Math.min(0.5, 50 - r), Math.min(0.5, config.reach / 64)];
      for (const { side, rect, paint } of halo.strips) {
        const across = side === 'left' || side === 'right';
        const inward = {
          left: paint.maxX - rect.maxX,
          right: rect.minX - paint.minX,
          top: paint.maxY - rect.maxY,
          bottom: rect.minY - paint.minY,
        }[side];
        expect(Math.abs(inward - lapIn), side).toBeLessThanOrEqual(0.001 + 1e-9);
        const [before, after] = across
          ? [rect.minY - paint.minY, paint.maxY - rect.maxY]
          : [rect.minX - paint.minX, paint.maxX - rect.maxX];
        // Rounded down as written, so never longer than its budget.
        const written = Math.floor(lapAlong * 1000) / 1000;
        expect(Number(before.toFixed(6)), side).toBe(written);
        expect(Number(after.toFixed(6)), side).toBe(written);
        const outer = {
          left: paint.minX - rect.minX,
          right: paint.maxX - rect.maxX,
          top: paint.minY - rect.minY,
          bottom: paint.maxY - rect.maxY,
        }[side];
        expect(outer, side).toBe(0);
      }
    }
  });

  it('runs each strip’s gradient from its inner edge to its outer edge', () => {
    for (const [config, r] of shapes) {
      const halo = buildHalo(tileWith(config, { cornerRadius: r })) as HaloModel;
      for (const { side, rect, from, to } of halo.strips) {
        const [inner, outer] = {
          left: [rect.maxX, rect.minX],
          right: [rect.minX, rect.maxX],
          top: [rect.maxY, rect.minY],
          bottom: [rect.minY, rect.maxY],
        }[side];
        const across = side === 'left' || side === 'right';
        expect(across ? [from.x, to.x] : [from.y, to.y], side).toEqual([inner, outer]);
        expect(across ? from.y - to.y : from.x - to.x, side).toBe(0);
      }
    }
  });

  /** Which of the halo's shares contain a point: core, strips (boxes) and corners (quarter discs). */
  function piecesAt(halo: HaloModel, x: number, y: number) {
    const inBox = (b: { minX: number; minY: number; maxX: number; maxY: number }) =>
      x > b.minX && x < b.maxX && y > b.minY && y < b.maxY;
    const pieces = [inBox(halo.core), ...halo.strips.map((s) => inBox(s.rect))];
    for (const p of halo.patches) {
      const [dx, dy] = [x - p.centre.x, y - p.centre.y];
      const outward =
        Math.sign(dx) === Math.sign(p.start.x - p.centre.x) && Math.sign(dy) === Math.sign(p.end.y - p.centre.y);
      pieces.push(outward && (dx / p.rx) ** 2 + (dy / p.ry) ** 2 < 1);
    }
    return pieces.filter(Boolean).length;
  }

  it('partitions the shadow exactly: every point within reach of the core is in one share, others in none', () => {
    for (const config of [on, { strength: 1, reach: 40, offset: 20 }, { strength: 0.3, reach: 0.5, offset: 0 }]) {
      for (const cornerRadius of [0, 0.8, 12, 50]) {
        const halo = buildHalo(tileWith(config, { cornerRadius })) as HaloModel;
        const { core, box } = halo;
        const R = halo.patches[0]?.radius ?? NaN;
        // An irrational step keeps the samples off the shares' shared edges;
        // points within a rounding step of the outline are left out.
        for (let x = box.minX - 3; x < box.maxX + 3; x += Math.SQRT2 / 1.7) {
          for (let y = box.minY - 3; y < box.maxY + 3; y += Math.PI / 4.1) {
            const dx = Math.max(core.minX - x, 0, x - core.maxX);
            const dy = Math.max(core.minY - y, 0, y - core.maxY);
            const d = Math.hypot(dx, dy);
            if (Math.abs(d - R) < 0.002) continue;
            expect(piecesAt(halo, x, y), `r ${cornerRadius} (${x}, ${y})`).toBe(d < R ? 1 : 0);
          }
        }
      }
    }
  });

  it('builds one stop list: full to the moved outline, then (1 − t)² over the reach, as 8-bit greys', () => {
    const r = 0.8;
    const halo = buildHalo(tileWith(on)) as HaloModel;
    const ts = [0, 0.25, 0.5, 0.75, 1];
    expect(halo.stops.map((s) => s.offset)).toEqual(ts.map((t) => (r + t * on.reach) / (r + on.reach)));
    expect(halo.stops.map((s) => s.level)).toEqual(ts.map((t) => (1 - t) ** 2));
    expect(halo.stops.map((s) => s.grey)).toEqual(['#ffffff', '#8f8f8f', '#404040', '#101010', '#000000']);
  });
});
