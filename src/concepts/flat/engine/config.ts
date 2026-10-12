/**
 * The flat concept of the London TypeScript logo, expressed as parameters.
 *
 * Lengths are in emblem units where the central tile is 100 units wide;
 * typographic lengths (letter spacing, line spacing, indents) are in ems.
 */

import { defaultWordmarkConfig, palette, type WordmarkConfig } from '../../../shared';

export interface EmblemConfig {
  /** Number of rotating background squares. */
  layerCount: number;
  /** Angle between successive squares, in degrees. */
  rotationIncrement: number;
  /** Rotation of the first square, in degrees. */
  initialRotation: number;
  /** Side length of each background square (tile = 100). */
  squareSize: number;
  /**
   * Fraction by which the squares shrink from back to front (0 = all equal,
   * negative = front squares larger). Staggers the edges of the overlaps.
   */
  sizeTaper: number;
  /** Corner radius of each background square, in emblem units. */
  cornerRadius: number;
  /** Opacity of each background square. */
  opacity: number;
  /** Fills cycled through the layers, back to front. */
  colours: readonly string[];
  /**
   * How overlapping squares combine. `multiply` behaves like tinted glass:
   * every overlap gets deeper. `normal` is plain alpha compositing.
   */
  blendMode: BlendMode;
  /**
   * How much each square fades across its own surface (0 = uniform, 1 =
   * from full strength at one edge to clear at the other). Fading sheets
   * make the overlaps vary, so the layers seem to weave in and out.
   */
  fade: number;
  /** How far the fade direction turns from one square to the next, in degrees. */
  fadeTurn: number;
  /** Direction of the first square's fade (towards its clear edge), in degrees. */
  fadeAngle: number;
  /** Colour at each square's clear edge. */
  fadeColour: string;
  /** Largest random turn added to each sheet, in degrees (0 = the even steps above). */
  rotationJitter: number;
  /** Largest random change in each sheet's size, as a fraction of it. */
  sizeJitter: number;
  /** How far each sheet may stretch from a square: width × (1 + a), height × (1 − a). */
  aspectJitter: number;
  /** Largest random shift of each sheet's centre on each axis, in emblem units. */
  offsetJitter: number;
  /** Picks the random variation; the same seed always gives the same emblem. */
  seed: number;
}

export type BlendMode = 'normal' | 'multiply';

/** The sheet variation fields, which are random by seed. */
export type VariationConfig = Pick<
  EmblemConfig,
  'rotationJitter' | 'sizeJitter' | 'aspectJitter' | 'offsetJitter' | 'seed'
>;

/**
 * Variation switched off: the emblem is exactly what it was before these
 * fields existed. Configurations saved before then take these values.
 */
export const neutralVariation: VariationConfig = {
  rotationJitter: 0,
  sizeJitter: 0,
  aspectJitter: 0,
  offsetJitter: 0,
  seed: 1,
};

/** The range each variation field may take; the studio's sliders and the engine both use it. */
export const variationRanges: Record<keyof VariationConfig, { min: number; max: number }> = {
  rotationJitter: { min: 0, max: 20 },
  sizeJitter: { min: 0, max: 0.3 },
  aspectJitter: { min: 0, max: 0.3 },
  offsetJitter: { min: 0, max: 20 },
  seed: { min: 1, max: 999 },
};

/** Shading of each facet: >0 lightens (white overlay), <0 darkens (navy). */
export interface FacetShading {
  /** Shared facet vertex, as a fraction of the tile (0..1 from top-left). */
  apexX: number;
  apexY: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TileConfig {
  size: number;
  cornerRadius: number;
  colour: string;
  facets: FacetShading;
  text: string;
  textColour: string;
  /** Cap height of the lettering as a fraction of the tile size. */
  textScale: number;
  /** Gap between the lettering and the right edge, fraction of tile size. */
  textOffsetX: number;
  /** Gap between the baseline and the bottom edge, fraction of tile size. */
  textOffsetY: number;
  /** Extra space between letters, in ems. */
  letterSpacing: number;
}

interface LayoutConfig {
  /** Gap between the rosette and the wordmark, in tile widths. */
  horizontalGap: number;
  background: string;
}

export interface AnimationConfig {
  /** Global speed multiplier (0 = still). */
  speed: number;
  /** Mean angular velocity of a layer, in degrees per second. */
  baseVelocity: number;
  /** Spread of per-layer speeds around the mean (0 = all equal). */
  variation: number;
  /** Rotate neighbouring layers in opposite directions. */
  alternateDirection: boolean;
}

export interface LogoConfig {
  emblem: EmblemConfig;
  tile: TileConfig;
  wordmark: WordmarkConfig;
  layout: LayoutConfig;
  animation: AnimationConfig;
}

export const defaultLogoConfig: LogoConfig = {
  emblem: {
    layerCount: 6,
    rotationIncrement: 15,
    initialRotation: 7.5,
    squareSize: 158,
    sizeTaper: 0,
    cornerRadius: 1.6,
    opacity: 0.4,
    colours: [palette.sheetBlue, palette.sheetSky],
    blendMode: 'multiply',
    fade: 0,
    fadeTurn: 137.5,
    fadeAngle: 0,
    fadeColour: palette.sheetSky,
    rotationJitter: 0,
    sizeJitter: 0,
    aspectJitter: 0,
    offsetJitter: 0,
    seed: 1,
  },
  tile: {
    size: 100,
    cornerRadius: 0.8,
    colour: palette.tileBlue,
    facets: { apexX: 0.53, apexY: 0.38, top: 0.4, right: 0.04, bottom: -0.3, left: 0.08 },
    text: 'TS',
    textColour: palette.white,
    textScale: 0.35,
    textOffsetX: 0.07,
    textOffsetY: 0.06,
    letterSpacing: -0.01,
  },
  wordmark: defaultWordmarkConfig,
  layout: {
    horizontalGap: 0.14,
    background: palette.cream,
  },
  animation: {
    speed: 1,
    baseVelocity: 4,
    variation: 0.6,
    alternateDirection: false,
  },
};
