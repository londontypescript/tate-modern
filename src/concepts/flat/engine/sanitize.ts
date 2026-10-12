import {
  defaultLogoConfig,
  neutralVariation,
  variationRanges,
  type EmblemConfig,
  type VariationConfig,
} from './config';

/** The most sheets the studio offers; more would only slow the page. */
export const MAX_LAYERS = 16;

/** Emblem fields that predate the variation; a bad saved value falls back to the default. */
const plainNumbers = [
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
] as const satisfies readonly (keyof EmblemConfig)[];

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
 * (a hand-edited `1e400` arrives as Infinity), so the engine checks every
 * number itself rather than relying on the sliders: a value that isn't a
 * finite number takes its default, or for the variation its neutral value,
 * and the variation stays within the sliders' ranges. A valid configuration
 * comes back with the same values, so the output doesn't change.
 */
export function sanitizeEmblemConfig(config: EmblemConfig): EmblemConfig {
  const out = { ...config };
  for (const key of plainNumbers) if (!finite(out[key])) out[key] = defaultLogoConfig.emblem[key];
  out.layerCount = clamp(out.layerCount, 0, MAX_LAYERS);
  out.squareSize = Math.max(out.squareSize, 0);
  for (const key of jitters) {
    const { min, max } = variationRanges[key];
    out[key] = finite(out[key]) ? clamp(out[key], min, max) : neutralVariation[key];
  }
  const { min, max } = variationRanges.seed;
  out.seed = finite(out.seed) ? clamp(Math.round(out.seed), min, max) : neutralVariation.seed;
  return out;
}
