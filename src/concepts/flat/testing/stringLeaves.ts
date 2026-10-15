/**
 * Every string field of the flat configuration, classed by what the engine
 * does with it, for the tests that feed the engine untrusted strings. It
 * mirrors `numericLeaves.ts`: a string field that isn't classed here fails
 * the inventory, so a colour added later can't go unchecked.
 */
import { defaultLogoConfig } from '../engine';
import { missing, type LeafPath } from './numericLeaves';

/**
 * - `colour`: written into a `fill`, a `stop-color` or the background, so
 *   only `#` and six hex digits are drawn.
 * - `choice`: one of a fixed set of words.
 * - `text`: drawn as outlines; its characters reach only ids, made safe there.
 */
type StringClass = 'colour' | 'choice' | 'text';

/** Each string field, with list positions written as `*`. */
const classes: Record<string, StringClass> = {
  'emblem.colours.*': 'colour',
  'emblem.fadeColour': 'colour',
  'emblem.blendMode': 'choice',
  'tile.colour': 'colour',
  'tile.textColour': 'colour',
  'tile.text': 'text',
  'wordmark.lines.*.runs.*.colour': 'colour',
  'wordmark.lines.*.runs.*.text': 'text',
  'layout.background': 'colour',
};

/** A path's field, its list positions written as `*`. */
export const fieldName = (path: LeafPath) => path.map((k) => (typeof k === 'number' ? '*' : k)).join('.');

export const classOf = (path: LeafPath): StringClass | undefined => classes[fieldName(path)];

export const classedFields = Object.keys(classes);

/** The paths of every string in a configuration, found by walking it. */
export function stringPaths(value: unknown, prefix: LeafPath = []): LeafPath[] {
  if (typeof value === 'string') return [prefix];
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, v]) =>
    stringPaths(v, [...prefix, Array.isArray(value) ? Number(key) : key]),
  );
}

/** Every colour in the defaults, found by walking them, so a new colour field is checked as soon as it is classed. */
export const colourLeaves: readonly LeafPath[] = stringPaths(defaultLogoConfig).filter(
  (path) => classOf(path) === 'colour',
);

/** What a saved colour may arrive as, none of them a colour the logo may write. */
export const notColours: readonly [string, unknown][] = [
  ['url(#x)', 'url(#x)'],
  ['red', 'red'],
  ['#fff', '#fff'],
  ['#12345g', '#12345g'],
  ['#1234567', '#1234567'],
  ['" #112233"', ' #112233'],
  ['"#112233\\n"', '#112233\n'],
  ['quotes and onload=', '#112233" onload="alert(1)'],
  ['""', ''],
  ['0x112233', 0x112233],
  ['null', null],
  ['["#112233"]', ['#112233']],
  ['{}', {}],
  ['missing', missing],
];
