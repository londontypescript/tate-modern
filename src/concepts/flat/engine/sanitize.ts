import {
  animationRanges,
  defaultLogoConfig,
  emblemRanges,
  facetRanges,
  layoutRanges,
  lineIndentRange,
  neutralVariation,
  tileRanges,
  variationRanges,
  wordmarkRanges,
  type AnimationConfig,
  type EmblemConfig,
  type LogoConfig,
  type TileConfig,
  type VariationConfig,
} from './config';
import { sanitizeHalo } from './halo';

const plainNumbers = Object.keys(emblemRanges) as (keyof typeof emblemRanges)[];

const jitters = [
  'rotationJitter',
  'sizeJitter',
  'aspectJitter',
  'offsetJitter',
] as const satisfies readonly (keyof VariationConfig)[];

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * An emblem configuration safe to draw. Saved configurations are untrusted
 * (a hand-edited `1e400` arrives as Infinity, and `1e308` is finite but
 * overflows once multiplied), so the engine checks every number itself
 * rather than relying on the sliders: a value that isn't a finite number
 * takes its default, or for the variation its neutral value, and every
 * number is clamped to its slider's range. A configuration made with the
 * sliders comes back with the same values, so its output doesn't change.
 */
export function sanitizeEmblemConfig(config: EmblemConfig): EmblemConfig {
  const out = { ...config };
  for (const key of plainNumbers) {
    const { min, max } = emblemRanges[key];
    out[key] = clamp(finite(out[key]) ? out[key] : defaultLogoConfig.emblem[key], min, max);
  }
  // The whole numbers (this and the seed) round to the nearest here and nowhere else, so a slider shows what is drawn.
  out.layerCount = Math.round(out.layerCount);
  for (const key of jitters) {
    const { min, max } = variationRanges[key];
    out[key] = finite(out[key]) ? clamp(out[key], min, max) : neutralVariation[key];
  }
  const { min, max } = variationRanges.seed;
  out.seed = finite(out.seed) ? clamp(Math.round(out.seed), min, max) : neutralVariation.seed;
  return out;
}

type Range = { min: number; max: number };
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fit = (value: unknown, fallback: number, { min, max }: Range) =>
  clamp(finite(value) ? value : fallback, min, max);

/** Each field named in `ranges`, read from `input` (which may be anything) and fitted to its range. */
function fitFields<K extends string>(input: unknown, defaults: Record<K, number>, ranges: Record<K, Range>) {
  const from = isObject(input) ? input : {};
  const out = {} as Record<K, number>;
  for (const key of Object.keys(ranges) as K[]) out[key] = fit(from[key], defaults[key], ranges[key]);
  return out;
}

function sanitizeTile(tile: TileConfig): TileConfig {
  const defaults = defaultLogoConfig.tile;
  return {
    ...tile,
    ...fitFields(tile, defaults, tileRanges),
    facets: fitFields(tile.facets, defaults.facets, facetRanges),
    halo: sanitizeHalo(tile.halo),
  };
}

/** The wordmark is shared with the other concepts, so the flat engine checks its numbers here, not in it. */
function sanitizeWordmark(wordmark: LogoConfig['wordmark']): LogoConfig['wordmark'] {
  const defaults = defaultLogoConfig.wordmark;
  // A saved line that isn't an object at all is the default line.
  const line = (i: 0 | 1) => {
    const saved: unknown = wordmark.lines[i];
    const from = isObject(saved) ? (saved as unknown as (typeof defaults.lines)[0]) : defaults.lines[i];
    return { ...from, indent: fit(from.indent, defaults.lines[i].indent, lineIndentRange) };
  };
  return { ...wordmark, ...fitFields(wordmark, defaults, wordmarkRanges), lines: [line(0), line(1)] };
}

/** Animation settings safe to turn by: a speed that isn't a finite number takes its default, and each is clamped. */
export function sanitizeAnimation(animation: AnimationConfig): AnimationConfig {
  return { ...animation, ...fitFields(animation, defaultLogoConfig.animation, animationRanges) };
}

/**
 * The whole flat configuration as the engine draws it, and as the studio's
 * sliders show it. Every number is checked as the emblem's are: one that
 * isn't finite takes its default (the variation and the halo their neutral
 * values), and each is clamped to its range in `config.ts`. A configuration
 * made with the sliders comes back with the same values, so its output
 * doesn't change; the configuration passed in is never changed, so a saved
 * one is never rewritten.
 */
export function sanitizeLogoConfig(config: LogoConfig): LogoConfig {
  return {
    ...config,
    emblem: sanitizeEmblemConfig(config.emblem),
    tile: sanitizeTile(config.tile),
    wordmark: sanitizeWordmark(config.wordmark),
    layout: { ...config.layout, ...fitFields(config.layout, defaultLogoConfig.layout, layoutRanges) },
    animation: sanitizeAnimation(config.animation),
  };
}
