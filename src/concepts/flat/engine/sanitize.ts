import {
  defaultLogoConfig,
  emblemRanges,
  neutralVariation,
  variationRanges,
  type EmblemConfig,
  type VariationConfig,
} from './config';

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
  for (const key of jitters) {
    const { min, max } = variationRanges[key];
    out[key] = finite(out[key]) ? clamp(out[key], min, max) : neutralVariation[key];
  }
  const { min, max } = variationRanges.seed;
  out.seed = finite(out.seed) ? clamp(Math.round(out.seed), min, max) : neutralVariation.seed;
  return out;
}
