import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { LogoFonts } from '../../../shared';
import { defaultLogoConfig, neutralVariation, type EmblemConfig } from './config';
import { clampCornerRadius } from './bounds';
import { buildLogo, generateFacets, generateLayers } from './geometry';
import { Channel, sample } from './random';
import type { SheetLayer } from './types';

const emblem: EmblemConfig = { ...defaultLogoConfig.emblem, ...neutralVariation };

describe('generateLayers', () => {
  it('creates one centred square per count, rotated by a fixed increment', () => {
    const layers = generateLayers({ ...emblem, layerCount: 6, initialRotation: 7.5, rotationIncrement: 15 });
    expect(layers.map((l) => l.rotation)).toEqual([7.5, 22.5, 37.5, 52.5, 67.5, 82.5]);
    expect(layers.map((l) => l.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(new Set(layers.map((l) => l.id)).size).toBe(6);
    for (const l of layers)
      expect(l).toMatchObject({ x: 0, y: 0, width: emblem.squareSize, height: emblem.squareSize });
  });

  it('is deterministic', () => {
    expect(generateLayers(emblem)).toEqual(generateLayers(emblem));
  });

  it('cycles the palette from back to front', () => {
    const layers = generateLayers({ ...emblem, layerCount: 5, colours: ['#aaaaaa', '#BBBBBB'] });
    expect(layers.map((l) => l.fill)).toEqual(['#aaaaaa', '#BBBBBB', '#aaaaaa', '#BBBBBB', '#aaaaaa']);
  });

  it('draws with the default colours when the list is empty or holds anything but colours', () => {
    for (const colours of [[], ['#aaaaaa', 'red'], ['url(#x)'], [' #aaaaaa']]) {
      const layers = generateLayers({ ...emblem, layerCount: 4, colours });
      const [a, b] = defaultLogoConfig.emblem.colours;
      expect(
        layers.map((l) => l.fill),
        JSON.stringify(colours),
      ).toEqual([a, b, a, b]);
    }
  });

  it('tapers sizes linearly from the back layer to the front one', () => {
    const layers = generateLayers({ ...emblem, layerCount: 3, squareSize: 100, sizeTaper: 0.2 });
    expect(layers.map((l) => l.width)).toEqual([100, 90, 80]);
    expect(layers.map((l) => l.height)).toEqual([100, 90, 80]);
  });

  it('handles degenerate counts', () => {
    expect(generateLayers({ ...emblem, layerCount: 0 })).toEqual([]);
    expect(generateLayers({ ...emblem, layerCount: 1, sizeTaper: 0.5 })[0]?.width).toBe(emblem.squareSize);
  });
});

describe('sheet variation', () => {
  const base: EmblemConfig = { ...emblem, layerCount: 8, sizeTaper: 0.2, seed: 7 };
  const neutral = generateLayers(base);
  const geometryOf = (l: SheetLayer) => ({
    rotation: [l.rotation],
    size: [(l.width + l.height) / 2],
    aspect: [l.width / l.height],
    offset: [l.x, l.y],
  });
  /** Which kinds of geometry differ from the neutral sheets'. */
  const changed = (layers: SheetLayer[]) =>
    (['rotation', 'size', 'aspect', 'offset'] as const).filter((key) =>
      layers.some((l, i) => {
        const before = geometryOf(neutral[i] as SheetLayer)[key];
        return geometryOf(l)[key].some((v, j) => Math.abs(v - (before[j] ?? NaN)) > 1e-9);
      }),
    );

  it('follows the formulas for each channel', () => {
    const c = { ...base, rotationJitter: 10, sizeJitter: 0.2, aspectJitter: 0.1, offsetJitter: 5 };
    const layers = generateLayers(c);
    layers.forEach((layer, i) => {
      const u = (channel: (typeof Channel)[keyof typeof Channel]) => sample(7, i, channel);
      const s = (neutral[i]?.width ?? 0) * (1 + 0.2 * u(Channel.size));
      expect(layer.rotation).toBeCloseTo(7.5 + i * 15 + 10 * u(Channel.rotation), 12);
      expect(layer.width).toBeCloseTo(s * (1 + 0.1 * u(Channel.aspect)), 12);
      expect(layer.height).toBeCloseTo(s * (1 - 0.1 * u(Channel.aspect)), 12);
      expect((layer.width + layer.height) / 2).toBeCloseTo(s, 12);
      expect(layer.x).toBeCloseTo(5 * u(Channel.offsetX), 12);
      expect(layer.y).toBeCloseTo(5 * u(Channel.offsetY), 12);
    });
  });

  it('changes only its own geometry for each control', () => {
    expect(changed(generateLayers({ ...base, rotationJitter: 10 }))).toEqual(['rotation']);
    expect(changed(generateLayers({ ...base, sizeJitter: 0.2 }))).toEqual(['size']);
    expect(changed(generateLayers({ ...base, aspectJitter: 0.2 }))).toEqual(['aspect']);
    expect(changed(generateLayers({ ...base, offsetJitter: 10 }))).toEqual(['offset']);
  });

  it('shifts each axis independently', () => {
    const layers = generateLayers({ ...base, offsetJitter: 10 });
    expect(layers.some((l) => Math.abs(Math.abs(l.x) - Math.abs(l.y)) > 0.5)).toBe(true);
  });

  it('gives the same emblem for the same seed, and a different one for another', () => {
    const c = { ...base, rotationJitter: 10, sizeJitter: 0.2, aspectJitter: 0.2, offsetJitter: 10 };
    expect(generateLayers({ ...c })).toEqual(generateLayers({ ...c }));
    expect(generateLayers({ ...c, seed: 8 })).not.toEqual(generateLayers(c));
  });

  it("never shifts existing layers' samples when the layer count changes", () => {
    const c = { ...emblem, rotationJitter: 10, aspectJitter: 0.2, offsetJitter: 10, seed: 3 };
    const four = generateLayers({ ...c, layerCount: 4 });
    const nine = generateLayers({ ...c, layerCount: 9 });
    four.forEach((layer, i) => {
      const other = nine[i] as SheetLayer;
      expect([other.rotation, other.x, other.y, other.width / other.height]).toEqual([
        layer.rotation,
        layer.x,
        layer.y,
        layer.width / layer.height,
      ]);
    });
  });

  it('clamps the corner radius to half the smaller side', () => {
    expect(clampCornerRadius(10, 40)).toBe(5);
    expect(clampCornerRadius(10, -1)).toBe(0);
    // Within the sliders' ranges the smallest sheet still holds the largest radius.
    const layers = generateLayers({ ...base, sizeTaper: 0.4, sizeJitter: 0.3, aspectJitter: 0.3, cornerRadius: 12 });
    for (const l of layers) {
      expect(l.cornerRadius).toBe(12);
      expect(l.cornerRadius).toBeLessThanOrEqual(Math.min(l.width, l.height) / 2);
    }
  });

  it('places a neutral sheet exactly at the origin, never at -0', () => {
    for (const l of generateLayers(base)) {
      expect(Object.is(l.x, 0)).toBe(true);
      expect(Object.is(l.y, 0)).toBe(true);
    }
  });
});

describe('generateFacets', () => {
  const shading = { apexX: 0.5, apexY: 0.4, top: 0.3, right: 0, bottom: -0.2, left: 0.1 };

  it('makes four facets meeting at the apex', () => {
    const facets = generateFacets(-50, -50, 100, 0, shading);
    expect(facets.map((f) => f.id)).toEqual(['facet-top', 'facet-right', 'facet-bottom', 'facet-left']);
    for (const facet of facets) expect(facet.d).toContain('L0 -10Z');
  });

  it('lightens with white and darkens with navy', () => {
    const [top, , bottom] = generateFacets(-50, -50, 100, 0, shading);
    expect(top).toMatchObject({ fill: '#ffffff', opacity: 0.3 });
    expect(bottom?.fill).not.toBe('#ffffff');
    expect(bottom?.opacity).toBeCloseTo(0.2);
  });

  it('follows rounded corners with arcs', () => {
    const facets = generateFacets(-50, -50, 100, 4, shading);
    for (const facet of facets) expect(facet.d.match(/A/g)).toHaveLength(2);
  });
});

describe('tile lettering ids', () => {
  let fonts: LogoFonts;
  beforeAll(async () => {
    fonts = await loadLogoFontsFromDisk();
  });
  const ids = (text: string) =>
    buildLogo({ ...defaultLogoConfig, tile: { ...defaultLogoConfig.tile, text } }, fonts).emblem.tile.lettering.map(
      (l) => l.id,
    );

  it('name each letter by its character, as they always have', () => {
    expect(ids('TS')).toEqual(['tile-letter-0-T', 'tile-letter-1-S']);
  });

  it('write any character outside letters, digits, _ and - as its code point', () => {
    expect(ids('T "<')).toEqual([
      'tile-letter-0-T',
      'tile-letter-1-u0020',
      'tile-letter-2-u0022',
      'tile-letter-3-u003c',
    ]);
  });
});
