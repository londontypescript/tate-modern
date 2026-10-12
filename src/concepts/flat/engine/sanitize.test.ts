import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { flatStarters } from '../starters';
import { defaultLogoConfig, emblemRanges, neutralVariation, variationRanges, type LogoConfig } from './config';
import { layersBounds } from './bounds';
import { generateLayers } from './geometry';
import { sanitizeEmblemConfig } from './sanitize';

const defaults = defaultLogoConfig.emblem;
/** What `JSON.parse` gives for a hand-edited saved value. */
const huge = JSON.parse('1e400') as number;
const bad = (over: Record<string, unknown>) => ({ ...defaults, ...over });

describe('sanitizeEmblemConfig', () => {
  it('returns a valid configuration unchanged', () => {
    const valid = { ...defaults, rotationJitter: 12, sizeJitter: 0.1, aspectJitter: 0.2, offsetJitter: 8, seed: 42 };
    expect(sanitizeEmblemConfig(valid)).toEqual(valid);
  });

  it('gives every older numeric field that is not a finite number its default', () => {
    const fields = [
      'layerCount',
      'rotationIncrement',
      'initialRotation',
      'squareSize',
      'sizeTaper',
      'cornerRadius',
      'opacity',
      'fade',
      'fadeTurn',
      'fadeAngle',
    ] as const;
    for (const field of fields) {
      for (const value of [huge, -huge, NaN, 'lots', undefined, null]) {
        expect(sanitizeEmblemConfig(bad({ [field]: value }))[field], `${field} = ${String(value)}`).toBe(
          defaults[field],
        );
      }
    }
  });

  it('makes a variation field that is not a finite number neutral', () => {
    for (const field of ['rotationJitter', 'sizeJitter', 'aspectJitter', 'offsetJitter', 'seed'] as const) {
      for (const value of [huge, -huge, NaN, '3', undefined]) {
        const strong = { ...defaults, rotationJitter: 5, sizeJitter: 0.1, aspectJitter: 0.1, offsetJitter: 5, seed: 9 };
        expect(sanitizeEmblemConfig({ ...strong, [field]: value })[field]).toBe(neutralVariation[field]);
      }
    }
  });

  it('clamps the variation to the slider ranges', () => {
    const low = sanitizeEmblemConfig(bad({ rotationJitter: -5, sizeJitter: -1, aspectJitter: -0.5, offsetJitter: -3 }));
    expect([low.rotationJitter, low.sizeJitter, low.aspectJitter, low.offsetJitter]).toEqual([0, 0, 0, 0]);
    const high = sanitizeEmblemConfig(bad({ rotationJitter: 500, sizeJitter: 9, aspectJitter: 2, offsetJitter: 1e9 }));
    expect([high.rotationJitter, high.sizeJitter, high.aspectJitter, high.offsetJitter]).toEqual([
      variationRanges.rotationJitter.max,
      variationRanges.sizeJitter.max,
      variationRanges.aspectJitter.max,
      variationRanges.offsetJitter.max,
    ]);
  });

  it('rounds the seed to an integer within 1-999', () => {
    expect(sanitizeEmblemConfig(bad({ seed: 41.6 })).seed).toBe(42);
    expect(sanitizeEmblemConfig(bad({ seed: -7 })).seed).toBe(1);
    expect(sanitizeEmblemConfig(bad({ seed: 0 })).seed).toBe(1);
    expect(sanitizeEmblemConfig(bad({ seed: 12345 })).seed).toBe(999);
  });

  it('limits the layer count to 0-16 and the size to its slider range', () => {
    expect(sanitizeEmblemConfig(bad({ layerCount: -4 })).layerCount).toBe(0);
    expect(sanitizeEmblemConfig(bad({ layerCount: 400 })).layerCount).toBe(16);
    expect(sanitizeEmblemConfig(bad({ squareSize: -50 })).squareSize).toBe(emblemRanges.squareSize.min);
    expect(sanitizeEmblemConfig(bad({ squareSize: 10000 })).squareSize).toBe(emblemRanges.squareSize.max);
  });

  it('clamps every older numeric field to its slider range, however large a finite value is', () => {
    for (const [field, { min, max }] of Object.entries(emblemRanges)) {
      expect(sanitizeEmblemConfig(bad({ [field]: 1e308 }))[field as keyof typeof emblemRanges], field).toBe(max);
      expect(sanitizeEmblemConfig(bad({ [field]: -1e308 }))[field as keyof typeof emblemRanges], field).toBe(min);
    }
  });

  it('leaves the defaults, the starters and the older saved configurations inside the ranges', () => {
    const fixtures = JSON.parse(
      readFileSync(new URL('../components/__fixtures__/configs.json', import.meta.url), 'utf8'),
    ) as Record<string, LogoConfig>;
    const configs = [defaultLogoConfig, ...flatStarters.map((s) => s.config), ...Object.values(fixtures)];
    for (const config of configs) {
      const sanitized = sanitizeEmblemConfig(config.emblem);
      for (const field of Object.keys(emblemRanges) as (keyof typeof emblemRanges)[]) {
        expect(sanitized[field], field).toBe(config.emblem[field]);
      }
    }
  });
});

describe('generateLayers with untrusted input', () => {
  it('draws only finite sheets from large finite values', () => {
    for (const over of [
      { rotationIncrement: 1e308 },
      { initialRotation: -1e308 },
      { sizeTaper: -1e308 },
      { sizeTaper: 1e308 },
      { squareSize: 1e308, cornerRadius: 1e308 },
    ]) {
      const layers = generateLayers(bad({ ...over, layerCount: 16, rotationJitter: 20, sizeJitter: 0.3 }));
      const box = layersBounds(layers);
      for (const v of [box.minX, box.minY, box.maxX, box.maxY])
        expect(Number.isFinite(v), JSON.stringify(over)).toBe(true);
      for (const l of layers) {
        for (const v of [l.width, l.height, l.rotation, l.cornerRadius]) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('draws only finite, non-negative sheets from a saved config full of bad values', () => {
    const layers = generateLayers(
      bad({
        layerCount: 1e6,
        squareSize: huge,
        sizeTaper: 3,
        cornerRadius: -huge,
        rotationJitter: huge,
        sizeJitter: 50,
        aspectJitter: -1,
        offsetJitter: NaN,
        seed: huge,
      }),
    );
    expect(layers).toHaveLength(16);
    for (const l of layers) {
      for (const v of [l.width, l.height, l.x, l.y, l.rotation, l.cornerRadius]) expect(Number.isFinite(v)).toBe(true);
      expect(l.width).toBeGreaterThanOrEqual(0);
      expect(l.height).toBeGreaterThanOrEqual(0);
    }
  });
});
