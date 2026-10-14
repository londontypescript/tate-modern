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

/** The emblem's other numeric fields, those that predate the variation. */
type PlainEmblemNumber =
  | 'layerCount'
  | 'rotationIncrement'
  | 'initialRotation'
  | 'squareSize'
  | 'sizeTaper'
  | 'cornerRadius'
  | 'opacity'
  | 'fade'
  | 'fadeTurn'
  | 'fadeAngle';

/**
 * The range each of those fields may take. The studio's sliders read them
 * and the engine clamps to them, so a saved configuration (which came from
 * the sliders) is never changed, while a hand-edited one can't overflow.
 */
export const emblemRanges: Record<PlainEmblemNumber, { min: number; max: number }> = {
  layerCount: { min: 0, max: 16 },
  rotationIncrement: { min: 0, max: 45 },
  initialRotation: { min: 0, max: 90 },
  squareSize: { min: 100, max: 200 },
  sizeTaper: { min: -0.4, max: 0.4 },
  cornerRadius: { min: 0, max: 12 },
  opacity: { min: 0.05, max: 1 },
  fade: { min: 0, max: 1 },
  fadeTurn: { min: 0, max: 180 },
  fadeAngle: { min: 0, max: 360 },
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

/**
 * A soft navy shadow under the tile, so it looks lifted off the sheets: the
 * tile's outline moved left and down, solid, with a soft edge all round.
 */
export interface HaloConfig {
  /** Opacity of the shadow's solid part, where its soft edge starts (0 = no halo). */
  strength: number;
  /** How far the soft edge spreads, in emblem units (0 = no halo). */
  reach: number;
  /** How far the shadow moves left and, equally, down, in emblem units. */
  offset: number;
}

/**
 * The halo switched off: the emblem is exactly what it was before it
 * existed. Configurations saved before then take these values.
 */
export const neutralHalo: HaloConfig = { strength: 0, reach: 14, offset: 5 };

/** The range each halo field may take; the studio's sliders and the engine both use it. */
export const haloRanges: Record<keyof HaloConfig, { min: number; max: number }> = {
  strength: { min: 0, max: 1 },
  reach: { min: 0, max: 40 },
  offset: { min: 0, max: 20 },
};

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
  /** The shadow under the tile; it belongs to the tile, so it never moves with the sheets. */
  halo: HaloConfig;
}

type Range = { min: number; max: number };

/**
 * The ranges the engine keeps the tile's, the wordmark's, the layout's and
 * the animation's numbers in. A field with a slider takes the slider's
 * range, and the slider reads it from here. A field without one gets a
 * range wide enough that no configuration made so far changes, with the
 * reason beside it: it is there so a hand-edited value can't overflow.
 */
export const tileRanges: Record<
  'size' | 'cornerRadius' | 'textScale' | 'textOffsetX' | 'textOffsetY' | 'letterSpacing',
  Range
> = {
  // No slider. The tile sets the units (100 wide); a tenth to ten times that keeps every framing finite.
  size: { min: 10, max: 1000 },
  // No slider. Up to a round tile at the usual size; the drawing limits it to half the size anyway.
  cornerRadius: { min: 0, max: 50 },
  textScale: { min: 0.15, max: 0.5 },
  textOffsetX: { min: 0, max: 0.3 },
  textOffsetY: { min: 0, max: 0.3 },
  letterSpacing: { min: -0.1, max: 0.1 },
};

/** No sliders. The apex is a point on the tile; a shade is an overlay's opacity either way, and past ±1 it draws as ±1. */
export const facetRanges: Record<keyof FacetShading, Range> = {
  apexX: { min: 0, max: 1 },
  apexY: { min: 0, max: 1 },
  top: { min: -1, max: 1 },
  right: { min: -1, max: 1 },
  bottom: { min: -1, max: 1 },
  left: { min: -1, max: 1 },
};

/** No slider. Each wordmark line's indent, within an em either way ("London" is indented 0.21 em today). */
export const lineIndentRange: Range = { min: -1, max: 1 };

export const wordmarkRanges: Record<'lineSpacing' | 'letterSpacing' | 'condense' | 'flourishScale', Range> = {
  lineSpacing: { min: 0.6, max: 1.2 },
  letterSpacing: { min: -0.08, max: 0.08 },
  condense: { min: 0.7, max: 1.1 },
  flourishScale: { min: 0, max: 2 },
};

export const layoutRanges: Record<'horizontalGap', Range> = {
  horizontalGap: { min: 0, max: 0.6 },
};

export const animationRanges: Record<'speed' | 'baseVelocity' | 'variation', Range> = {
  speed: { min: 0, max: 5 },
  // No slider. Up to a full turn a second at speed 1; the direction comes from "alternate", never from a sign.
  baseVelocity: { min: 0, max: 360 },
  variation: { min: 0, max: 1 },
};

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
    // The halo is off (neutral), so the approved logo is unchanged.
    halo: { strength: 0, reach: 14, offset: 5 },
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
