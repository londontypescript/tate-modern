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
  it('is absent at the neutral values, and when strength or reach is 0', () => {
    expect(buildHalo(tileWith(neutralHalo))).toBeUndefined();
    expect(buildHalo(tileWith({ ...on, strength: 0 }))).toBeUndefined();
    expect(buildHalo(tileWith({ ...on, reach: 0 }))).toBeUndefined();
    expect(buildHalo(tileWith(undefined))).toBeUndefined();
  });

  it('is absent when the tile size or corner radius is not a finite positive number', () => {
    for (const size of [huge, -huge, NaN, 0, -100, 'big']) {
      expect(buildHalo(tileWith(on, { size: size as number })), `size ${String(size)}`).toBeUndefined();
    }
    for (const cornerRadius of [huge, NaN, 0, -1, 'round']) {
      const tile = tileWith(on, { cornerRadius: cornerRadius as number });
      expect(buildHalo(tile), `cornerRadius ${String(cornerRadius)}`).toBeUndefined();
    }
  });

  it('is navy at the configured strength', () => {
    const halo = buildHalo(tileWith(on)) as HaloModel;
    expect(halo.colour).toBe(palette.navy);
    expect(halo.strength).toBe(0.8);
  });

  it('places the core and every piece about the tile moved left and down by the offset', () => {
    const size = 100;
    const r = 0.8;
    const [h, a, R] = [size / 2, size / 2 - r, r + on.reach];
    const [ox, oy] = [-on.offset, on.offset];
    const halo = buildHalo(tileWith(on)) as HaloModel;
    expect(halo.core).toEqual({ minX: ox - a, minY: oy - a, maxX: ox + a, maxY: oy + a });
    const strip = Object.fromEntries(halo.strips.map((s) => [s.side, s.rect]));
    expect(strip.left).toEqual({ minX: ox - a - R, minY: oy - a, maxX: ox - a, maxY: oy + a });
    expect(strip.right).toEqual({ minX: ox + a, minY: oy - a, maxX: ox + a + R, maxY: oy + a });
    expect(strip.top).toEqual({ minX: ox - a, minY: oy - a - R, maxX: ox + a, maxY: oy - a });
    expect(strip.bottom).toEqual({ minX: ox - a, minY: oy + a, maxX: ox + a, maxY: oy + a + R });
    for (const patch of halo.patches) {
      expect(patch.radius).toBe(R);
      expect([Math.abs(patch.centre.x - ox), Math.abs(patch.centre.y - oy)]).toEqual([a, a]);
    }
    const box = halo.box;
    expect(box.minX).toBeCloseTo(ox - h - on.reach, 9);
    expect(box.maxX).toBeCloseTo(ox + h + on.reach, 9);
    expect(box.minY).toBeCloseTo(oy - h - on.reach, 9);
    expect(box.maxY).toBeCloseTo(oy + h + on.reach, 9);
  });

  it('runs each strip’s gradient across its depth, outward from the core', () => {
    const halo = buildHalo(tileWith(on)) as HaloModel;
    for (const { side, rect, from, to } of halo.strips) {
      const depth = Math.hypot(to.x - from.x, to.y - from.y);
      expect(depth, side).toBeCloseTo(0.8 + on.reach, 9);
      const inner = { left: rect.maxX, right: rect.minX, top: rect.maxY, bottom: rect.minY }[side];
      expect(side === 'left' || side === 'right' ? from.x : from.y, side).toBe(inner);
    }
  });

  /** Which pieces contain a point: core, strips (boxes) and patches (quarter discs). */
  function piecesAt(halo: HaloModel, x: number, y: number) {
    const inBox = (b: { minX: number; minY: number; maxX: number; maxY: number }) =>
      x > b.minX && x < b.maxX && y > b.minY && y < b.maxY;
    const pieces = [inBox(halo.core), ...halo.strips.map((s) => inBox(s.rect))];
    for (const p of halo.patches) {
      const [dx, dy] = [x - p.centre.x, y - p.centre.y];
      const outward =
        Math.sign(dx) === Math.sign(p.start.x - p.centre.x) && Math.sign(dy) === Math.sign(p.end.y - p.centre.y);
      pieces.push(outward && Math.hypot(dx, dy) < p.radius);
    }
    return pieces.filter(Boolean).length;
  }

  it('partitions the shadow exactly: every point within reach of the core is in one piece, others in none', () => {
    for (const config of [on, { strength: 1, reach: 40, offset: 20 }, { strength: 0.3, reach: 0.5, offset: 0 }]) {
      for (const cornerRadius of [0.8, 12, 50]) {
        const halo = buildHalo(tileWith(config, { cornerRadius })) as HaloModel;
        const { core, box } = halo;
        const R = halo.patches[0]?.radius ?? NaN;
        // An irrational step keeps the samples off the pieces' shared edges.
        for (let x = box.minX - 3; x < box.maxX + 3; x += Math.SQRT2 / 1.7) {
          for (let y = box.minY - 3; y < box.maxY + 3; y += Math.PI / 4.1) {
            const dx = Math.max(core.minX - x, 0, x - core.maxX);
            const dy = Math.max(core.minY - y, 0, y - core.maxY);
            const inside = Math.hypot(dx, dy) < R;
            expect(piecesAt(halo, x, y), `r ${cornerRadius} (${x}, ${y})`).toBe(inside ? 1 : 0);
          }
        }
      }
    }
  });

  it('builds one stop list: full strength to the moved outline, then (1 − t)² over the reach', () => {
    const r = 0.8;
    const halo = buildHalo(tileWith(on)) as HaloModel;
    const ts = [0, 0.25, 0.5, 0.75, 1];
    expect(halo.stops.map((s) => s.offset)).toEqual(ts.map((t) => (r + t * on.reach) / (r + on.reach)));
    expect(halo.stops.map((s) => s.opacity)).toEqual(ts.map((t) => on.strength * (1 - t) ** 2));
  });

  it('keeps within strength / 64 of the smooth curve between its stops', () => {
    const halo = buildHalo(tileWith({ strength: 1, reach: 10, offset: 0 })) as HaloModel;
    const [r, R] = [0.8, 10.8];
    let worst = 0;
    for (let d = r; d <= R; d += 0.01) {
      const u = d / R;
      const i = Math.max(
        halo.stops.findIndex((s) => s.offset >= u),
        1,
      );
      const [s0, s1] = [halo.stops[i - 1]!, halo.stops[i]!];
      const linear = s0.opacity + ((s1.opacity - s0.opacity) * (u - s0.offset)) / (s1.offset - s0.offset);
      worst = Math.max(worst, Math.abs(linear - (1 - (d - r) / 10) ** 2));
    }
    expect(worst).toBeLessThanOrEqual(1 / 64 + 1e-9);
  });
});
