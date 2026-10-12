import { describe, expect, it } from 'vitest';
import { defaultProjectedConfig, type ProjectedConfig } from './config';
import { buildProjectedEmblem, type ProjectedFace } from './project';
import { acesFilmic, hexToLinear, linearToHex, shade, toDisplay } from './shading';
import { slabFaces } from './slab';
import { normalize } from './vec';

const config = defaultProjectedConfig;
const lettering = [{ id: 'glyph', d: 'M0 0L10 0L10 10Z', fill: '#fff' }];
const faces = (items: ReturnType<typeof buildProjectedEmblem>['items']) =>
  items.filter((i): i is ProjectedFace => i.type === 'face');

describe('slabFaces', () => {
  it('matches ExtrudeGeometry: two caps, a bevel band per segment on each side, four sides', () => {
    const all = slabFaces(config.slab);
    const segments = config.slab.bevelSegments;
    expect(all.filter((f) => f.kind === 'front')).toHaveLength(1);
    expect(all.filter((f) => f.kind === 'back')).toHaveLength(1);
    expect(all.filter((f) => f.kind === 'bevel')).toHaveLength(2 * segments * 4);
    expect(all.filter((f) => f.kind === 'side')).toHaveLength(4);
  });

  it('puts the front cap at depth / 2 + bevel thickness, grown by the bevel offset', () => {
    const front = slabFaces(config.slab).find((f) => f.kind === 'front')!;
    for (const [x, y, z] of front.points) {
      expect(Math.abs(x)).toBeCloseTo(0.5 + config.slab.bevelOffset);
      expect(Math.abs(y)).toBeCloseTo(0.5 + config.slab.bevelOffset);
      expect(z).toBeCloseTo(config.slab.depth / 2 + config.slab.bevelThickness);
    }
  });
});

describe('shading', () => {
  it('round-trips sRGB hex through linear light', () => {
    for (const hex of ['#006eff', '#ffffff', '#000000', '#fcf6e9']) expect(linearToHex(hexToLinear(hex))).toBe(hex);
  });

  it('tone maps black to black and stays monotonic and below 1', () => {
    expect(acesFilmic([0, 0, 0])).toEqual([0, 0, 0]);
    let previous = 0;
    for (const v of [0.01, 0.1, 0.5, 1, 4, 30]) {
      const [r] = acesFilmic([v, v, v]);
      expect(r).toBeGreaterThan(previous);
      expect(r).toBeLessThanOrEqual(1);
      previous = r;
    }
  });

  it('lights a pure metal only by its specular reflection (ambient adds nothing)', () => {
    const metal = { colour: hexToLinear('#006eff'), metalness: 1, roughness: 0.375 };
    const n = normalize([0, 0, 1]);
    expect(shade(metal, n, n, [], 5)).toEqual([0, 0, 0]);
    const lit = shade(metal, n, n, [{ direction: n, intensity: 30 }], 0);
    expect(lit[2]).toBeGreaterThan(lit[0]);
    const behind = shade(metal, n, n, [{ direction: normalize([0, 0, -1]), intensity: 30 }], 0);
    expect(behind).toEqual([0, 0, 0]);
  });

  it('brightens with exposure', () => {
    const c: [number, number, number] = [0.2, 0.3, 0.8];
    expect(toDisplay(c, 2)[2]).toBeGreaterThan(toDisplay(c, 1)[2]);
  });
});

describe('buildProjectedEmblem', () => {
  it('draws only faces turned towards the camera, unless back faces are asked for', () => {
    const front = faces(buildProjectedEmblem(config).items);
    expect(front.some((f) => f.kind === 'back')).toBe(false);
    expect(front.filter((f) => f.kind === 'front')).toHaveLength(config.stack.count);
    const both = faces(
      buildProjectedEmblem({ ...config, projection: { ...config.projection, backFaces: true } }).items,
    );
    expect(both.length).toBeGreaterThan(front.length);
  });

  it('paints back to front: the front slab last', () => {
    const drawn = faces(buildProjectedEmblem(config).items);
    expect(drawn.at(-1)?.slab).toBe(0);
    expect(drawn[0]?.slab).toBe(config.stack.count - 1);
  });

  it('frames a single untilted slab symmetrically about the centre', () => {
    const single: ProjectedConfig = {
      ...config,
      stack: { ...config.stack, count: 1, rotateStep: 0 },
      projection: { ...config.projection, gradients: false },
    };
    const { bounds } = buildProjectedEmblem(single);
    expect(bounds.minX).toBeCloseTo(-bounds.maxX);
    expect(bounds.minY).toBeCloseTo(-bounds.maxY);
  });

  it('puts the lettering on the front slab only when shown', () => {
    const hidden = buildProjectedEmblem(config, lettering);
    expect(hidden.items.some((i) => i.type === 'lettering')).toBe(false);
    const shown = buildProjectedEmblem({ ...config, lettering: { ...config.lettering, show: true } }, lettering);
    const index = shown.items.findIndex((i) => i.type === 'lettering');
    expect(index).toBe(shown.items.length - 1);
  });

  it('uses gradients only where a face visibly varies', () => {
    const drawn = faces(buildProjectedEmblem(config).items);
    expect(drawn.some((f) => f.gradient)).toBe(true);
    expect(drawn.some((f) => !f.gradient)).toBe(true);
    const flat = faces(
      buildProjectedEmblem({ ...config, projection: { ...config.projection, gradients: false } }).items,
    );
    expect(flat.every((f) => !f.gradient)).toBe(true);
  });

  it('turns slabs by the given spins', () => {
    const still = buildProjectedEmblem(config);
    const spun = buildProjectedEmblem(config, [], [0.3]);
    expect(faces(spun.items)).not.toEqual(faces(still.items));
  });

  it('is deterministic', () => {
    expect(buildProjectedEmblem(config, lettering)).toEqual(buildProjectedEmblem(config, lettering));
  });
});
