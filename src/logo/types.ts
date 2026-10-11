/**
 * Data model shared by the geometry engine, the animation module and the
 * renderers. Everything here is plain data: no React, no DOM.
 *
 * Coordinates are SVG user units with the y axis pointing down. Angles are
 * in degrees, positive clockwise (the SVG `rotate()` convention).
 */

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** One translucent background square, centred on the emblem origin. */
export interface SquareLayer {
  id: string;
  /** Paint order: 0 is drawn first (furthest back). */
  index: number;
  size: number;
  /** Static rotation about the emblem origin. */
  rotation: number;
  cornerRadius: number;
  fill: string;
  opacity: number;
  blendMode: 'normal' | 'multiply';
}

/** A filled outline (glyph, facet, flourish) expressed as SVG path data. */
export interface PathShape {
  id: string;
  d: string;
  fill: string;
  opacity?: number;
}

/** The stationary central tile, axis-aligned and centred on the origin. */
export interface TileModel {
  x: number;
  y: number;
  size: number;
  cornerRadius: number;
  fill: string;
  /** Translucent triangular overlays that give the tile its folded facets. */
  facets: PathShape[];
  /** Outlined "TS" glyphs. */
  lettering: PathShape[];
}

export interface EmblemModel {
  layers: SquareLayer[];
  tile: TileModel;
  /** Tight bounds of the static composition. */
  bounds: Box;
  /** Bounds that contain every layer at any rotation (for animation). */
  rotationSafeBounds: Box;
}

export interface WordmarkModel {
  shapes: PathShape[];
  /** Ink bounds, including flourishes. */
  bounds: Box;
  /** y of the top of the capital L (always 0 in wordmark space). */
  capTop: number;
  /** y of the second line's baseline. */
  lastBaseline: number;
  fontSize: number;
}

export interface LogoModel {
  emblem: EmblemModel;
  wordmark: WordmarkModel;
  /** Translation applied to the wordmark inside the horizontal logo. */
  wordmarkOffset: Point;
  bounds: Box;
  rotationSafeBounds: Box;
  background: string;
}
