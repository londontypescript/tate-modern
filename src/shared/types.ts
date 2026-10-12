/**
 * Plain data shared by every concept: no React, no DOM.
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

/** A filled outline (glyph, facet, flourish) expressed as SVG path data. */
export interface PathShape {
  id: string;
  d: string;
  fill: string;
  opacity?: number;
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
