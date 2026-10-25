import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePresets } from '../../studio/presets';
import { controlGroups } from './controls';
import { fillMissing } from './FlatStudio';
import { flatStarters } from './starters';
import {
  getAt,
  malformedContainers,
  missing,
  notNumbers,
  numberPaths,
  numericLeaves,
  pathName,
  untrusted,
  withLeaf,
} from './testing/numericLeaves';
import { advanceRotations, layerVelocities } from './engine/animation';
import { defaultLogoConfig, neutralHalo, neutralVariation, type LogoConfig } from './engine/config';
import { generateLayers } from './engine/geometry';
import { sanitizeLogoConfig } from './engine/sanitize';

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
/**
 * What a field that isn't a finite number becomes: its default, except the
 * sheet variation and the halo, which take their neutral (off) values so a
 * broken saved value never turns them on, whatever the defaults become.
 */
const fallback = (path: readonly (string | number)[]) =>
  path[1] === 'halo'
    ? neutralHalo[path[2] as keyof typeof neutralHalo]
    : path[0] === 'emblem' && (path[1] as string) in neutralVariation
      ? neutralVariation[path[1] as keyof typeof neutralVariation]
      : getAt(defaultLogoConfig, path);

/**
 * What a field inside a part that isn't an object becomes: the part is
 * replaced by its defaults as a whole, variation and halo included, except
 * the halo itself, which is the neutral (absent) halo when it isn't an object.
 */
const partFallback = (parts: readonly (readonly (string | number)[])[], path: readonly (string | number)[]) =>
  parts.some((p) => p[0] === 'tile' && p[1] === 'halo') ? fallback(path) : getAt(defaultLogoConfig, path);

const fixtures = JSON.parse(
  readFileSync(new URL('./components/__fixtures__/configs.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;
/** The fixtures as the studio loads them. */
const savedFixtures = parsePresets(
  JSON.stringify(Object.entries(fixtures).map(([id, config]) => ({ id, name: id, config }))),
  defaultLogoConfig,
  fillMissing,
).map((p) => p.config);
const existing: LogoConfig[] = [defaultLogoConfig, ...flatStarters.map((s) => s.config), ...savedFixtures];

describe('the inventory of numeric fields', () => {
  it('gives every number in the configuration a range', () => {
    const ranged = numericLeaves.map(([path]) => pathName(path)).sort();
    expect(numberPaths(defaultLogoConfig).map(pathName).sort()).toEqual(ranged);
  });

  it('keeps every default, starter and saved fixture inside the ranges', () => {
    for (const config of existing) {
      for (const [path, { min, max }] of numericLeaves) {
        const value = getAt(config, path) as number;
        expect(value, pathName(path)).toBeGreaterThanOrEqual(min);
        expect(value, pathName(path)).toBeLessThanOrEqual(max);
      }
    }
  });
});

describe('sanitizeLogoConfig', () => {
  it('gives a field that is not a finite number its default, never a coerced value', () => {
    for (const [path] of numericLeaves) {
      for (const [name, value] of notNumbers) {
        const used = sanitizeLogoConfig(withLeaf(path, value));
        expect(getAt(used, path), `${pathName(path)} = ${name}`).toBe(fallback(path));
      }
    }
  });

  it('gives a malformed part of the configuration its defaults', () => {
    for (const [name, config, paths] of malformedContainers) {
      const used = sanitizeLogoConfig(config);
      for (const [leaf] of numericLeaves.filter(([p]) => paths.some((c) => c.every((k, i) => p[i] === k)))) {
        expect(getAt(used, leaf), `${name}: ${pathName(leaf)}`).toBe(partFallback(paths, leaf));
      }
    }
  });

  it('clamps a finite field to its range, however large or negative', () => {
    for (const [path, { min, max }] of numericLeaves) {
      for (const value of [1e308, -1e308, -5]) {
        const used = sanitizeLogoConfig(withLeaf(path, value));
        expect(getAt(used, path), `${pathName(path)} = ${value}`).toBe(clamp(value, min, max));
      }
    }
  });

  it('gives every field a finite number within its range, whatever arrives', () => {
    for (const [path, { min, max }] of numericLeaves) {
      for (const [name, value] of untrusted) {
        const used = getAt(sanitizeLogoConfig(withLeaf(path, value)), path) as number;
        expect(Number.isFinite(used), `${pathName(path)} = ${name}`).toBe(true);
        expect(clamp(used, min, max), `${pathName(path)} = ${name}`).toBe(used);
      }
    }
  });

  it('returns the defaults, the starters and the saved fixtures unchanged', () => {
    for (const config of existing) expect(sanitizeLogoConfig(config)).toEqual(config);
  });

  it('returns a configuration made with the sliders unchanged', () => {
    const controls = controlGroups.flatMap((g) => g.controls);
    for (const start of existing) {
      for (const control of controls) {
        const steps = Math.round((control.max - control.min) / control.step);
        for (const n of [0, Math.round(steps / 3), steps]) {
          // As the range input reports it: a step's value, written as a decimal.
          const value = Number((control.min + n * control.step).toFixed(6));
          const made = control.set(start, value);
          expect(sanitizeLogoConfig(made), `${control.label} = ${value}`).toEqual(made);
        }
      }
    }
  });

  it('leaves the stored configuration as it is', () => {
    const stored = withLeaf(['tile', 'size'], JSON.parse('1e400'));
    const copy = structuredClone(stored);
    sanitizeLogoConfig(stored);
    expect(stored).toEqual(copy);
  });

  it('rounds the whole-number fields to the nearest whole number, as drawn', () => {
    const used = sanitizeLogoConfig(withLeaf(['emblem', 'layerCount'], 6.9));
    expect(used.emblem.layerCount).toBe(7);
    expect(generateLayers(used.emblem)).toHaveLength(7);
    expect(generateLayers(withLeaf(['emblem', 'layerCount'], 6.9).emblem)).toHaveLength(7);
    expect(sanitizeLogoConfig(withLeaf(['emblem', 'layerCount'], 6.4)).emblem.layerCount).toBe(6);
    expect(sanitizeLogoConfig(withLeaf(['emblem', 'seed'], 41.6)).emblem.seed).toBe(42);
  });
});

describe('the animation with untrusted numbers', () => {
  /** A year of turning, far longer than anyone watches. */
  const year = 365 * 24 * 60 * 60;

  it('keeps every sheet’s velocity and rotation finite over a long time', () => {
    const leaves = numericLeaves.filter(([path]) => path[0] === 'animation');
    for (const [path] of leaves) {
      for (const [name, value] of untrusted) {
        for (const alternateDirection of [false, true]) {
          const animation = { ...withLeaf(path, value).animation, alternateDirection };
          const velocities = layerVelocities(16, animation);
          const rotations = advanceRotations(Array<number>(16).fill(7.5), velocities, year);
          for (const v of [...velocities, ...rotations]) {
            expect(Number.isFinite(v), `${pathName(path)} = ${name}`).toBe(true);
          }
        }
      }
    }
  });

  it('turns at the default speeds when a saved speed is not a number', () => {
    const defaults = layerVelocities(6, defaultLogoConfig.animation);
    expect(layerVelocities(6, withLeaf(['animation', 'baseVelocity'], JSON.parse('1e400')).animation)).toEqual(
      defaults,
    );
    expect(layerVelocities(6, withLeaf(['animation', 'speed'], missing).animation)).toEqual(defaults);
  });
});
