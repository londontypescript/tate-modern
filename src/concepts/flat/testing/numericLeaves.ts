/**
 * Every numeric field of the flat configuration, with the range the engine
 * keeps it in, for the tests that feed the engine untrusted numbers.
 */
import {
  animationRanges,
  defaultLogoConfig,
  emblemRanges,
  facetRanges,
  haloRanges,
  layoutRanges,
  lineIndentRange,
  tileRanges,
  variationRanges,
  wordmarkRanges,
  type LogoConfig,
} from '../engine';

export type LeafPath = readonly (string | number)[];
type Range = { min: number; max: number };

const under = (prefix: LeafPath, ranges: Record<string, Range>) =>
  Object.entries(ranges).map(([key, range]): [LeafPath, Range] => [[...prefix, key], range]);

/** Each numeric field's path in the configuration and its range. */
export const numericLeaves: readonly [LeafPath, Range][] = [
  ...under(['emblem'], emblemRanges),
  ...under(['emblem'], variationRanges),
  ...under(['tile'], tileRanges),
  ...under(['tile', 'facets'], facetRanges),
  ...under(['tile', 'halo'], haloRanges),
  [['wordmark', 'lines', 0, 'indent'], lineIndentRange],
  [['wordmark', 'lines', 1, 'indent'], lineIndentRange],
  ...under(['wordmark'], wordmarkRanges),
  ...under(['layout'], layoutRanges),
  ...under(['animation'], animationRanges),
];

/** The paths of every number in a configuration, found by walking it. */
export function numberPaths(value: unknown, prefix: LeafPath = []): LeafPath[] {
  if (typeof value === 'number') return [prefix];
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, v]) =>
    numberPaths(v, [...prefix, Array.isArray(value) ? Number(key) : key]),
  );
}

export const pathName = (path: LeafPath) => path.join('.');

export function getAt(config: unknown, path: LeafPath): unknown {
  return path.reduce<unknown>((at, key) => (at as Record<string | number, unknown>)[key], config);
}

/** The defaults with one field set to `value`, or removed when `value` is `missing`. */
export function withLeaf(path: LeafPath, value: unknown, base: LogoConfig = defaultLogoConfig): LogoConfig {
  const copy = structuredClone(base) as unknown as Record<string | number, unknown>;
  const parent = getAt(copy, path.slice(0, -1)) as Record<string | number, unknown>;
  const key = path.at(-1) as string | number;
  if (value === missing) delete parent[key];
  else parent[key] = value;
  return copy as unknown as LogoConfig;
}

export const missing = Symbol('missing');

/** What `JSON.parse` gives for hand-edited saved values. */
export const untrusted: readonly [string, unknown][] = [
  ['1e400', JSON.parse('1e400')],
  ['-1e400', JSON.parse('-1e400')],
  ['NaN', NaN],
  ['1e308', 1e308],
  ['-1e308', -1e308],
  ['-5', -5],
  ['missing', missing],
  // Wrong types, which must take the default rather than be coerced.
  ['"300"', '300'],
  ['true', true],
  ['null', null],
  ['[300]', [300]],
  ['{}', {}],
];

/** The values above that aren't finite numbers at all. */
export const notNumbers = untrusted.filter(([, v]) => typeof v !== 'number' || !Number.isFinite(v));

/**
 * Configurations whose containers are malformed, each with the paths of the
 * containers that must come back as their defaults.
 */
export const malformedContainers: readonly [string, LogoConfig, LeafPath[]][] = (
  [
    ['emblem: null', ['emblem'], null],
    ['tile: null', ['tile'], null],
    ['tile: "big"', ['tile'], 'big'],
    ['tile.facets: null', ['tile', 'facets'], null],
    ['tile.halo: null', ['tile', 'halo'], null],
    ['wordmark: null', ['wordmark'], null],
    ['wordmark.lines missing', ['wordmark', 'lines'], missing],
    ['wordmark.lines: null', ['wordmark', 'lines'], null],
    ['wordmark.lines: one line', ['wordmark', 'lines'], [{ indent: 0.3, runs: [] }]],
    ['wordmark.lines: three lines', ['wordmark', 'lines'], [{}, {}, {}]],
    ['wordmark.lines: "ab"', ['wordmark', 'lines'], 'ab'],
    ['wordmark.lines[0]: null', ['wordmark', 'lines', 0], null],
    ['layout: null', ['layout'], null],
    ['animation: null', ['animation'], null],
    ['animation: []', ['animation'], []],
  ] as const
).map(([name, path, value]) => [name, withLeaf(path, value), [path]]);
